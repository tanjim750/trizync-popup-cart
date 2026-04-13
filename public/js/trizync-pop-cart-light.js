/* global jQuery, TrizyncPopCart */
( function( $ ) {
	'use strict';

	if ( ! window.TrizyncPopCart ) {
		return;
	}

	var ajaxUrl = TrizyncPopCart.ajaxUrl;
	var popupTemplate = null;
	var lightCurrentPayload = null;

	function buildPayload( action, data, nonceKey ) {
		var payload = $.extend( {}, data || {}, {
			action: action,
			nonce: TrizyncPopCart[ nonceKey ] || TrizyncPopCart.nonce
		} );
		return payload;
	}

	function postAction( action, data, nonceKey ) {
		return $.ajax( {
			url: ajaxUrl,
			method: 'POST',
			dataType: 'json',
			data: buildPayload( action, data, nonceKey )
		} );
	}

	function normalizeContext( context ) {
		var ctx = context || {};
		return {
			product_id: ctx.product_id || ctx.productId || 0,
			variation_id: ctx.variation_id || ctx.variationId || 0,
			quantity: ctx.quantity || ctx.qty || 1,
			attributes: ctx.attributes || {}
		};
	}

	function normalizeCoupons( coupons ) {
		if ( ! coupons ) {
			return [];
		}
		if ( Array.isArray( coupons ) ) {
			return coupons;
		}
		if ( typeof coupons === 'string' ) {
			return coupons.split( ',' ).map( function( code ) {
				return code.trim();
			} ).filter( Boolean );
		}
		return [];
	}

	function normalizeAttributeKey( key ) {
		if ( ! key ) {
			return '';
		}
		if ( key.indexOf( 'attribute_' ) === 0 ) {
			return key;
		}
		return 'attribute_' + key;
	}

	function resolveProductContext( trigger ) {
		var context = {
			productId: 0,
			qty: 1,
			variationId: 0,
			attributes: {}
		};
		if ( ! trigger ) {
			return context;
		}
		var form = trigger.closest ? trigger.closest( 'form.cart' ) : null;
		if ( ! form && trigger.getAttribute ) {
			var formId = trigger.getAttribute( 'form' );
			if ( formId ) {
				form = document.getElementById( formId );
			}
		}
		if ( ! form ) {
			form = document.querySelector( 'form.cart' );
		}
		if ( ! form && trigger.closest ) {
			var productWrap = trigger.closest( '.product' ) || trigger.closest( '.type-product' );
			if ( productWrap ) {
				form = productWrap.querySelector( 'form.cart' );
			}
		}
		if ( form ) {
			var addInput = form.querySelector( '[name="add-to-cart"]' );
			if ( addInput ) {
				context.productId = parseInt( addInput.value, 10 ) || 0;
			}
			if ( ! context.productId ) {
				var productInput = form.querySelector( '[name="product_id"]' );
				if ( productInput ) {
					context.productId = parseInt( productInput.value, 10 ) || 0;
				}
			}
			var variationInput = form.querySelector( '[name="variation_id"]' );
			if ( variationInput ) {
				context.variationId = parseInt( variationInput.value, 10 ) || 0;
			}
			var qtyInput = form.querySelector( 'input.qty' );
			if ( qtyInput ) {
				context.qty = parseInt( qtyInput.value, 10 ) || 1;
			}
			var attrInputs = form.querySelectorAll( '[name^="attribute_"]' );
			attrInputs.forEach( function( input ) {
				if ( input.value ) {
					context.attributes[ normalizeAttributeKey( input.name ) ] = input.value;
				}
			} );
		}

		if ( trigger.getAttribute ) {
			var dataId = trigger.getAttribute( 'data-product_id' ) || trigger.getAttribute( 'data-product-id' );
			if ( dataId ) {
				context.productId = parseInt( dataId, 10 ) || context.productId;
			}
			if ( ! context.productId ) {
				var zyncopsId = trigger.getAttribute( 'data-zyncops-post-data-id' );
				if ( zyncopsId ) {
					context.productId = parseInt( zyncopsId, 10 ) || context.productId;
				}
			}
			if ( ! context.productId ) {
				var altId = trigger.getAttribute( 'data-id' );
				if ( altId ) {
					context.productId = parseInt( altId, 10 ) || 0;
				}
			}
			if ( ! context.productId ) {
				var valueId = trigger.getAttribute( 'value' );
				if ( valueId && /^\d+$/.test( valueId ) ) {
					context.productId = parseInt( valueId, 10 ) || 0;
				}
			}
			if ( ! context.productId ) {
				var href = trigger.getAttribute( 'href' );
				if ( href && href.indexOf( 'add-to-cart=' ) !== -1 ) {
					var match = href.match( /add-to-cart=(\d+)/ );
					if ( match && match[1] ) {
						context.productId = parseInt( match[1], 10 ) || 0;
					}
				}
			}
			var dataQty = trigger.getAttribute( 'data-quantity' );
			if ( dataQty ) {
				context.qty = parseInt( dataQty, 10 ) || context.qty;
			}
			var dataVariation = trigger.getAttribute( 'data-variation-id' ) || trigger.getAttribute( 'data-variation_id' );
			if ( dataVariation ) {
				context.variationId = parseInt( dataVariation, 10 ) || context.variationId;
			}
		}

		if ( ! context.productId && trigger.closest ) {
			var parent = trigger.closest( '[data-product_id],[data-product-id],[data-zyncops-post-data-id]' );
			if ( parent ) {
				var parentId = parent.getAttribute( 'data-product_id' ) || parent.getAttribute( 'data-product-id' ) || parent.getAttribute( 'data-zyncops-post-data-id' );
				if ( parentId ) {
					context.productId = parseInt( parentId, 10 ) || 0;
				}
			}
		}
		if ( ! context.productId && trigger.closest ) {
			var altParent = trigger.closest( '[data-id]' );
			if ( altParent ) {
				var altParentId = altParent.getAttribute( 'data-id' );
				if ( altParentId ) {
					context.productId = parseInt( altParentId, 10 ) || 0;
				}
			}
		}
		if ( ! context.productId && trigger.closest ) {
			var productWrap = trigger.closest( '.product, .type-product, .wc-block-grid__product' );
			if ( productWrap ) {
				if ( productWrap.getAttribute ) {
					var wrapId = productWrap.getAttribute( 'data-product_id' ) || productWrap.getAttribute( 'data-product-id' ) || productWrap.getAttribute( 'data-zyncops-post-data-id' );
					if ( wrapId ) {
						context.productId = parseInt( wrapId, 10 ) || 0;
					}
				}
				if ( ! context.productId ) {
					var wrapAlt = productWrap.getAttribute( 'data-id' );
					if ( wrapAlt ) {
						context.productId = parseInt( wrapAlt, 10 ) || 0;
					}
				}
				if ( ! context.productId && productWrap.className ) {
					var match = productWrap.className.match( /post-(\d+)/ );
					if ( match && match[1] ) {
						context.productId = parseInt( match[1], 10 ) || 0;
					}
				}
				if ( ! context.productId ) {
					var addButton = productWrap.querySelector( '[data-product_id],[data-product-id],[data-zyncops-post-data-id]' );
					if ( addButton ) {
						var addId = addButton.getAttribute( 'data-product_id' ) || addButton.getAttribute( 'data-product-id' ) || addButton.getAttribute( 'data-zyncops-post-data-id' );
						if ( addId ) {
							context.productId = parseInt( addId, 10 ) || 0;
						}
					}
				}
			}
		}
		if ( ! context.productId ) {
			var globalAdd = document.querySelector( 'input[name="add-to-cart"]' );
			if ( globalAdd && globalAdd.value ) {
				context.productId = parseInt( globalAdd.value, 10 ) || 0;
			}
		}
		if ( ! context.productId ) {
			var globalProduct = document.querySelector( 'input[name="product_id"]' );
			if ( globalProduct && globalProduct.value ) {
				context.productId = parseInt( globalProduct.value, 10 ) || 0;
			}
		}
		return context;
	}

	function getProductInfo( context, coupons ) {
		var ctx = normalizeContext( context );
		return postAction(
			'trizync_pop_cart_get_product_preview_light',
			{
				product_id: ctx.product_id,
				variation_id: ctx.variation_id,
				quantity: ctx.quantity,
				attributes: JSON.stringify( ctx.attributes || {} ),
				coupons: JSON.stringify( normalizeCoupons( coupons ) )
			},
			'nonce_preview'
		);
	}

	function getCart( ping ) {
		return postAction(
			'trizync_pop_cart_get_cart',
			{
				ping: ping ? 1 : 0
			},
			'nonce_preview'
		);
	}

	function getShippingMethods( context ) {
		var ctx = normalizeContext( context );
		return postAction(
			'trizync_pop_cart_get_shipping_methods_light',
			{
				product_id: ctx.product_id,
				variation_id: ctx.variation_id,
				quantity: ctx.quantity
			},
			'nonce_preview'
		);
	}

	function getAppliedShippingMethod( context ) {
		return getShippingMethods( context ).then( function( response ) {
			if ( ! response || ! response.success ) {
				return null;
			}
			var shipping = response.data && response.data.shipping ? response.data.shipping : {};
			return shipping.chosen || null;
		} );
	}

	function getCustomerInfo() {
		return postAction( 'trizync_pop_cart_get_customer', {}, 'nonce_preview' );
	}

	function getEnabledFields() {
		return postAction( 'trizync_pop_cart_get_enabled_fields', {}, 'nonce_preview' );
	}

	function getSubtotal( context, coupons ) {
		var ctx = normalizeContext( context );
		return postAction(
			'trizync_pop_cart_calc_subtotal_light',
			{
				product_id: ctx.product_id,
				variation_id: ctx.variation_id,
				quantity: ctx.quantity,
				attributes: JSON.stringify( ctx.attributes || {} ),
				coupons: JSON.stringify( normalizeCoupons( coupons ) )
			},
			'nonce_preview'
		);
	}

	function previewCoupon( context, coupons ) {
		var ctx = normalizeContext( context );
		return postAction(
			'trizync_pop_cart_preview_coupon_light',
			{
				product_id: ctx.product_id,
				variation_id: ctx.variation_id,
				quantity: ctx.quantity,
				attributes: JSON.stringify( ctx.attributes || {} ),
				coupons: JSON.stringify( normalizeCoupons( coupons ) )
			},
			'nonce_preview'
		);
	}

	function updateCustomerInfo( payload ) {
		return postAction(
			'trizync_pop_cart_update_customer',
			payload || {},
			'nonce_checkout'
		);
	}

	function updateCartItem( key, quantity ) {
		return postAction(
			'trizync_pop_cart_update_cart_item',
			{
				key: key,
				quantity: quantity
			},
			'nonce_checkout'
		);
	}

	function removeCartItem( key ) {
		return postAction(
			'trizync_pop_cart_remove_cart_item',
			{
				key: key
			},
			'nonce_checkout'
		);
	}

	function restoreCart() {
		return postAction( 'trizync_pop_cart_restore_cart', {}, 'nonce_checkout' );
	}

	function prepareProductCheckout( context ) {
		var ctx = normalizeContext( context );
		return postAction(
			'trizync_pop_cart_prepare_product_checkout',
			{
				product_id: ctx.product_id,
				variation_id: ctx.variation_id,
				quantity: ctx.quantity,
				attributes: JSON.stringify( ctx.attributes || {} )
			},
			'nonce_checkout'
		);
	}

	function warmSession() {
		return postAction( 'trizync_pop_cart_light_warm', {}, 'nonce_preview' );
	}

	function getCheckoutForm() {
		return postAction( 'trizync_pop_cart_get_checkout_form', {}, 'nonce_preview' );
	}

	function getNotices() {
		return postAction( 'trizync_pop_cart_get_notices', {}, 'nonce_preview' );
	}

	function prepareCheckout( context, coupons ) {
		var ctx = normalizeContext( context );
		return postAction(
			'trizync_pop_cart_light_prepare_checkout',
			{
				product_id: ctx.product_id,
				variation_id: ctx.variation_id,
				quantity: ctx.quantity,
				attributes: JSON.stringify( ctx.attributes || {} ),
				coupons: JSON.stringify( normalizeCoupons( coupons ) )
			},
			'nonce_checkout'
		);
	}

	function applyCoupon( code, context ) {
		var ctx = normalizeContext( context );
		return postAction(
			'trizync_pop_cart_apply_coupon',
			{
				code: code,
				product_id: ctx.product_id,
				variation_id: ctx.variation_id,
				quantity: ctx.quantity,
				attributes: JSON.stringify( ctx.attributes || {} )
			},
			'nonce_checkout'
		);
	}

	function removeCoupon( code, context ) {
		var ctx = normalizeContext( context );
		return postAction(
			'trizync_pop_cart_remove_coupon',
			{
				code: code,
				product_id: ctx.product_id,
				variation_id: ctx.variation_id,
				quantity: ctx.quantity,
				attributes: JSON.stringify( ctx.attributes || {} )
			},
			'nonce_checkout'
		);
	}

	function setShippingMethod( methodId, context ) {
		var ctx = normalizeContext( context );
		return postAction(
			'trizync_pop_cart_set_shipping_method',
			{
				shipping_method: methodId,
				product_id: ctx.product_id,
				variation_id: ctx.variation_id,
				quantity: ctx.quantity
			},
			'nonce_checkout'
		);
	}

	function setPaymentMethod( methodId ) {
		return postAction(
			'trizync_pop_cart_set_payment_method',
			{
				payment_method: methodId
			},
			'nonce_checkout'
		);
	}

	function updateSubtotal( context, coupons ) {
		return getSubtotal( context, coupons );
	}

	// UI logic starts here - keep UI handlers below this line.

	function initClickListeners( handler ) {
		$( document ).on( 'click', '[data-trizync-pop-cart-open]', function( event ) {
			if ( typeof handler === 'function' ) {
				handler( event );
			}
		} );
	}

	function getPopup() {
		return document.getElementById( 'trizync-pop-cart' );
	}

	function buildPopup() {
		var popup = getPopup();
		if ( popup ) {
			if ( popupTemplate === null ) {
				popupTemplate = popup.innerHTML;
			}
			return popup;
		}
		popup = document.createElement( 'div' );
		popup.id = 'trizync-pop-cart';
		popup.className = 'trizync-pop-cart';
		popup.setAttribute( 'aria-hidden', 'true' );
		document.body.appendChild( popup );
		if ( popupTemplate === null ) {
			popupTemplate = popup.innerHTML;
		}
		return popup;
	}

	function openPopup() {
		var popup = buildPopup();
		popup.classList.add( 'is-open' );
		popup.setAttribute( 'aria-hidden', 'false' );
		return popup;
	}

	function resetPopup() {
		var popup = getPopup();
		if ( ! popup ) {
			return;
		}
		popup.classList.remove( 'is-open' );
		popup.setAttribute( 'aria-hidden', 'true' );
		popup.innerHTML = popupTemplate !== null ? popupTemplate : '';
	}

	function closePopup() {
		var popup = getPopup();
		if ( ! popup ) {
			return;
		}
		popup.classList.remove( 'is-open' );
		popup.setAttribute( 'aria-hidden', 'true' );
	}

	function updateProductInfo( payload ) {
		var popup = getPopup();
		if ( ! popup ) {
			return;
		}
		var list = popup.querySelector( '[data-trizync-pop-cart-list]' );
		var empty = popup.querySelector( '[data-trizync-pop-cart-empty]' );
		var cartLabel = popup.querySelector( '[data-trizync-pop-cart-cart-label]' );
		if ( ! list || ! empty ) {
			return;
		}
		list.innerHTML = '';
		if ( cartLabel ) {
			cartLabel.hidden = false;
			cartLabel.textContent = 'Selected item';
		}

		if ( ! payload || ! payload.items || ! payload.items.length ) {
			return;
		}
		lightCurrentPayload = payload || null;
		renderItemList( payload, list );

		if ( payload.product && payload.product.variations && payload.product.variations.length ) {
			renderVariationList( payload.product );
		}
	}

	function renderItemList( payload, list ) {
		payload.items.forEach( function( item ) {
			var li = document.createElement( 'li' );
			li.className = 'trizync-pop-cart__cart-item';

			var left = document.createElement( 'div' );
			left.className = 'trizync-pop-cart__cart-info';

			var imageUrl = item.image || ( payload.product ? payload.product.image : '' );
			if ( imageUrl ) {
				var thumb = document.createElement( 'img' );
				thumb.className = 'trizync-pop-cart__cart-thumb';
				thumb.src = imageUrl;
				thumb.alt = item.name || '';
				left.appendChild( thumb );
			}

			var name = document.createElement( 'span' );
			name.className = 'trizync-pop-cart__cart-name';
			name.textContent = item.name || '';
			left.appendChild( name );

			var qtyWrap = document.createElement( 'div' );
			qtyWrap.className = 'trizync-pop-cart__cart-qty';

			var qtyControls = document.createElement( 'div' );
			qtyControls.className = 'trizync-pop-cart__qty-controls';

			var minus = document.createElement( 'button' );
			minus.type = 'button';
			minus.className = 'trizync-pop-cart__qty-btn';
			minus.textContent = '−';
			minus.setAttribute( 'data-qty-action', 'decrease' );
			minus.setAttribute( 'data-qty-scope', 'product' );

			var qtyValue = document.createElement( 'span' );
			qtyValue.className = 'trizync-pop-cart__qty-value';
			qtyValue.textContent = item.quantity || 1;
			qtyValue.setAttribute( 'data-qty-scope', 'product' );
			qtyValue.setAttribute( 'data-qty-value', '' );

			var plus = document.createElement( 'button' );
			plus.type = 'button';
			plus.className = 'trizync-pop-cart__qty-btn';
			plus.textContent = '+';
			plus.setAttribute( 'data-qty-action', 'increase' );
			plus.setAttribute( 'data-qty-scope', 'product' );

			qtyControls.appendChild( minus );
			qtyControls.appendChild( qtyValue );
			qtyControls.appendChild( plus );
			qtyWrap.appendChild( qtyControls );
			left.appendChild( qtyWrap );

			var right = document.createElement( 'div' );
			right.className = 'trizync-pop-cart__cart-meta';
			var price = document.createElement( 'span' );
			price.className = 'trizync-pop-cart__cart-price';
			price.innerHTML = item.total || '';
			right.appendChild( price );

			li.appendChild( left );
			li.appendChild( right );
			list.appendChild( li );
		} );
	}

	function renderVariationList( product ) {
		var popup = getPopup();
		if ( ! popup ) {
			return;
		}
		var wrap = popup.querySelector( '[data-trizync-pop-cart-variations]' );
		var list = popup.querySelector( '[data-trizync-pop-cart-variation-list]' );
		if ( ! wrap || ! list ) {
			return;
		}
		list.innerHTML = '';
		var selectedId = product.selected_variation_id || 0;

		product.variations.forEach( function( variation ) {
			var li = document.createElement( 'li' );
			li.className = 'trizync-pop-cart__cart-item trizync-pop-cart__variation-item';
			li.setAttribute( 'data-variation-id', variation.id );
			if ( selectedId && variation.id === selectedId ) {
				li.classList.add( 'is-selected' );
			}

			var left = document.createElement( 'div' );
			left.className = 'trizync-pop-cart__cart-info';

			var radio = document.createElement( 'input' );
			radio.type = 'radio';
			radio.name = 'trizync_pop_cart_variation';
			radio.value = variation.id;
			radio.className = 'trizync-pop-cart__variation-radio';
			if ( selectedId && variation.id === selectedId ) {
				radio.checked = true;
			}
			left.appendChild( radio );

			var imageUrl = variation.image || product.image || '';
			if ( imageUrl ) {
				var thumb = document.createElement( 'img' );
				thumb.className = 'trizync-pop-cart__cart-thumb';
				thumb.src = imageUrl;
				thumb.alt = product.name || '';
				left.appendChild( thumb );
			}

			var name = document.createElement( 'span' );
			name.className = 'trizync-pop-cart__cart-name';
			name.textContent = product.name || '';
			left.appendChild( name );

			var metaText = document.createElement( 'span' );
			metaText.className = 'trizync-pop-cart__cart-meta-text';
			if ( variation.attributes ) {
				var parts = [];
				Object.keys( variation.attributes ).forEach( function( key ) {
					parts.push( variation.attributes[ key ] );
				} );
				metaText.textContent = parts.join( ' / ' );
			}
			left.appendChild( metaText );

			var right = document.createElement( 'div' );
			right.className = 'trizync-pop-cart__cart-meta';
			var price = document.createElement( 'span' );
			price.className = 'trizync-pop-cart__cart-price';
			if ( variation.price_html ) {
				price.innerHTML = variation.price_html;
			} else if ( typeof variation.price_raw !== 'undefined' ) {
				price.innerHTML = variation.price_raw;
			} else {
				price.innerHTML = '';
			}
			right.appendChild( price );

			li.appendChild( left );
			li.appendChild( right );
			list.appendChild( li );
		} );

		wrap.hidden = false;
	}

	function renderVariations( product ) {
		var popup = getPopup();
		if ( ! popup ) {
			return;
		}
		var wrap = popup.querySelector( '[data-trizync-pop-cart-variations]' );
		var list = popup.querySelector( '[data-trizync-pop-cart-variation-list]' );
		var error = popup.querySelector( '[data-trizync-pop-cart-variation-error]' );
		if ( ! wrap || ! list ) {
			return;
		}
		list.innerHTML = '';
		if ( ! product || ! product.attributes || ! product.attributes.length ) {
			if ( error ) {
				error.hidden = true;
			}
			return;
		}

		product.attributes.forEach( function( attr ) {
			var field = document.createElement( 'div' );
			field.className = 'trizync-pop-cart__variation-field';

			var label = document.createElement( 'label' );
			label.className = 'trizync-pop-cart__variation-label';
			label.textContent = attr.label || attr.name || '';
			field.appendChild( label );

			var select = document.createElement( 'select' );
			select.className = 'trizync-pop-cart__variation-select';
			select.setAttribute( 'data-trizync-pop-cart-variation-select', '' );
			select.setAttribute( 'data-attribute', attr.key || '' );

			var placeholder = document.createElement( 'option' );
			placeholder.value = '';
			placeholder.textContent = 'Choose';
			select.appendChild( placeholder );

			if ( Array.isArray( attr.options ) ) {
				attr.options.forEach( function( option ) {
					var opt = document.createElement( 'option' );
					opt.value = option;
					opt.textContent = option;
					select.appendChild( opt );
				} );
			}

			var selected = '';
			if ( product.selected_attributes && attr.key && product.selected_attributes[ attr.key ] ) {
				selected = product.selected_attributes[ attr.key ];
			} else if ( product.default_attributes && attr.key && product.default_attributes[ attr.key ] ) {
				selected = product.default_attributes[ attr.key ];
			}
			if ( selected ) {
				select.value = selected;
			}

			field.appendChild( select );
			list.appendChild( field );
		} );

		if ( error ) {
			error.hidden = true;
		}
	}

	function collectVariationAttributes() {
		var popup = getPopup();
		if ( ! popup ) {
			return {};
		}
		var attrs = {};
		var selects = popup.querySelectorAll( '[data-trizync-pop-cart-variation-select]' );
		selects.forEach( function( select ) {
			var key = select.getAttribute( 'data-attribute' );
			if ( key && select.value ) {
				attrs[ key ] = select.value;
			}
		} );
		return attrs;
	}

	function findMatchingVariation( product, attrs ) {
		if ( ! product || ! product.variations || ! product.variations.length ) {
			return null;
		}
		return product.variations.find( function( variation ) {
			var variationAttrs = variation.attributes || {};
			return Object.keys( attrs ).every( function( key ) {
				return variationAttrs[ key ] === attrs[ key ];
			} );
		} ) || null;
	}

	function updatePreviewFromVariation( variation, product ) {
		var popup = getPopup();
		if ( ! popup ) {
			return;
		}
		var img = popup.querySelector( '.trizync-pop-cart__cart-thumb' );
		if ( img ) {
			var imgSrc = variation && variation.image ? variation.image : ( product ? product.image : '' );
			if ( imgSrc ) {
				img.src = imgSrc;
			}
		}
		var price = popup.querySelector( '.trizync-pop-cart__cart-price' );
		if ( price ) {
			if ( variation && variation.price_html ) {
				price.innerHTML = variation.price_html;
			}
		}
	}

	function toggleSection( selector, shouldShow ) {
		var popup = getPopup();
		if ( ! popup ) {
			return;
		}
		var el = popup.querySelector( selector );
		if ( ! el ) {
			return;
		}
		el.hidden = ! shouldShow;
	}

	function showSection( selector ) {
		toggleSection( selector, true );
	}

	function hideSection( selector ) {
		toggleSection( selector, false );
	}

	function showEmptyCart() {
		showSection( '[data-trizync-pop-cart-empty]' );
	}

	function hideEmptyCart() {
		hideSection( '[data-trizync-pop-cart-empty]' );
	}

	function showFieldsSection() {
		showSection( '[data-trizync-pop-cart-checkout]' );
	}

	function hideFieldsSection() {
		hideSection( '[data-trizync-pop-cart-checkout]' );
	}

	function enableCta() {
		var popup = getPopup();
		if ( ! popup ) {
			return;
		}
		var cta = popup.querySelector( '.trizync-pop-cart__cta' );
		if ( cta ) {
			cta.disabled = false;
			cta.classList.remove( 'is-disabled' );
		}
	}

	function disableCta() {
		var popup = getPopup();
		if ( ! popup ) {
			return;
		}
		var cta = popup.querySelector( '.trizync-pop-cart__cta' );
		if ( cta ) {
			cta.disabled = true;
			cta.classList.add( 'is-disabled' );
		}
	}

	function showCartSection() {
		showSection( '[data-trizync-pop-cart-cart]' );
	}

	function hideCartSection() {
		hideSection( '[data-trizync-pop-cart-cart]' );
	}

	function showVariationsSection() {
		showSection( '[data-trizync-pop-cart-variations]' );
	}

	function hideVariationsSection() {
		hideSection( '[data-trizync-pop-cart-variations]' );
	}

	function showCouponSection() {
		showSection( '[data-trizync-pop-cart-coupon]' );
	}

	function hideCouponSection() {
		hideSection( '[data-trizync-pop-cart-coupon]' );
	}

	function showShippingSection() {
		showSection( '[data-trizync-pop-cart-shipping]' );
	}

	function hideShippingSection() {
		hideSection( '[data-trizync-pop-cart-shipping]' );
	}

	function showTotalsSection() {
		showSection( '[data-trizync-pop-cart-totals]' );
	}

	function hideTotalsSection() {
		hideSection( '[data-trizync-pop-cart-totals]' );
	}

	function showPaymentSection() {
		showSection( '[data-trizync-pop-cart-payment]' );
	}

	function hidePaymentSection() {
		hideSection( '[data-trizync-pop-cart-payment]' );
	}

	function updateShippingMethods( shipping ) {
		var popup = getPopup();
		if ( ! popup ) {
			return;
		}
		var wrap = popup.querySelector( '[data-trizync-pop-cart-shipping]' );
		var list = popup.querySelector( '[data-trizync-pop-cart-shipping-list]' );
		var empty = popup.querySelector( '[data-trizync-pop-cart-shipping-empty]' );
		var hiddenInput = popup.querySelector( '[data-trizync-pop-cart-shipping-input]' );

		if ( ! wrap || ! list || ! empty ) {
			return;
		}

		list.innerHTML = '';
		if ( ! shipping || ! shipping.methods || ! shipping.methods.length ) {
			empty.hidden = false;
			wrap.hidden = true;
			return;
		}

		empty.hidden = true;
		wrap.hidden = false;

		shipping.methods.forEach( function( method ) {
			var option = document.createElement( 'button' );
			option.type = 'button';
			option.className = 'trizync-pop-cart__shipping-option';
			option.setAttribute( 'data-shipping-method', method.id );
			if ( method.selected ) {
				option.classList.add( 'is-active' );
			}

			var meta = document.createElement( 'div' );
			meta.className = 'trizync-pop-cart__shipping-meta';
			var label = document.createElement( 'span' );
			label.className = 'trizync-pop-cart__shipping-label';
			label.textContent = method.label || '';
			meta.appendChild( label );

			var price = document.createElement( 'span' );
			price.className = 'trizync-pop-cart__shipping-price';
			price.innerHTML = method.price || '';
			meta.appendChild( price );

			option.appendChild( meta );
			list.appendChild( option );
		} );

		if ( hiddenInput ) {
			hiddenInput.value = shipping.chosen || '';
		}
	}

	function updatePaymentMethods( payment ) {
		var popup = getPopup();
		if ( ! popup ) {
			return;
		}
		var wrap = popup.querySelector( '[data-trizync-pop-cart-payment]' );
		var list = popup.querySelector( '[data-trizync-pop-cart-payment-list]' );
		var empty = popup.querySelector( '[data-trizync-pop-cart-payment-empty]' );
		var hiddenInput = popup.querySelector( '[data-trizync-pop-cart-payment-input]' );

		if ( ! wrap || ! list || ! empty ) {
			return;
		}

		list.innerHTML = '';
		if ( ! payment || ! payment.gateways || ! payment.gateways.length ) {
			empty.hidden = false;
			wrap.hidden = true;
			return;
		}

		empty.hidden = true;
		wrap.hidden = false;

		payment.gateways.forEach( function( gateway ) {
			var option = document.createElement( 'button' );
			option.type = 'button';
			option.className = 'trizync-pop-cart__payment-option';
			option.setAttribute( 'data-payment-method', gateway.id );
			if ( gateway.selected ) {
				option.classList.add( 'is-active' );
			}

			var meta = document.createElement( 'div' );
			meta.className = 'trizync-pop-cart__payment-meta';
			var title = document.createElement( 'span' );
			title.className = 'trizync-pop-cart__payment-title';
			title.textContent = gateway.title || '';
			meta.appendChild( title );

			if ( gateway.description ) {
				var desc = document.createElement( 'span' );
				desc.className = 'trizync-pop-cart__payment-desc';
				desc.innerHTML = gateway.description;
				meta.appendChild( desc );
			}

			option.appendChild( meta );
			list.appendChild( option );
		} );

		if ( hiddenInput ) {
			hiddenInput.value = payment.chosen || '';
		}
	}

	function updateSubtotals( payload ) {
		var popup = getPopup();
		console.log( 'Attempting to update subtotals.' );
		if ( ! popup ) {
			console.log( 'Popup not found, cannot update subtotals.' );
			return;
		}
		var totals = popup.querySelector( '[data-trizync-pop-cart-totals]' );
		var subtotal = popup.querySelector( '[data-trizync-pop-cart-subtotal]' );
		var total = popup.querySelector( '[data-trizync-pop-cart-total]' );
		var shippingRow = popup.querySelector( '[data-trizync-pop-cart-shipping-row]' );
		var shippingTotal = popup.querySelector( '[data-trizync-pop-cart-shipping-total]' );

		console.log( 'Updating subtotals with payload:', payload );
		console.log( 'Found elements:', { totals, subtotal, total, shippingRow, shippingTotal } );
		if ( ! totals || ! subtotal || ! total || ! shippingRow || ! shippingTotal ) {
			return;
		}

		if ( payload ) {
			subtotal.innerHTML = payload.subtotal || '';
			total.innerHTML = payload.total || '';
			if ( payload.shipping && payload.shipping.total ) {
				shippingTotal.innerHTML = payload.shipping.total;
			} else {
				shippingTotal.innerHTML = '';
			}
		}
	}

	function setOverlayLoading( isLoading ) {
		var popup = getPopup();
		if ( ! popup ) {
			return;
		}
		var overlay = popup.querySelector( '[data-trizync-pop-cart-overlay]' );
		if ( ! overlay ) {
			return;
		}
		if ( isLoading ) {
			overlay.removeAttribute( 'hidden' );
		} else {
			overlay.setAttribute( 'hidden', 'hidden' );
		}
	}

	function renderErrorMessage( message ) {
		var popup = getPopup();
		if ( ! popup ) {
			return;
		}
		var notices = popup.querySelector( '.trizync-pop-cart__notices' );
		if ( ! notices ) {
			return;
		}
		var html = '<ul class="trizync-pop-cart__notice-list"><li class="trizync-pop-cart__notice-item">' + ( message || 'Something went wrong.' ) + '</li></ul>';
		notices.innerHTML = html;
	}

	function getCheckoutContainer() {
		var popup = getPopup();
		if ( ! popup ) {
			return null;
		}
		return popup.querySelector( '[data-trizync-pop-cart-checkout]' );
	}

	function renderFieldsFromJson( fields ) {
		var container = getCheckoutContainer();
		if ( ! container ) {
			return;
		}
		container.innerHTML = '';
		if ( ! fields || ! fields.length ) {
			return;
		}

		var form = document.createElement( 'form' );
		form.className = 'trizync-pop-cart__form';
		form.setAttribute( 'data-trizync-pop-cart-form', '' );
		form.setAttribute( 'novalidate', 'novalidate' );

		var fieldsWrap = document.createElement( 'div' );
		fieldsWrap.className = 'trizync-pop-cart__fields';

		fields.forEach( function( field ) {
			var wrap = document.createElement( 'div' );
			wrap.className = 'trizync-pop-cart__field';
			wrap.setAttribute( 'data-field-key', field.key );

			var label = document.createElement( 'label' );
			label.className = 'trizync-pop-cart__label';
			label.setAttribute( 'for', field.key );
			label.textContent = field.label || field.key;
			if ( field.required ) {
				var req = document.createElement( 'span' );
				req.className = 'trizync-pop-cart__required';
				req.textContent = '*';
				label.appendChild( req );
			}
			wrap.appendChild( label );

			var input;
			if ( field.type === 'select' ) {
				input = document.createElement( 'select' );
				if ( Array.isArray( field.options ) ) {
					field.options.forEach( function( option ) {
						var opt = document.createElement( 'option' );
						opt.value = option.value;
						opt.textContent = option.label || option.value;
						input.appendChild( opt );
					} );
				}
			} else if ( field.type === 'textarea' ) {
				input = document.createElement( 'textarea' );
			} else {
				input = document.createElement( 'input' );
				input.type = field.type || 'text';
			}

			input.id = field.key;
			input.name = field.key;
			input.className = 'trizync-pop-cart__input';
			if ( field.placeholder ) {
				input.setAttribute( 'placeholder', field.placeholder );
			}
			if ( field.required ) {
				input.setAttribute( 'data-required', '1' );
				input.setAttribute( 'aria-required', 'true' );
				input.setAttribute( 'required', 'required' );
			}
			if ( field.default && ( field.type !== 'select' || ! input.value ) ) {
				input.value = field.default;
			}

			wrap.appendChild( input );
			fieldsWrap.appendChild( wrap );
		} );

		form.appendChild( fieldsWrap );
		container.appendChild( form );
	}

	function autofillCustomerInfo( customer ) {
		var container = getCheckoutContainer();
		if ( ! container || ! customer ) {
			return;
		}
		var billing = customer.billing || {};
		var shipping = customer.shipping || {};

		Array.prototype.forEach.call( container.querySelectorAll( '.trizync-pop-cart__field-input' ), function( input ) {
			var key = input.name || '';
			var value = '';
			if ( key.indexOf( 'billing_' ) === 0 ) {
				var billingKey = key.replace( 'billing_', '' );
				value = billing[ billingKey ] || '';
			} else if ( key.indexOf( 'shipping_' ) === 0 ) {
				var shippingKey = key.replace( 'shipping_', '' );
				value = shipping[ shippingKey ] || '';
			}
			if ( value ) {
				input.value = value;
			}
		} );
	}

	function validateRequiredFields() {
		var container = getCheckoutContainer();
		if ( ! container ) {
			return { ok: true, errors: [] };
		}
		var errors = [];
		Array.prototype.forEach.call( container.querySelectorAll( '.trizync-pop-cart__field-input' ), function( input ) {
			if ( input.getAttribute( 'data-required' ) === '1' ) {
				var value = ( input.value || '' ).trim();
				if ( ! value ) {
					errors.push( {
						key: input.name || '',
						message: 'Required'
					} );
				}
			}
		} );
		return {
			ok: errors.length === 0,
			errors: errors
		};
	}

	function collectCustomerPayload() {
		var container = getCheckoutContainer();
		if ( ! container ) {
			return {};
		}
		var payload = {};
		Array.prototype.forEach.call( container.querySelectorAll( '.trizync-pop-cart__field-input' ), function( input ) {
			if ( input.name ) {
				payload[ input.name ] = input.value || '';
			}
		} );
		return payload;
	}

	function wireLightCheckoutFields() {
		return $.when( getEnabledFields(), getCustomerInfo() ).then( function( fieldsResponse, customerResponse ) {
			var fieldsPayload = fieldsResponse && fieldsResponse[0] ? fieldsResponse[0] : fieldsResponse;
			var customerPayload = customerResponse && customerResponse[0] ? customerResponse[0] : customerResponse;
			if ( fieldsPayload && fieldsPayload.success ) {
				renderFieldsFromJson( fieldsPayload.data ? fieldsPayload.data.fields : [] );
			}
			if ( customerPayload && customerPayload.success ) {
				autofillCustomerInfo( customerPayload.data );
			}
		} );
	}

	function wireFieldSync() {
		var popup = getPopup();
		if ( ! popup ) {
			return;
		}
		$( popup ).on( 'input change', '.trizync-pop-cart__field-input', function() {
			var payload = collectCustomerPayload();
			updateCustomerInfo( payload );
		} );
	}

	function wireCtaSubmit() {
		$( document ).on( 'click', '.trizync-pop-cart__cta', function( event ) {
			var validation = validateRequiredFields();
			if ( ! validation.ok ) {
				event.preventDefault();
				return;
			}
			var payload = collectCustomerPayload();
			updateCustomerInfo( payload ).always( function() {
				prepareCheckout();
			} );
		} );
	}

	window.TrizyncPopCartLight = {
    getCart: getCart,
    getProductInfo: getProductInfo,
    getShippingMethods: getShippingMethods,
    getAppliedShippingMethod: getAppliedShippingMethod,
    getCustomerInfo: getCustomerInfo,
    getEnabledFields: getEnabledFields,
    getSubtotal: getSubtotal,
    previewCoupon: previewCoupon,
    updateCustomerInfo: updateCustomerInfo,
    updateSubtotal: updateSubtotal,
    warmSession: warmSession,
    getCheckoutForm: getCheckoutForm,
    getNotices: getNotices,
    prepareCheckout: prepareCheckout,
    prepareProductCheckout: prepareProductCheckout,
    applyCoupon: applyCoupon,
    removeCoupon: removeCoupon,
    setShippingMethod: setShippingMethod,
    setPaymentMethod: setPaymentMethod,
    updateCartItem: updateCartItem,
    removeCartItem: removeCartItem,
    restoreCart: restoreCart,
    initClickListeners: initClickListeners,
    resolveProductContext: resolveProductContext,
    getPopup: getPopup,
    buildPopup: buildPopup,
    openPopup: openPopup,
    resetPopup: resetPopup,
    closePopup: closePopup,
    updateProductInfo: updateProductInfo,
    updateShippingMethods: updateShippingMethods,
    updatePaymentMethods: updatePaymentMethods,
    updateSubtotals: updateSubtotals,
    renderVariations: renderVariations,
    toggleSection: toggleSection,
    showSection: showSection,
    hideSection: hideSection,
    showEmptyCart: showEmptyCart,
    hideEmptyCart: hideEmptyCart,
    showFieldsSection: showFieldsSection,
    hideFieldsSection: hideFieldsSection,
    enableCta: enableCta,
    disableCta: disableCta,
    showCartSection: showCartSection,
    hideCartSection: hideCartSection,
    showVariationsSection: showVariationsSection,
    hideVariationsSection: hideVariationsSection,
    showCouponSection: showCouponSection,
    hideCouponSection: hideCouponSection,
    showShippingSection: showShippingSection,
    hideShippingSection: hideShippingSection,
    showTotalsSection: showTotalsSection,
    hideTotalsSection: hideTotalsSection,
    showPaymentSection: showPaymentSection,
    hidePaymentSection: hidePaymentSection,
    renderFieldsFromJson: renderFieldsFromJson,
    autofillCustomerInfo: autofillCustomerInfo,
    validateRequiredFields: validateRequiredFields,
    wireLightCheckoutFields: wireLightCheckoutFields,
    wireFieldSync: wireFieldSync,
    wireCtaSubmit: wireCtaSubmit,
    openPopupFlow: openPopupFlow,
  };

	// Lifecycle hooks start

	function runCustomScript( script, data ) {
		if ( ! script ) {
			return;
		}
		try {
			/* eslint-disable no-new-func */
			var fn = new Function( 'data', script );
			fn( data );
			/* eslint-enable no-new-func */
		} catch ( err ) {
			// Silent for light flow; UI can opt-in to error handling.
		}
	}

	function emitHook( action, data ) {
		var payload = $.extend( { action: action }, data || {} );
		$( document ).trigger( action, payload );
		if ( window.TrizyncPopCart && TrizyncPopCart.scripts && TrizyncPopCart.scriptsEnabled ) {
			runCustomScript( TrizyncPopCart.scripts[ action ], payload );
		}
	}

	function initLifecycleHooks() {
		emitHook( 'popcart:boot', {} );

		$( document ).on( 'click', '[data-trizync-pop-cart-open]', function() {
			emitHook( 'popcart:open:start', {} );
			emitHook( 'popcart:init_checkout', {} );
			emitHook( 'popcart:woocommerce_before_checkout_form', {} );
			emitHook( 'popcart:woocommerce_checkout_before_customer_details', {} );
			emitHook( 'popcart:woocommerce_checkout_billing', {} );
			emitHook( 'popcart:woocommerce_checkout_shipping', {} );
			emitHook( 'popcart:woocommerce_checkout_after_customer_details', {} );
			emitHook( 'popcart:woocommerce_after_checkout_form', {} );
		} );

		$( document ).on( 'click', '.trizync-pop-cart__cta', function() {
			emitHook( 'popcart:checkout:attempt', {} );
		} );
	}

	// Lifecycle hooks end

	// UI logic starts here - keep UI handlers below this line.

	function openPopupFlow( trigger ) {
		var context = resolveProductContext( trigger );
		openPopup();
		setOverlayLoading( true );
		warmSession().always( function() {
			setOverlayLoading( false );
		} );
		wireLightCheckoutFields();
		wireFieldSync();
		wireCtaSubmit();

		setOverlayLoading( true );
		getProductInfo( context ).done( function( response ) {
			console.log( 'Product info response:', response );
			if ( response && response.success ) {
				updateProductInfo( response.data );
				updateShippingMethods( response.data.shipping || {} );
				updatePaymentMethods( response.data.payment || {} );
				updateSubtotals( response.data );
			} else {
				renderErrorMessage( 'Unable to load product details.' );
			}
		} ).fail( function() {
			renderErrorMessage( 'Unable to load product details.' );
		} ).always( function() {
			setOverlayLoading( false );
		} );

		getShippingMethods( context ).done( function( response ) {
			console.log( 'Shipping methods response:', response );
			if ( response && response.success && response.data ) {
				updateShippingMethods( response.data.shipping || {} );
			}
		} ).fail( function() {
			renderErrorMessage( 'Unable to load shipping methods.' );
		} );

		getSubtotal( context ).done( function( response ) {
			if ( response && response.success && response.data ) {
				updateSubtotals( response.data );
			}
		} ).fail( function() {
			renderErrorMessage( 'Unable to calculate totals.' );
		} );
	}

	initClickListeners( function( event ) {
		var trigger = event.target && event.target.closest ? event.target.closest( '[data-trizync-pop-cart-open]' ) : null;
		if ( trigger ) {
			event.preventDefault();
			// openPopupFlow( trigger );
			renderDummyPreviewSequence();
		}
		console.log( 'Open popup click triggered:', trigger );
	} );

	$( document ).on( 'click', '[data-trizync-pop-cart-close]', function( event ) {
		event.preventDefault();
		closePopup();
	} );

	$( document ).on( 'change', '[data-trizync-pop-cart-variation-select]', function() {
		if ( ! lightCurrentPayload || ! lightCurrentPayload.product ) {
			return;
		}
		var attrs = collectVariationAttributes();
		var match = findMatchingVariation( lightCurrentPayload.product, attrs );
		updatePreviewFromVariation( match, lightCurrentPayload.product );
	} );

	$( document ).on( 'click', '.trizync-pop-cart__variation-item[data-variation-id]', function() {
		if ( ! lightCurrentPayload || ! lightCurrentPayload.product ) {
			return;
		}
		var variationId = parseInt( this.getAttribute( 'data-variation-id' ), 10 ) || 0;
		if ( ! variationId ) {
			return;
		}
		lightCurrentPayload.product.selected_variation_id = variationId;
		Array.prototype.forEach.call( this.parentNode.querySelectorAll( '.trizync-pop-cart__variation-item[data-variation-id]' ), function( item ) {
			item.classList.remove( 'is-selected' );
		} );
		this.classList.add( 'is-selected' );
		var radio = this.querySelector( 'input[type="radio"]' );
		if ( radio ) {
			radio.checked = true;
		}
		var match = lightCurrentPayload.product.variations.find( function( variation ) {
			return variation.id === variationId;
		} );
		updatePreviewFromVariation( match, lightCurrentPayload.product );
	} );

	function renderDummyPreviewSequence() {
		var dummyProductPreview = {
			items: [
				{
					key: 'preview',
					product_id: 123,
					sku: 'SKU-123',
					name: 'Sample Product',
					quantity: 1,
					total: '<span class="woocommerce-Price-amount amount"><bdi>100.00<span class="woocommerce-Price-currencySymbol">&#36;</span></bdi></span>',
					line_total_raw: 100,
					price_raw: 100,
					regular_price_raw: 120,
					sale_price_raw: 100,
					image: 'http://zyncops.com/wp-content/uploads/2025/10/1758300496645.20250919_153450@728958583-150x150.jpg',
					permalink: '#'
				}
			],
			subtotal: '<span class="woocommerce-Price-amount amount"><bdi>100.00<span class="woocommerce-Price-currencySymbol">&#36;</span></bdi></span>',
			subtotal_raw: 100,
			total: '<span class="woocommerce-Price-amount amount"><bdi>120.00<span class="woocommerce-Price-currencySymbol">&#36;</span></bdi></span>',
			total_raw: 120,
			shipping: {
				methods: [
					{
						id: 'flat_rate:1',
						label: 'Flat rate',
						price: '<span class="woocommerce-Price-amount amount"><bdi>20.00<span class="woocommerce-Price-currencySymbol">&#36;</span></bdi></span>',
						selected: true,
						method_id: 'flat_rate'
					}
				],
				chosen: 'flat_rate:1',
				total: '<span class="woocommerce-Price-amount amount"><bdi>20.00<span class="woocommerce-Price-currencySymbol">&#36;</span></bdi></span>',
				total_raw: 20
			},
			payment: {
				gateways: [
					{
						id: 'cod',
						title: 'Cash on delivery',
						description: 'Pay with cash upon delivery.',
						selected: true
					}
				],
				chosen: 'cod'
			},
			product: {
				id: 123,
				type: 'variable',
				name: 'Sample Product',
				sku: 'SKU-123',
				price_raw: 100,
				regular_price_raw: 120,
				sale_price_raw: 100,
				image: 'http://zyncops.com/wp-content/uploads/2025/10/1758300496645.20250919_153450@728958583-150x150.jpg',
				permalink: '#',
				attributes: [
					{
						name: 'size',
						key: 'attribute_size',
						label: 'Size',
						options: [ 'S', 'M', 'L' ]
					}
				],
				variations: [
					{
						id: 1001,
						sku: 'SKU-123-S',
						price_raw: 100,
						regular_price_raw: 120,
						price_html: '',
						image: '',
						is_in_stock: true,
						is_purchasable: true,
						attributes: {
							attribute_size: 'S'
						}
					},
					{
						id: 1002,
						sku: 'SKU-123-M',
						price_raw: 105,
						regular_price_raw: 120,
						price_html: '',
						image: '',
						is_in_stock: true,
						is_purchasable: true,
						attributes: {
							attribute_size: 'M'
						}
					}
				],
				default_attributes: {
					attribute_size: 'S'
				},
				selected_variation_id: 1001,
				selected_attributes: {
					attribute_size: 'S'
				}
			}
		};

		var dummySubtotal = {
			subtotal: dummyProductPreview.subtotal,
			subtotal_raw: 100,
			total: dummyProductPreview.total,
			total_raw: 120,
			shipping: dummyProductPreview.shipping
		};

		var dummyShipping = dummyProductPreview.shipping;
		var dummyPayment = dummyProductPreview.payment;

		var dummyFields = [
			{ key: 'billing_first_name', label: 'First name', type: 'text', required: true, default: '', placeholder: 'Your full name' },
			{ key: 'billing_last_name', label: 'Last name', type: 'text', required: false, default: '', placeholder: 'Last name' },
			{ key: 'billing_phone', label: 'Phone', type: 'tel', required: true, default: '', placeholder: 'Phone number' },
			{ key: 'billing_address_1', label: 'Address', type: 'text', required: true, default: '', placeholder: 'Street address' }
		];

		hideCartSection();
		hideShippingSection();
		hideTotalsSection();
		hidePaymentSection();
		hideEmptyCart();
		hideCouponSection();
		disableCta();
		
		openPopup();
		updateProductInfo( dummyProductPreview );
		showCartSection();
		showVariationsSection();
		updateShippingMethods( dummyShipping );
		showShippingSection();
		updateSubtotals( dummySubtotal );
		showTotalsSection();
		console.log( 'Dummy payment data:', dummyPayment );
		// updatePaymentMethods( dummyPayment );
		renderFieldsFromJson( dummyFields );
	}

	initLifecycleHooks();
} )( jQuery );
