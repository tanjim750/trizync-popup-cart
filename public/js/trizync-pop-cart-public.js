(function( $ ) {
	'use strict';

	function getPopup() {
		return document.getElementById( 'trizync-pop-cart' );
	}

	function isCheckoutPage() {
		if ( document.body && document.body.classList.contains( 'woocommerce-checkout' ) ) {
			return true;
		}
		if ( document.body && document.body.className && document.body.className.indexOf( 'cartflows' ) !== -1 ) {
			return true;
		}
		if ( document.querySelector( 'form.woocommerce-checkout:not(#trizync-pop-cart form.woocommerce-checkout)' ) ) {
			return true;
		}
		return window.location && window.location.pathname ? window.location.pathname.indexOf( '/checkout' ) !== -1 : false;
	}
	function applyPopupBranding() {
		if ( ! window.TrizyncPopCart || ! TrizyncPopCart.branding ) {
			return;
		}
		var branding = TrizyncPopCart.branding;
		var popup = getPopup();
		var root = document.documentElement;
		var primary = branding.primary || '#411264';
		var secondary = branding.secondary || '#f0a60a';
		var tertiary = branding.tertiary || '#ffffff';
		var primaryRgb = branding.primaryRgb || '65,18,100';
		var secondaryRgb = branding.secondaryRgb || '240,166,10';
		var tertiaryRgb = branding.tertiaryRgb || '255,255,255';

		if ( root ) {
			root.style.setProperty( '--trizync-primary', primary );
			root.style.setProperty( '--trizync-secondary', secondary );
			root.style.setProperty( '--trizync-tertiary', tertiary );
			root.style.setProperty( '--trizync-primary-rgb', primaryRgb );
			root.style.setProperty( '--trizync-secondary-rgb', secondaryRgb );
			root.style.setProperty( '--trizync-tertiary-rgb', tertiaryRgb );
		}

		if ( popup ) {
			popup.style.setProperty( '--trizync-primary', primary );
			popup.style.setProperty( '--trizync-secondary', secondary );
			popup.style.setProperty( '--trizync-tertiary', tertiary );
			popup.style.setProperty( '--trizync-primary-rgb', primaryRgb );
			popup.style.setProperty( '--trizync-secondary-rgb', secondaryRgb );
			popup.style.setProperty( '--trizync-tertiary-rgb', tertiaryRgb );
			var cta = popup.querySelector( '.trizync-pop-cart__cta' );
			if ( cta ) {
				cta.style.backgroundColor = primary;
				cta.style.color = tertiary;
			}
		}
	}

	var popcartSessionId = 'pc_' + Math.random().toString( 36 ).slice( 2 ) + Date.now().toString( 36 );
	var initiateCheckoutPending = false;

	function getHookContext( action ) {
		return {
			hook: action,
			popup_type: window.TrizyncPopCartCurrentMode || 'cart',
			page_url: window.location.href,
			timestamp: new Date().toISOString(),
			session_id: popcartSessionId
		};
	}

	function showScriptError( message ) {
		var popup = getPopup();
		if ( ! popup ) {
			return;
		}
		var errorWrap = popup.querySelector( '[data-trizync-pop-cart-script-error]' );
		if ( ! errorWrap ) {
			return;
		}
		if ( message ) {
			errorWrap.textContent = message;
			errorWrap.hidden = false;
		} else {
			errorWrap.textContent = '';
			errorWrap.hidden = true;
		}
	}

	function runHookScripts( action, data, context ) {
		if ( ! window.TrizyncPopCart || ! TrizyncPopCart.scripts ) {
			return;
		}
		if ( typeof TrizyncPopCart.scriptsEnabled !== 'undefined' && ! TrizyncPopCart.scriptsEnabled ) {
			return;
		}
		var popup = getPopup();
		if ( ! popup ) {
			return;
		}
		var script = TrizyncPopCart.scripts[ action ];
		if ( ! script || ! script.trim ) {
			return;
		}
		var code = script.trim();
		if ( ! code ) {
			return;
		}
		try {
			showScriptError( '' );
			new Function( 'data', 'context', code )( data, context );
		} catch ( e ) {
			showScriptError( 'Script error in ' + action + ': ' + e.message );
		}
	}

	function emitPopcartHook( action, payload ) {
		var context = getHookContext( action );
		var data = payload && typeof payload === 'object' ? payload : {};
		data.action = action;
		data.timestamp = context.timestamp;
		data.popup_type = context.popup_type;
		data.page_url = context.page_url;
		if ( ! data.meta ) {
			data.meta = {};
		}
		if ( ! data.meta.session_id ) {
			data.meta.session_id = context.session_id;
		}
		runHookScripts( action, data, context );
	}

	function triggerCheckoutEvent( name, args ) {
		if ( typeof jQuery === 'undefined' ) {
			return;
		}
		jQuery( document.body ).trigger( name, args || [] );
	}

	function triggerAddedToCart( payload ) {
		refreshFragmentsSilently( payload && payload.hash ? payload.hash : '' );
		triggerCheckoutEvent( 'trizync_pop_cart_added_to_cart', [ payload || {} ] );
	}

	function refreshFragmentsSilently( cartHash ) {
		if ( ! window.wc_cart_fragments_params ) {
			return;
		}
		var params = wc_cart_fragments_params;
		var url = params.wc_ajax_url ? params.wc_ajax_url.toString().replace( '%%endpoint%%', 'get_refreshed_fragments' ) : '';
		if ( ! url ) {
			return;
		}

		$.ajax( {
			type: 'POST',
			url: url,
			success: function( data ) {
				if ( data && data.fragments ) {
					$.each( data.fragments, function( key, value ) {
						$( key ).replaceWith( value );
					} );
				}
				if ( data && data.cart_hash ) {
					if ( window.sessionStorage ) {
						sessionStorage.setItem( params.cart_hash_key, data.cart_hash );
					}
					if ( window.localStorage ) {
						localStorage.setItem( params.cart_hash_key, data.cart_hash );
					}
				} else if ( cartHash ) {
					if ( window.sessionStorage ) {
						sessionStorage.setItem( params.cart_hash_key, cartHash );
					}
					if ( window.localStorage ) {
						localStorage.setItem( params.cart_hash_key, cartHash );
					}
				}
			}
		} );
	}

	function syncHiddenSelections() {
		var popup = getPopup();
		if ( ! popup ) {
			return;
		}
		var paymentHidden = popup.querySelector( '[data-trizync-pop-cart-payment-input]' );
		var shippingHidden = popup.querySelector( '[data-trizync-pop-cart-shipping-input]' );
		var paymentChecked = popup.querySelector( 'input[name="trizync_pop_cart_payment"]:checked' );
		var shippingChecked = popup.querySelector( 'input[name="trizync_pop_cart_shipping"]:checked' );

		if ( paymentHidden ) {
			if ( paymentChecked ) {
				paymentHidden.value = paymentChecked.value;
			} else {
				var firstPayment = popup.querySelector( 'input[name="trizync_pop_cart_payment"]' );
				if ( firstPayment ) {
					firstPayment.checked = true;
					paymentHidden.value = firstPayment.value;
					if ( typeof setPaymentMethod === 'function' ) {
						setPaymentMethod( firstPayment.value );
					}
				}
			}
		}

		if ( shippingHidden ) {
			if ( shippingChecked ) {
				shippingHidden.value = shippingChecked.value;
			} else {
				var firstShipping = popup.querySelector( 'input[name="trizync_pop_cart_shipping"]' );
				if ( firstShipping ) {
					firstShipping.checked = true;
					shippingHidden.value = firstShipping.value;
					if ( typeof setShippingMethod === 'function' ) {
						setShippingMethod( firstShipping.value );
					}
				}
			}
		}
	}

	function loadCheckoutForm() {
		if ( ! window.TrizyncPopCart ) {
			return;
		}
		var popup = getPopup();
		if ( ! popup ) {
			return;
		}
		var checkoutWrap = popup.querySelector( '[data-trizync-pop-cart-checkout]' );
		if ( ! checkoutWrap ) {
			return;
		}
		var loaded = checkoutWrap.getAttribute( 'data-loaded' ) === '1';
		var hasHtml = checkoutWrap.innerHTML && checkoutWrap.innerHTML.trim().length > 0;
		var lastLoaded = parseInt( checkoutWrap.getAttribute( 'data-loaded-ts' ) || '0', 10 ) || 0;
		var now = Date.now();
		var isFresh = loaded && hasHtml && ( now - lastLoaded < 20000 );
		if ( isFresh ) {
			if ( typeof updateCtaState === 'function' ) {
				updateCtaState();
			}
			syncHiddenSelections();
			return;
		}

		var overlay = popup.querySelector( '[data-trizync-pop-cart-overlay]' );
		if ( overlay && ! loaded ) {
			overlay.hidden = false;
			popup.setAttribute( 'data-checkout-loading', '1' );
		}

		jQuery.post(
			TrizyncPopCart.ajaxUrl,
			{
				action: 'trizync_pop_cart_get_checkout_form',
				nonce: TrizyncPopCart.nonce
			}
		).done( function( response ) {
			if ( response && response.success && response.data && response.data.form ) {
				checkoutWrap.innerHTML = response.data.form;
				checkoutWrap.setAttribute( 'data-loaded', '1' );
				checkoutWrap.setAttribute( 'data-loaded-ts', now.toString() );
				popup.setAttribute( 'data-validation-ready', '1' );
				if ( typeof updateCtaState === 'function' ) {
					updateCtaState();
				}
				if ( typeof scheduleCtaRecheck === 'function' ) {
					scheduleCtaRecheck();
				}
				syncHiddenSelections();
				setTimeout( function() {
					if ( typeof updateCtaState === 'function' ) {
						updateCtaState();
					}
				}, 0 );
				if ( typeof fetchNotices === 'function' ) {
					fetchNotices();
				}
			} else {
				checkoutWrap.removeAttribute( 'data-loaded' );
				checkoutWrap.removeAttribute( 'data-loaded-ts' );
			}
		} ).fail( function() {
			checkoutWrap.removeAttribute( 'data-loaded' );
			checkoutWrap.removeAttribute( 'data-loaded-ts' );
		} ).always( function() {
			if ( overlay && ! loaded ) {
				popup.removeAttribute( 'data-checkout-loading' );
				if ( ! popup.hasAttribute( 'data-cart-loading' ) ) {
					overlay.hidden = true;
				}
			}
		} );
	}

	function openPopup() {
		var popup = getPopup();
		if ( ! popup ) {
			return;
		}
		showScriptError( '' );
		popup.removeAttribute( 'data-validation-ready' );
		emitPopcartHook( 'popcart:open:start', {} );
		applyPopupBranding();
		popup.classList.add( 'is-open' );
		popup.setAttribute( 'aria-hidden', 'false' );
		var popupMode = window.TrizyncPopCartCurrentMode || 'cart';
		var now = Date.now();
		var modeKey = popupMode === 'product' ? 'product' : 'cart';
		var storageKey = 'trizync_pop_cart_init_ts_' + modeKey;
		var lastInit = parseInt( window.sessionStorage ? sessionStorage.getItem( storageKey ) : '0', 10 ) || 0;
		if ( now - lastInit > 20000 ) {
			if ( window.sessionStorage ) {
				sessionStorage.setItem( storageKey, now.toString() );
			}
			triggerCheckoutEvent( 'init_checkout' );
			emitPopcartHook( 'popcart:init_checkout', {} );
			triggerCheckoutEvent( 'woocommerce_before_checkout_form' );
			emitPopcartHook( 'popcart:woocommerce_before_checkout_form', {} );
			triggerCheckoutEvent( 'woocommerce_checkout_before_customer_details' );
			emitPopcartHook( 'popcart:woocommerce_checkout_before_customer_details', {} );
			triggerCheckoutEvent( 'woocommerce_checkout_billing' );
			emitPopcartHook( 'popcart:woocommerce_checkout_billing', {} );
			triggerCheckoutEvent( 'woocommerce_checkout_shipping' );
			emitPopcartHook( 'popcart:woocommerce_checkout_shipping', {} );
			triggerCheckoutEvent( 'woocommerce_checkout_after_customer_details' );
			emitPopcartHook( 'popcart:woocommerce_checkout_after_customer_details', {} );
			triggerCheckoutEvent( 'woocommerce_checkout_before_order_review' );
			emitPopcartHook( 'popcart:woocommerce_checkout_before_order_review', {} );
			triggerCheckoutEvent( 'woocommerce_checkout_order_review' );
			emitPopcartHook( 'popcart:woocommerce_checkout_order_review', {} );
			triggerCheckoutEvent( 'woocommerce_checkout_after_order_review' );
			emitPopcartHook( 'popcart:woocommerce_checkout_after_order_review', {} );
			triggerCheckoutEvent( 'woocommerce_after_checkout_form' );
			emitPopcartHook( 'popcart:woocommerce_after_checkout_form', {} );
			initiateCheckoutPending = true;
		}
		loadCheckoutForm();
		if ( typeof fetchCart === 'function' && ( popupMode === 'cart' || popupMode === 'product' ) ) {
			fetchCart();
		}
		setTimeout( function() {
			if ( typeof updateCtaState === 'function' ) {
				updateCtaState();
			}
		}, 0 );
	}

	function fireInitiateCheckout( payload ) {
		if ( ! payload || ! payload.items || payload.items.length === 0 ) {
			return;
		}
		var currency = ( window.TrizyncPopCart && TrizyncPopCart.currency ) ? TrizyncPopCart.currency : '';
		var value = typeof payload.total_raw !== 'undefined' ? parseFloat( payload.total_raw ) : undefined;
		var contents = payload.items.map( function( item ) {
			return {
				id: item.product_id || item.key || '',
				quantity: item.quantity || 1
			};
		} );
		var contentIds = contents.map( function( item ) { return item.id; } ).filter( function( id ) { return id; } );
		var items = payload.items.map( function( item ) {
			return {
				item_id: item.product_id || item.key || '',
				item_name: item.name || '',
				quantity: item.quantity || 1
			};
		} );

		if ( typeof window.fbq === 'function' ) {
			var fbData = {
				content_type: 'product',
				contents: contents
			};
			if ( contentIds.length ) {
				fbData.content_ids = contentIds;
			}
			if ( currency ) {
				fbData.currency = currency;
			}
			if ( typeof value === 'number' && ! isNaN( value ) ) {
				fbData.value = value;
			}
			window.fbq( 'track', 'InitiateCheckout', fbData );
		}

		if ( typeof window.ttq === 'object' && typeof window.ttq.track === 'function' ) {
			var ttData = {
				content_type: 'product',
				contents: contents
			};
			if ( currency ) {
				ttData.currency = currency;
			}
			if ( typeof value === 'number' && ! isNaN( value ) ) {
				ttData.value = value;
			}
			window.ttq.track( 'InitiateCheckout', ttData );
		}

		if ( typeof window.gtag === 'function' ) {
			var gaData = {
				items: items
			};
			if ( currency ) {
				gaData.currency = currency;
			}
			if ( typeof value === 'number' && ! isNaN( value ) ) {
				gaData.value = value;
			}
			window.gtag( 'event', 'begin_checkout', gaData );
		}
	}

	function closePopup() {
		var popup = getPopup();
		if ( ! popup ) {
			return;
		}
		popup.classList.remove( 'is-open' );
		popup.setAttribute( 'aria-hidden', 'true' );
	}

	$( function() {
		applyPopupBranding();
		emitPopcartHook( 'popcart:boot', {} );

		var isFetchingCart = false;
		var currentMode = 'cart';
		var currentProductId = 0;
		var currentProductQty = 1;
		var lastItemCount = 0;
		var productCheckoutPrepared = false;
		var productCheckoutPreparing = false;
		var preparedProductId = 0;
		var preparedProductQty = 0;
		var lastCartPayload = null;
		var currentProductData = null;
		var currentVariationId = 0;
		var currentVariationAttributes = {};
		var currentVariationData = null;

		function buildCartSummary( payload ) {
			if ( ! payload ) {
				return {
					items_count: 0,
					qty_total: 0,
					subtotal: '',
					subtotal_raw: 0,
					total: '',
					total_raw: 0,
					currency: ( window.TrizyncPopCart && TrizyncPopCart.currency ) ? TrizyncPopCart.currency : ''
				};
			}
			var qtyTotal = 0;
			if ( payload.items && payload.items.length ) {
				payload.items.forEach( function( item ) {
					qtyTotal += item.quantity ? parseInt( item.quantity, 10 ) || 0 : 0;
				} );
			}
			return {
				items_count: payload.itemCount || 0,
				qty_total: qtyTotal,
				subtotal: payload.subtotal || '',
				subtotal_raw: typeof payload.subtotal_raw !== 'undefined' ? payload.subtotal_raw : 0,
				total: payload.total || '',
				total_raw: typeof payload.total_raw !== 'undefined' ? payload.total_raw : 0,
				currency: ( window.TrizyncPopCart && TrizyncPopCart.currency ) ? TrizyncPopCart.currency : ''
			};
		}

		function mapItemToProduct( item ) {
			if ( ! item ) {
				return null;
			}
			return {
				id: item.product_id || item.id || '',
				sku: item.sku || '',
				name: item.name || '',
				price: typeof item.price_raw !== 'undefined' ? item.price_raw : null,
				regular_price: typeof item.regular_price_raw !== 'undefined' ? item.regular_price_raw : null,
				sale_price: typeof item.sale_price_raw !== 'undefined' ? item.sale_price_raw : null,
				qty: item.quantity || 1,
				currency: ( window.TrizyncPopCart && TrizyncPopCart.currency ) ? TrizyncPopCart.currency : '',
				image: item.image || '',
				permalink: item.permalink || '',
				categories: item.categories || [],
				variants: item.variants || []
			};
		}

		function buildHookPayload( action, extra ) {
			var payload = lastCartPayload || null;
			var cartItems = [];
			if ( payload && payload.items && payload.items.length ) {
				cartItems = payload.items.map( function( item ) {
					return mapItemToProduct( item );
				} ).filter( function( item ) { return item; } );
			}
			var data = {
				action: action,
				cart: buildCartSummary( payload ),
				cart_items: cartItems,
				product: currentMode === 'product' && cartItems.length ? cartItems[0] : null,
				errors: []
			};
			if ( currentMode === 'product' ) {
				data.selection = data.selection || {};
				data.selection.variation_id = currentVariationId || 0;
				data.selection.attributes = currentVariationAttributes || {};
			}
			if ( extra && typeof extra === 'object' ) {
				Object.keys( extra ).forEach( function( key ) {
					data[ key ] = extra[ key ];
				} );
			}
			return data;
		}

		function getSelectionData() {
			var popup = getPopup();
			if ( ! popup ) {
				return {};
			}
			var shipping = popup.querySelector( 'input[name="trizync_pop_cart_shipping"]:checked' );
			var payment = popup.querySelector( 'input[name="trizync_pop_cart_payment"]:checked' );
			return {
				shipping_method: shipping ? shipping.value : '',
				payment_method: payment ? payment.value : ''
			};
		}

	function normalizeAttributeKey( key ) {
		if ( ! key ) {
			return '';
		}
		return key.indexOf( 'attribute_' ) === 0 ? key : 'attribute_' + key;
	}

	function normalizeVariationValue( value ) {
		if ( value === null || typeof value === 'undefined' ) {
			return '';
		}
		var text = String( value ).trim().toLowerCase();
		return text.replace( /\s+/g, '-' );
	}

	function isVariationSelectionComplete( productData, attributes ) {
		if ( ! productData || ! productData.attributes || ! productData.attributes.length ) {
			return false;
		}
			return productData.attributes.every( function( attribute ) {
				return attributes && attributes[ attribute.key ];
			} );
		}

	function findMatchingVariation( productData, attributes ) {
		if ( ! productData || ! productData.variations || ! productData.variations.length ) {
			return null;
		}
		var selected = attributes || {};
		return productData.variations.find( function( variation ) {
			var matches = true;
			Object.keys( variation.attributes || {} ).forEach( function( key ) {
				var expected = variation.attributes[ key ];
				var actual = selected[ key ] || '';
				var expectedNorm = normalizeVariationValue( expected );
				var actualNorm = normalizeVariationValue( actual );
				if ( ! expectedNorm ) {
					return;
				}
				if ( ! actualNorm ) {
					matches = false;
				}
				if ( expectedNorm && actualNorm && expectedNorm !== actualNorm ) {
					matches = false;
				}
			} );
			return matches;
		} ) || null;
	}

		function renderVariations( productData ) {
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

			if ( ! productData || productData.type !== 'variable' || ! productData.attributes || ! productData.attributes.length ) {
				wrap.hidden = true;
				list.innerHTML = '';
				if ( error ) {
					error.hidden = true;
				}
				currentProductData = productData || null;
				currentVariationId = 0;
				currentVariationAttributes = {};
				currentVariationData = null;
				return;
			}

			currentProductData = productData;

			if ( ! currentVariationAttributes || Object.keys( currentVariationAttributes ).length === 0 ) {
				if ( productData.selected_attributes && typeof productData.selected_attributes === 'object' ) {
					currentVariationAttributes = productData.selected_attributes;
				} else if ( productData.default_attributes && typeof productData.default_attributes === 'object' ) {
					currentVariationAttributes = productData.default_attributes;
				} else {
					currentVariationAttributes = {};
				}
			}

			list.innerHTML = '';
			productData.attributes.forEach( function( attribute ) {
				var field = document.createElement( 'div' );
				field.className = 'trizync-pop-cart__variation-field';
				var label = document.createElement( 'label' );
				label.textContent = attribute.label || attribute.name || 'Option';
				field.appendChild( label );
				var select = document.createElement( 'select' );
				select.className = 'trizync-pop-cart__variation-select';
				select.setAttribute( 'data-trizync-pop-cart-variation-select', '' );
				select.setAttribute( 'data-variation-key', attribute.key );

				var placeholder = document.createElement( 'option' );
				placeholder.value = '';
				placeholder.textContent = 'Choose ' + ( attribute.label || attribute.name || 'option' );
				select.appendChild( placeholder );

				( attribute.options || [] ).forEach( function( option ) {
					var opt = document.createElement( 'option' );
					opt.value = option;
					opt.textContent = option;
					if ( currentVariationAttributes[ attribute.key ] === option ) {
						opt.selected = true;
					}
					select.appendChild( opt );
				} );
				field.appendChild( select );
				list.appendChild( field );
			} );

			var match = isVariationSelectionComplete( productData, currentVariationAttributes )
				? findMatchingVariation( productData, currentVariationAttributes )
				: null;
			currentVariationData = match;
			currentVariationId = match ? match.id : 0;

			if ( error ) {
				if ( ! currentVariationId ) {
					error.textContent = 'Please select product options.';
					error.hidden = false;
				} else if ( match && ( match.is_in_stock === false || match.is_purchasable === false ) ) {
					error.textContent = 'Selected variation is unavailable.';
					error.hidden = false;
				} else {
					error.hidden = true;
				}
			}
			wrap.hidden = false;
		}

		function renderCart( payload ) {
			var popup = getPopup();
			if ( ! popup ) {
				return;
			}

			var list = popup.querySelector( '[data-trizync-pop-cart-list]' );
			var empty = popup.querySelector( '[data-trizync-pop-cart-empty]' );
			var totals = popup.querySelector( '[data-trizync-pop-cart-totals]' );
			var subtotal = popup.querySelector( '[data-trizync-pop-cart-subtotal]' );
			var total = popup.querySelector( '[data-trizync-pop-cart-total]' );
			var shippingRow = popup.querySelector( '[data-trizync-pop-cart-shipping-row]' );
			var shippingTotal = popup.querySelector( '[data-trizync-pop-cart-shipping-total]' );
			var cartLabel = popup.querySelector( '[data-trizync-pop-cart-cart-label]' );
			var cartWrap = popup.querySelector( '[data-trizync-pop-cart-cart]' );
			var overlay = popup.querySelector( '[data-trizync-pop-cart-overlay]' );
			var paymentWrap = popup.querySelector( '[data-trizync-pop-cart-payment]' );
			var paymentEmpty = popup.querySelector( '[data-trizync-pop-cart-payment-empty]' );
			var paymentList = popup.querySelector( '[data-trizync-pop-cart-payment-list]' );
			var couponWrap = popup.querySelector( '[data-trizync-pop-cart-coupon]' );
			var couponList = popup.querySelector( '[data-trizync-pop-cart-coupon-list]' );
			var couponError = popup.querySelector( '[data-trizync-pop-cart-coupon-error]' );
			var cta = popup.querySelector( '.trizync-pop-cart__cta' );
			var checkoutWrap = popup.querySelector( '[data-trizync-pop-cart-checkout]' );
			var noticesWrap = popup.querySelector( '.woocommerce-notices-wrapper' );

			if ( ! list || ! empty || ! totals || ! subtotal || ! total || ! shippingRow || ! shippingTotal || ! cartLabel || ! overlay || ! paymentWrap || ! paymentEmpty || ! paymentList ) {
				return;
			}
			if ( cartWrap ) {
				cartWrap.hidden = false;
			}

			if ( checkoutWrap && ! checkoutWrap.innerHTML.trim() && ! popup.hasAttribute( 'data-checkout-loading' ) ) {
				loadCheckoutForm();
			}

			if ( ! popup.hasAttribute( 'data-checkout-loading' ) ) {
				overlay.hidden = true;
			}
			if ( cta ) {
				cta.disabled = true;
			}
			list.innerHTML = '';
			if ( currentMode === 'product' ) {
				list.hidden = false;
				empty.hidden = true;
				cartLabel.hidden = false;
				cartLabel.textContent = 'Selected item';
			} else {
				list.hidden = false;
				cartLabel.hidden = false;
				cartLabel.textContent = 'Cart items';
			}

			lastCartPayload = payload || null;
			if ( payload && typeof payload.notices !== 'undefined' && noticesWrap ) {
				noticesWrap.innerHTML = payload.notices || '';
			}
			if ( payload && typeof payload.itemCount !== 'undefined' && payload.itemCount !== null ) {
				lastItemCount = parseInt( payload.itemCount, 10 ) || 0;
			} else if ( payload && payload.items && payload.items.length ) {
				lastItemCount = payload.items.reduce( function( total, item ) {
					return total + ( item.quantity ? parseInt( item.quantity, 10 ) || 0 : 0 );
				}, 0 );
			} else {
				lastItemCount = 0;
			}
			if ( ! payload || ! payload.items || payload.items.length === 0 ) {
				if ( currentMode === 'cart' ) {
					empty.hidden = false;
					totals.hidden = true;
					subtotal.innerHTML = '';
					total.innerHTML = '';
					shippingRow.hidden = true;
					shippingTotal.innerHTML = '';
				} else {
					empty.hidden = true;
					totals.hidden = true;
				}
				if ( cta ) {
					cta.disabled = true;
				}
				renderVariations( null );
				renderShipping( null );
				renderCoupons( payload ? payload.coupons : [] );
				return;
			}

			payload.items.forEach( function( item ) {
				var li = document.createElement( 'li' );
				li.className = 'trizync-pop-cart__cart-item';

				var left = document.createElement( 'div' );
				left.className = 'trizync-pop-cart__cart-info';

				if ( item.image ) {
					var thumb = document.createElement( 'img' );
					thumb.className = 'trizync-pop-cart__cart-thumb';
					thumb.src = item.image;
					thumb.alt = item.name || '';
					left.appendChild( thumb );
				}

				var name = document.createElement( 'span' );
				name.className = 'trizync-pop-cart__cart-name';
				name.textContent = item.name;
				left.appendChild( name );

				var qtyWrap = document.createElement( 'div' );
				qtyWrap.className = 'trizync-pop-cart__cart-qty';

				if ( currentMode === 'cart' || currentMode === 'product' ) {
					var qtyControls = document.createElement( 'div' );
					qtyControls.className = 'trizync-pop-cart__qty-controls';

					var minus = document.createElement( 'button' );
					minus.type = 'button';
					minus.className = 'trizync-pop-cart__qty-btn';
					minus.textContent = '−';
					if ( currentMode === 'cart' ) {
						minus.setAttribute( 'data-cart-item-key', item.key );
					}
					minus.setAttribute( 'data-qty-action', 'decrease' );
					if ( currentMode === 'product' ) {
						minus.setAttribute( 'data-qty-scope', 'product' );
					}

					var qtyValue = document.createElement( 'span' );
					qtyValue.className = 'trizync-pop-cart__qty-value';
					qtyValue.textContent = item.quantity;
					if ( currentMode === 'cart' ) {
						qtyValue.setAttribute( 'data-cart-item-key', item.key );
					}
					if ( currentMode === 'product' ) {
						qtyValue.setAttribute( 'data-qty-scope', 'product' );
						qtyValue.setAttribute( 'data-qty-value', '' );
					}

					var plus = document.createElement( 'button' );
					plus.type = 'button';
					plus.className = 'trizync-pop-cart__qty-btn';
					plus.textContent = '+';
					if ( currentMode === 'cart' ) {
						plus.setAttribute( 'data-cart-item-key', item.key );
					}
					plus.setAttribute( 'data-qty-action', 'increase' );
					if ( currentMode === 'product' ) {
						plus.setAttribute( 'data-qty-scope', 'product' );
					}

					qtyControls.appendChild( minus );
					qtyControls.appendChild( qtyValue );
					qtyControls.appendChild( plus );
					qtyWrap.appendChild( qtyControls );
				}

				left.appendChild( qtyWrap );

				var right = document.createElement( 'div' );
				right.className = 'trizync-pop-cart__cart-meta';
				var price = document.createElement( 'span' );
				price.className = 'trizync-pop-cart__cart-price';
				price.innerHTML = item.total;
				right.appendChild( price );

				if ( currentMode === 'cart' ) {
					var remove = document.createElement( 'button' );
					remove.type = 'button';
					remove.className = 'trizync-pop-cart__cart-remove';
					remove.textContent = '×';
					remove.setAttribute( 'data-cart-item-key', item.key );
					remove.setAttribute( 'aria-label', 'Remove item' );
					right.appendChild( remove );
				}

				li.appendChild( left );
				li.appendChild( right );
				list.appendChild( li );
			} );

			if ( currentMode === 'product' ) {
				renderVariations( payload.product || null );
			} else {
				renderVariations( null );
			}

			empty.hidden = true;
			totals.hidden = false;
			subtotal.innerHTML = payload.subtotal || '';
			total.innerHTML = payload.total || '';

			if ( payload.shipping && payload.shipping.total ) {
				shippingRow.hidden = false;
				shippingTotal.innerHTML = payload.shipping.total;
			} else {
				shippingRow.hidden = true;
				shippingTotal.innerHTML = '';
			}

			renderShipping( payload.shipping );
			renderPayment( payload.payment );
			renderCoupons( payload.coupons || [] );
			triggerCheckoutEvent( 'updated_checkout', [ payload ] );
			emitPopcartHook( 'popcart:updated_checkout', buildHookPayload( 'popcart:updated_checkout' ) );
			// if ( initiateCheckoutPending ) {
			// 	fireInitiateCheckout( payload );
			// 	initiateCheckoutPending = false;
			// }
			updateCtaState();
		}

		function fetchCart( showOverlay ) {
			if ( isFetchingCart || ! window.TrizyncPopCart ) {
				return;
			}

			if ( typeof showOverlay === 'undefined' ) {
				showOverlay = true;
			}

			var popup = getPopup();
			if ( popup ) {
				var list = popup.querySelector( '[data-trizync-pop-cart-list]' );
				var empty = popup.querySelector( '[data-trizync-pop-cart-empty]' );
				var totals = popup.querySelector( '[data-trizync-pop-cart-totals]' );
				var shippingWrap = popup.querySelector( '[data-trizync-pop-cart-shipping]' );
				var overlay = popup.querySelector( '[data-trizync-pop-cart-overlay]' );
				var cta = popup.querySelector( '.trizync-pop-cart__cta' );

				if ( showOverlay ) {
					popup.setAttribute( 'data-cart-loading', '1' );
					if ( list ) {
						list.innerHTML = '';
					}
					if ( empty ) {
						empty.hidden = true;
					}
					if ( totals ) {
						totals.hidden = true;
					}
					if ( shippingWrap ) {
						shippingWrap.hidden = true;
					}
					if ( overlay ) {
						overlay.hidden = false;
					}
					if ( cta ) {
						cta.disabled = true;
					}
				}
			}

			isFetchingCart = true;
			var payload = {
				nonce: TrizyncPopCart.nonce
			};

			if ( currentMode === 'product' && currentProductId ) {
				payload.action = 'trizync_pop_cart_get_product_preview';
				payload.product_id = currentProductId;
				payload.quantity = currentProductQty;
				if ( currentVariationId ) {
					payload.variation_id = currentVariationId;
				}
				if ( currentVariationAttributes && Object.keys( currentVariationAttributes ).length ) {
					payload.attributes = JSON.stringify( currentVariationAttributes );
				}
			} else {
				payload.action = 'trizync_pop_cart_get_cart';
			}

			$.post( TrizyncPopCart.ajaxUrl, payload )
				.done( function( response ) {
				if ( response && response.success && response.data ) {
					renderCart( response.data );
					fetchNotices();
				}
				var popup = getPopup();
				if ( popup ) {
					var overlay = popup.querySelector( '[data-trizync-pop-cart-overlay]' );
					popup.removeAttribute( 'data-cart-loading' );
					if ( overlay && ! popup.hasAttribute( 'data-checkout-loading' ) ) {
						overlay.hidden = true;
					}
				}
			} )
			.always( function() {
				var popup = getPopup();
				if ( popup ) {
					var overlay = popup.querySelector( '[data-trizync-pop-cart-overlay]' );
					popup.removeAttribute( 'data-cart-loading' );
					if ( overlay && ! popup.hasAttribute( 'data-checkout-loading' ) ) {
						overlay.hidden = true;
					}
				}
				isFetchingCart = false;
			} );
		}

		function isFieldFilled( field ) {
			if ( ! field ) {
				return false;
			}
			if ( field.type === 'checkbox' || field.type === 'radio' ) {
				var group = field.name ? field.form.querySelectorAll( '[name="' + field.name + '"]' ) : [ field ];
				return Array.prototype.some.call( group, function( input ) {
					return input.checked;
				} );
			}
			return field.value && field.value.toString().trim().length > 0;
		}

		function updateCtaState() {
			var popup = getPopup();
			if ( ! popup ) {
				return;
			}
			var cta = popup.querySelector( '.trizync-pop-cart__cta' );
			if ( ! cta ) {
				return;
			}
			var form = popup.querySelector( 'form.woocommerce-checkout' );
			if ( ! form ) {
				cta.disabled = lastItemCount < 1;
				return;
			}

			if ( lastItemCount < 1 ) {
				cta.disabled = true;
				return;
			}

			if ( currentMode === 'product' && currentProductData && currentProductData.type === 'variable' ) {
				if ( ! currentVariationId ) {
					cta.disabled = true;
					return;
				}
				if ( currentVariationData && ( currentVariationData.is_in_stock === false || currentVariationData.is_purchasable === false ) ) {
					cta.disabled = true;
					return;
				}
			}

			if ( ! popup.hasAttribute( 'data-validation-ready' ) ) {
				cta.disabled = false;
				return;
			}

			var requiredNames = [ 'billing_first_name', 'billing_phone', 'billing_email', 'billing_address_1' ];
			var requiredFields = form.querySelectorAll( requiredNames.map( function( name ) {
				return '[name="' + name + '"]';
			} ).join( ',' ) );
			var allFilled = true;
			Array.prototype.some.call( requiredFields, function( field ) {
				if ( field.disabled || field.closest( '.woocommerce-input-wrapper' )?.classList.contains( 'hidden' ) ) {
					return false;
				}
				if ( ! isFieldFilled( field ) ) {
					allFilled = false;
					return true;
				}
				return false;
			} );

			var emailField = form.querySelector( '[name="billing_email"]' );
			var phoneField = form.querySelector( '[name="billing_phone"]' );
			var emailValid = true;
			var phoneValid = true;

			if ( emailField && isFieldFilled( emailField ) ) {
				emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test( emailField.value.trim() );
			}

			if ( phoneField && isFieldFilled( phoneField ) ) {
				var phoneValue = phoneField.value.trim();
				var digitsOnly = phoneValue.replace( /[^\d]/g, '' );
				phoneValid = /^\+?[\d\s\-().]+$/.test( phoneValue ) && digitsOnly.length >= 7 && digitsOnly.length <= 15;
			}

			if ( allFilled && emailValid && phoneValid ) {
				cta.disabled = false;
			} else {
				cta.disabled = true;
			}
		}

		function scheduleCtaRecheck() {
			var delays = [ 120, 350, 800 ];
			delays.forEach( function( delay ) {
				setTimeout( function() {
					updateCtaState();
				}, delay );
			} );
		}

		function collectValidationErrors( form ) {
			var errors = [];
			if ( ! form ) {
				return errors;
			}
			var requiredNames = [ 'billing_first_name', 'billing_phone', 'billing_email', 'billing_address_1' ];
			requiredNames.forEach( function( name ) {
				var field = form.querySelector( '[name="' + name + '"]' );
				if ( ! field || field.disabled || field.closest( '.woocommerce-input-wrapper' )?.classList.contains( 'hidden' ) ) {
					return;
				}
				if ( ! isFieldFilled( field ) ) {
					errors.push( { field: name, message: 'Required field missing' } );
				}
			} );

			var emailField = form.querySelector( '[name="billing_email"]' );
			if ( emailField && isFieldFilled( emailField ) ) {
				var emailValue = emailField.value.trim();
				if ( ! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test( emailValue ) ) {
					errors.push( { field: 'billing_email', message: 'Invalid email address' } );
				}
			}

			var phoneField = form.querySelector( '[name="billing_phone"]' );
			if ( phoneField && isFieldFilled( phoneField ) ) {
				var phoneValue = phoneField.value.trim();
				var digitsOnly = phoneValue.replace( /[^\d]/g, '' );
				var phoneValid = /^\+?[\d\s\-().]+$/.test( phoneValue ) && digitsOnly.length >= 7 && digitsOnly.length <= 15;
				if ( ! phoneValid ) {
					errors.push( { field: 'billing_phone', message: 'Invalid phone number' } );
				}
			}

			if ( currentMode === 'product' && currentProductData && currentProductData.type === 'variable' && ! currentVariationId ) {
				errors.push( { field: 'product_variation', message: 'Please select product options' } );
			}
			if ( currentMode === 'product' && currentVariationData && ( currentVariationData.is_in_stock === false || currentVariationData.is_purchasable === false ) ) {
				errors.push( { field: 'product_variation', message: 'Selected variation is unavailable' } );
			}

			return errors;
		}

		function fetchNotices() {
			if ( ! window.TrizyncPopCart ) {
				return;
			}
			var popup = getPopup();
			if ( ! popup ) {
				return;
			}
			var noticesWrap = popup.querySelector( '.woocommerce-notices-wrapper' );
			if ( ! noticesWrap ) {
				return;
			}

			$.post(
				TrizyncPopCart.ajaxUrl,
				{
					action: 'trizync_pop_cart_get_notices',
					nonce: TrizyncPopCart.nonce
				}
			).done( function( response ) {
				if ( response && response.success && response.data ) {
					noticesWrap.innerHTML = response.data.notices || '';
				}
			} );
		}

		var customerUpdateTimer = null;
		function scheduleCustomerUpdate() {
			if ( customerUpdateTimer ) {
				clearTimeout( customerUpdateTimer );
			}
			customerUpdateTimer = setTimeout( function() {
				updateCustomerFromForm();
			}, 500 );
		}

		function updateCustomerFromForm() {
			if ( ! window.TrizyncPopCart ) {
				return;
			}
			var popup = getPopup();
			if ( ! popup ) {
				return;
			}
			var form = popup.querySelector( 'form.woocommerce-checkout' );
			if ( ! form ) {
				return;
			}
			var data = {};
			var fields = form.querySelectorAll( '[name^="billing_"], [name^="shipping_"]' );
			fields.forEach( function( field ) {
				if ( field.disabled ) {
					return;
				}
				var name = field.getAttribute( 'name' );
				if ( ! name ) {
					return;
				}
				if ( field.type === 'checkbox' || field.type === 'radio' ) {
					if ( ! field.checked ) {
						return;
					}
				}
				var value = field.value;
				if ( value === null || typeof value === 'undefined' || String( value ).trim() === '' ) {
					return;
				}
				data[ name ] = value;
			} );
			if ( Object.keys( data ).length === 0 ) {
				return;
			}
			$.post(
				TrizyncPopCart.ajaxUrl,
				{
					action: 'trizync_pop_cart_update_customer',
					nonce: TrizyncPopCart.nonce,
					data: data
				}
			).done( function( response ) {
				if ( response && response.success && response.data ) {
					renderCart( response.data );
					if ( ! response.data.notices && typeof fetchNotices === 'function' ) {
						fetchNotices();
					}
				}
			} );
		}

		function applyCoupon( code ) {
			if ( ! window.TrizyncPopCart ) {
				return;
			}
			$.post(
				TrizyncPopCart.ajaxUrl,
				{
					action: 'trizync_pop_cart_apply_coupon',
					nonce: TrizyncPopCart.nonce,
					code: code
				}
			).done( function( response ) {
				if ( response && response.success && response.data ) {
					renderCart( response.data );
				} else if ( response && response.data ) {
					showCouponError( response.data.message || 'Unable to apply coupon.' );
				}
			} ).fail( function( xhr ) {
				var message = 'Unable to apply coupon.';
				if ( xhr && xhr.responseJSON && xhr.responseJSON.data && xhr.responseJSON.data.message ) {
					message = xhr.responseJSON.data.message;
				}
				showCouponError( message );
			} );
		}

		function removeCoupon( code ) {
			if ( ! window.TrizyncPopCart ) {
				return;
			}
			$.post(
				TrizyncPopCart.ajaxUrl,
				{
					action: 'trizync_pop_cart_remove_coupon',
					nonce: TrizyncPopCart.nonce,
					code: code
				}
			).done( function( response ) {
				if ( response && response.success && response.data ) {
					renderCart( response.data );
				}
			} );
		}

		function showCouponError( message ) {
			var popup = getPopup();
			if ( ! popup ) {
				return;
			}
			var error = popup.querySelector( '[data-trizync-pop-cart-coupon-error]' );
			if ( ! error ) {
				return;
			}
			error.textContent = message;
			error.hidden = false;
		}


		function updateCartItem( key, quantity ) {
			if ( ! window.TrizyncPopCart ) {
				return;
			}

			$.post(
				TrizyncPopCart.ajaxUrl,
				{
					action: 'trizync_pop_cart_update_cart_item',
					nonce: TrizyncPopCart.nonce,
					cart_item_key: key,
					quantity: quantity
				}
			).done( function( response ) {
				if ( response && response.success && response.data ) {
					renderCart( response.data );
				}
			} );
		}

		function removeCartItem( key ) {
			if ( ! window.TrizyncPopCart ) {
				return;
			}

			$.post(
				TrizyncPopCart.ajaxUrl,
				{
					action: 'trizync_pop_cart_remove_cart_item',
					nonce: TrizyncPopCart.nonce,
					cart_item_key: key
				}
			).done( function( response ) {
				if ( response && response.success && response.data ) {
					renderCart( response.data );
				}
			} );
		}

		function renderShipping( shipping ) {
			var popup = getPopup();
			if ( ! popup ) {
				return;
			}

			var shippingWrap = popup.querySelector( '[data-trizync-pop-cart-shipping]' );
			var list = popup.querySelector( '[data-trizync-pop-cart-shipping-list]' );
			var empty = popup.querySelector( '[data-trizync-pop-cart-shipping-empty]' );
			var hiddenInput = popup.querySelector( '[data-trizync-pop-cart-shipping-input]' );

			if ( ! shippingWrap || ! list || ! empty ) {
				return;
			}

			list.innerHTML = '';

			if ( ! shipping || ! shipping.methods || shipping.methods.length === 0 ) {
				shippingWrap.hidden = false;
				empty.hidden = false;
				if ( hiddenInput ) {
					hiddenInput.value = '';
				}
				return;
			}

			var selectedId = '';
			shipping.methods.forEach( function( method ) {
				var option = document.createElement( 'label' );
				option.className = 'trizync-pop-cart__shipping-option';

				var input = document.createElement( 'input' );
				input.type = 'radio';
				input.name = 'trizync_pop_cart_shipping';
				input.value = method.id;
				if ( method.selected ) {
					input.checked = true;
					selectedId = method.id;
				}

				var meta = document.createElement( 'span' );
				meta.className = 'trizync-pop-cart__shipping-meta';

				var label = document.createElement( 'span' );
				label.className = 'trizync-pop-cart__shipping-label';
				label.textContent = method.label;

				var price = document.createElement( 'span' );
				price.className = 'trizync-pop-cart__shipping-price';
				price.innerHTML = method.price;

				meta.appendChild( label );
				meta.appendChild( price );
				option.appendChild( input );
				option.appendChild( meta );
				list.appendChild( option );
			} );

			if ( hiddenInput ) {
				hiddenInput.value = selectedId;
			}
			empty.hidden = true;
			shippingWrap.hidden = false;
			syncHiddenSelections();
		}

		function renderPayment( payment ) {
			var popup = getPopup();
			if ( ! popup ) {
				return;
			}

			var wrap = popup.querySelector( '[data-trizync-pop-cart-payment]' );
			var empty = popup.querySelector( '[data-trizync-pop-cart-payment-empty]' );
			var list = popup.querySelector( '[data-trizync-pop-cart-payment-list]' );
			var hiddenInput = popup.querySelector( '[data-trizync-pop-cart-payment-input]' );

			if ( ! wrap || ! empty || ! list ) {
				return;
			}

			list.innerHTML = '';

			if ( ! payment || ! payment.gateways || payment.gateways.length === 0 ) {
				wrap.hidden = false;
				empty.hidden = false;
				if ( hiddenInput ) {
					hiddenInput.value = '';
				}
				return;
			}

			var selectedId = '';
			payment.gateways.forEach( function( gateway ) {
				var option = document.createElement( 'label' );
				option.className = 'trizync-pop-cart__payment-option';

				var input = document.createElement( 'input' );
				input.type = 'radio';
				input.name = 'trizync_pop_cart_payment';
				input.value = gateway.id;
				if ( gateway.selected ) {
					input.checked = true;
					selectedId = gateway.id;
				}

				var meta = document.createElement( 'span' );
				meta.className = 'trizync-pop-cart__payment-meta';

				var title = document.createElement( 'span' );
				title.className = 'trizync-pop-cart__payment-title';
				title.textContent = gateway.title;

				meta.appendChild( title );

				if ( gateway.description ) {
					var desc = document.createElement( 'span' );
					desc.className = 'trizync-pop-cart__payment-desc';
					desc.innerHTML = gateway.description;
					meta.appendChild( desc );
				}

				option.appendChild( input );
				option.appendChild( meta );
				list.appendChild( option );
			} );

			if ( hiddenInput ) {
				hiddenInput.value = selectedId;
			}
			empty.hidden = true;
			wrap.hidden = false;
			syncHiddenSelections();
		}

		function renderCoupons( coupons ) {
			var popup = getPopup();
			if ( ! popup ) {
				return;
			}
			var wrap = popup.querySelector( '[data-trizync-pop-cart-coupon]' );
			var list = popup.querySelector( '[data-trizync-pop-cart-coupon-list]' );
			var error = popup.querySelector( '[data-trizync-pop-cart-coupon-error]' );
			if ( ! wrap || ! list ) {
				return;
			}
			list.innerHTML = '';
			if ( error ) {
				error.hidden = true;
				error.textContent = '';
			}
			if ( ! coupons || ! coupons.length ) {
				wrap.hidden = true;
				return;
			}
			wrap.hidden = false;
			coupons.forEach( function( coupon ) {
				var row = document.createElement( 'div' );
				row.className = 'trizync-pop-cart__coupon-item';
				var code = document.createElement( 'span' );
				code.className = 'trizync-pop-cart__coupon-code';
				code.textContent = coupon.code || '';
				var amount = document.createElement( 'span' );
				amount.className = 'trizync-pop-cart__coupon-amount';
				amount.innerHTML = coupon.amount || '';
				var remove = document.createElement( 'button' );
				remove.type = 'button';
				remove.className = 'trizync-pop-cart__coupon-remove';
				remove.textContent = '×';
				remove.setAttribute( 'data-coupon-code', coupon.code || '' );
				row.appendChild( code );
				row.appendChild( amount );
				row.appendChild( remove );
				list.appendChild( row );
			} );
		}

		function setPaymentMethod( methodId ) {
			if ( ! window.TrizyncPopCart ) {
				return;
			}

			$.post(
				TrizyncPopCart.ajaxUrl,
				{
					action: 'trizync_pop_cart_set_payment_method',
					nonce: TrizyncPopCart.nonce,
					payment_method: methodId
				}
			).done( function( response ) {
				if ( response && response.success && response.data ) {
					renderCart( response.data );
				}
			} );
		}
		function setShippingMethod( methodId ) {
			if ( ! window.TrizyncPopCart ) {
				return;
			}

			$.post(
				TrizyncPopCart.ajaxUrl,
				{
					action: 'trizync_pop_cart_set_shipping_method',
					nonce: TrizyncPopCart.nonce,
					shipping_method: methodId
				}
			).done( function( response ) {
				if ( response && response.success && response.data ) {
					renderCart( response.data );
				}
			} );
		}
		function updateContext( button, forcedType ) {
			var popup = getPopup();
			if ( ! popup || ! button ) {
				return;
			}

			var cart = popup.querySelector( '[data-trizync-pop-cart-cart]' );
			var type = forcedType || button.getAttribute( 'data-trizync-pop-cart-open' );

			if (
				! forcedType &&
				! type &&
				button.classList &&
				( button.classList.contains( 'checkout-button' ) || button.classList.contains( 'checkout' ) || button.classList.contains( 'wc-forward' ) )
			) {
				type = 'cart';
			}

			currentMode = type || 'cart';
			window.TrizyncPopCartCurrentMode = currentMode;
			if ( currentMode !== 'product' ) {
				productCheckoutPrepared = false;
			}

			if ( type === 'product' ) {
				var qty = button.getAttribute( 'data-quantity' ) || '1';
				var productId = button.getAttribute( 'data-product-id' ) || '0';

				currentProductId = parseInt( productId, 10 ) || 0;
				currentProductQty = parseInt( qty, 10 ) || 1;
				productCheckoutPrepared = false;
				productCheckoutPreparing = false;
				currentProductData = null;
				currentVariationId = 0;
				currentVariationAttributes = {};
				currentVariationData = null;

				if ( currentProductId ) {
					if (
						productCheckoutPrepared &&
						preparedProductId === currentProductId &&
						preparedProductQty === currentProductQty
					) {
						return;
					}
					if ( productCheckoutPreparing ) {
						return;
					}
					productCheckoutPreparing = true;
					$.post(
						TrizyncPopCart.ajaxUrl,
						{
							action: 'trizync_pop_cart_prepare_product_checkout',
							nonce: TrizyncPopCart.nonce,
							product_id: currentProductId,
							quantity: currentProductQty,
							variation_id: currentVariationId || 0,
							attributes: currentVariationAttributes && Object.keys( currentVariationAttributes ).length ? JSON.stringify( currentVariationAttributes ) : ''
						}
					).done( function( response ) {
						if ( response && response.success ) {
							productCheckoutPrepared = true;
							preparedProductId = currentProductId;
							preparedProductQty = currentProductQty;
							renderCart( response.data );
							triggerAddedToCart( response.data );
						}
					} ).always( function() {
						productCheckoutPreparing = false;
					} );
				}
			}

			if ( cart ) {
				cart.hidden = false;
			}

			if ( type === 'cart' || type === 'product' ) {
				fetchCart();
			}
		}

		function isCheckoutUrl( href ) {
			if ( ! href ) {
				return false;
			}
			return href.indexOf( '/checkout' ) !== -1;
		}

		function findCheckoutAnchor( target ) {
			if ( ! target || ! target.closest ) {
				return null;
			}
			var anchor = target.closest( 'a' );
			if ( ! anchor ) {
				return null;
			}
			if ( isCheckoutUrl( anchor.getAttribute( 'href' ) || '' ) ) {
				return anchor;
			}
			return null;
		}

		document.addEventListener(
			'click',
			function( event ) {
				if ( isCheckoutPage() ) {
					return;
				}
				var popup = getPopup();
				if ( ! popup ) {
					return;
				}
				var anchor = findCheckoutAnchor( event.target );
				if ( ! anchor ) {
					return;
				}
				if ( anchor.getAttribute( 'data-trizync-pop-cart-open' ) ) {
					return;
				}
				event.preventDefault();
				event.stopImmediatePropagation();
				updateContext( anchor );
				openPopup();
			},
			true
		);

		document.addEventListener(
			'submit',
			function( event ) {
				if ( isCheckoutPage() ) {
					return;
				}
				var popup = getPopup();
				if ( ! popup ) {
					return;
				}
				var form = event.target;
				if ( ! form || ! form.getAttribute ) {
					return;
				}
				if ( form.closest && form.closest( '#trizync-pop-cart' ) ) {
					return;
				}
				var action = form.getAttribute( 'action' ) || '';
				if ( ! isCheckoutUrl( action ) ) {
					return;
				}
				event.preventDefault();
				event.stopImmediatePropagation();
				var submitter = event.submitter || form;
				updateContext( submitter, 'cart' );
				openPopup();
			},
			true
		);

		$( document ).on( 'click', '[data-trizync-pop-cart-open]', function( event ) {
			if ( isCheckoutPage() ) {
				return;
			}
			event.preventDefault();
			updateContext( this );
			openPopup();
		} );

		$( document ).on( 'click', 'a', function( event ) {
			if ( isCheckoutPage() ) {
				return;
			}
			var href = this.getAttribute( 'href' ) || '';
			if ( ! href ) {
				return;
			}

			var isCheckout = href.indexOf( '/checkout' ) !== -1;

			if ( ! isCheckout ) {
				return;
			}

			if ( this.getAttribute( 'data-trizync-pop-cart-open' ) ) {
				return;
			}

			event.preventDefault();
			updateContext( this );
			openPopup();
		} );

		$( document ).on( 'click', '.checkout-button', function( event ) {
			if ( isCheckoutPage() ) {
				return;
			}
			event.preventDefault();
			updateContext( this );
			openPopup();
		} );

		$( document ).on( 'click', '.trizync-pop-cart__cta', function( event ) {
			var popup = getPopup();
			if ( ! popup ) {
				return;
			}
			var ctaButton = this;
			var form = popup.querySelector( 'form.woocommerce-checkout' );
			if ( ! form ) {
				return;
			}
			event.preventDefault();
			emitPopcartHook( 'popcart:checkout:attempt', buildHookPayload( 'popcart:checkout:attempt' ) );
			if ( this.disabled ) {
				var errors = collectValidationErrors( form );
				emitPopcartHook( 'popcart:checkout:blocked', buildHookPayload( 'popcart:checkout:blocked', { errors: errors } ) );
				return;
			}
			var placeOrder = popup.querySelector( '[data-trizync-pop-cart-place-order]' );
			if ( placeOrder ) {
				placeOrder.value = '1';
			}
			if ( currentMode === 'product' && currentProductId && ! productCheckoutPrepared ) {
				setCtaLoading( ctaButton, true );
				$.post(
					TrizyncPopCart.ajaxUrl,
					{
						action: 'trizync_pop_cart_prepare_product_checkout',
						nonce: TrizyncPopCart.nonce,
						product_id: currentProductId,
						quantity: currentProductQty,
						variation_id: currentVariationId || 0,
						attributes: currentVariationAttributes && Object.keys( currentVariationAttributes ).length ? JSON.stringify( currentVariationAttributes ) : ''
					}
				).done( function( response ) {
					if ( response && response.success ) {
						productCheckoutPrepared = true;
						submitCheckoutForm( form, ctaButton );
					}
					fetchNotices();
					if ( ! response || ! response.success ) {
						setCtaLoading( ctaButton, false );
					}
				} );
				return;
			}

			submitCheckoutForm( form, ctaButton );
			fetchNotices();
		} );

		$( document ).on( 'click', '.trizync-pop-cart__qty-btn', function() {
			var action = this.getAttribute( 'data-qty-action' );
			var scope = this.getAttribute( 'data-qty-scope' ) || 'cart';
			if ( ! action ) {
				return;
			}

			if ( scope === 'product' ) {
				var productValue = document.querySelector( '.trizync-pop-cart__qty-value[data-qty-scope="product"]' );
				if ( ! productValue ) {
					return;
				}
				var currentProduct = parseInt( productValue.textContent, 10 );
				if ( ! currentProduct || currentProduct < 1 ) {
					currentProduct = 1;
				}
				var nextProduct = action === 'increase' ? currentProduct + 1 : currentProduct - 1;
				if ( nextProduct < 1 ) {
					return;
				}
				productValue.textContent = nextProduct;
				currentProductQty = nextProduct;
				triggerCheckoutEvent( 'update_checkout' );
				emitPopcartHook( 'popcart:update_checkout', buildHookPayload( 'popcart:update_checkout' ) );
				fetchCart( false );
				return;
			}

			var key = this.getAttribute( 'data-cart-item-key' );
			if ( ! key ) {
				return;
			}

			var valueEl = document.querySelector( '.trizync-pop-cart__qty-value[data-cart-item-key="' + key + '"]' );
			if ( ! valueEl ) {
				return;
			}

			var current = parseInt( valueEl.textContent, 10 );
			if ( ! current || current < 1 ) {
				current = 1;
			}

			var next = action === 'increase' ? current + 1 : current - 1;
			if ( next < 1 ) {
				return;
			}

			valueEl.textContent = next;
			triggerCheckoutEvent( 'update_checkout' );
			emitPopcartHook( 'popcart:update_checkout', buildHookPayload( 'popcart:update_checkout' ) );
			updateCartItem( key, next );
		} );

		function extractProductId( trigger ) {
			if ( ! trigger ) {
				return 0;
			}
			var id = 0;
			if ( trigger.getAttribute ) {
				var dataId = trigger.getAttribute( 'data-product_id' ) || trigger.getAttribute( 'data-product-id' );
				if ( dataId ) {
					id = parseInt( dataId, 10 ) || 0;
				}
				if ( ! id ) {
					var valueId = trigger.getAttribute( 'value' );
					if ( valueId && /^\d+$/.test( valueId ) ) {
						id = parseInt( valueId, 10 ) || 0;
					}
				}
				if ( ! id ) {
					var href = trigger.getAttribute( 'href' );
					if ( href && href.indexOf( 'add-to-cart=' ) !== -1 ) {
						var match = href.match( /add-to-cart=(\d+)/ );
						if ( match && match[1] ) {
							id = parseInt( match[1], 10 ) || 0;
						}
					}
				}
			}
			if ( ! id && trigger.closest ) {
				var parent = trigger.closest( '[data-product_id],[data-product-id]' );
				if ( parent ) {
					var parentId = parent.getAttribute( 'data-product_id' ) || parent.getAttribute( 'data-product-id' );
					if ( parentId ) {
						id = parseInt( parentId, 10 ) || 0;
					}
				}
			}
			return id;
		}

		function handleAddToCartTrigger( trigger ) {
			if ( ! trigger ) {
				return false;
			}
			if ( ! window.TrizyncPopCart || ! TrizyncPopCart.replaceAddToCart ) {
				return false;
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
			var productId = 0;
			var qty = 1;
			var variationId = 0;
			var attributes = {};
			if ( form ) {
				var addInput = form.querySelector( '[name="add-to-cart"]' );
				if ( addInput ) {
					productId = parseInt( addInput.value, 10 ) || 0;
				}
				if ( ! productId ) {
					var productInput = form.querySelector( '[name="product_id"]' );
					if ( productInput ) {
						productId = parseInt( productInput.value, 10 ) || 0;
					}
				}
				var variationInput = form.querySelector( '[name="variation_id"]' );
				if ( variationInput ) {
					variationId = parseInt( variationInput.value, 10 ) || 0;
				}
				var qtyInput = form.querySelector( 'input.qty' );
				if ( qtyInput ) {
					qty = parseInt( qtyInput.value, 10 ) || 1;
				}
				var attrInputs = form.querySelectorAll( '[name^="attribute_"]' );
				attrInputs.forEach( function( input ) {
					if ( input.value ) {
						attributes[ normalizeAttributeKey( input.name ) ] = input.value;
					}
				} );
			}

			if ( ! productId ) {
				productId = extractProductId( trigger );
			}
			if ( ! productId ) {
				var globalAdd = document.querySelector( 'input[name="add-to-cart"]' );
				if ( globalAdd && globalAdd.value ) {
					productId = parseInt( globalAdd.value, 10 ) || 0;
				}
			}
			if ( ! productId ) {
				var globalProduct = document.querySelector( 'input[name="product_id"]' );
				if ( globalProduct && globalProduct.value ) {
					productId = parseInt( globalProduct.value, 10 ) || 0;
				}
			}
			if ( trigger.getAttribute ) {
				var dataQty = trigger.getAttribute( 'data-quantity' );
				if ( dataQty ) {
					qty = parseInt( dataQty, 10 ) || 1;
				}
			}

			if ( ! productId ) {
				return false;
			}

			currentProductId = productId;
			currentProductQty = qty;
			currentMode = 'product';
			window.TrizyncPopCartCurrentMode = 'product';
			productCheckoutPrepared = false;
			productCheckoutPreparing = false;
			currentProductData = null;
			currentVariationId = variationId || 0;
			currentVariationAttributes = attributes || {};
			currentVariationData = null;
			openPopup();
			fetchCart();
			return true;
		}

		$( document ).on( 'click', '.add_to_cart_button, .single_add_to_cart_button, form.cart button[type="submit"]', function( event ) {
			if ( ! window.TrizyncPopCart || ! TrizyncPopCart.replaceAddToCart ) {
				return;
			}
			if ( handleAddToCartTrigger( this ) ) {
				event.preventDefault();
				event.stopImmediatePropagation();
			}
		} );

		document.addEventListener(
			'click',
			function( event ) {
				if ( ! window.TrizyncPopCart || ! TrizyncPopCart.replaceAddToCart ) {
					return;
				}
				var target = event.target;
				if ( ! target || ! target.closest ) {
					return;
				}
				var button = target.closest( 'form.cart button[type="submit"], .single_add_to_cart_button, .add_to_cart_button' );
				if ( ! button ) {
					return;
				}
				if ( handleAddToCartTrigger( button ) ) {
					event.preventDefault();
					event.stopImmediatePropagation();
				}
			},
			true
		);

		document.addEventListener(
			'submit',
			function( event ) {
				if ( ! window.TrizyncPopCart || ! TrizyncPopCart.replaceAddToCart ) {
					return;
				}
				var form = event.target;
				if ( ! form || ! form.classList || ! form.classList.contains( 'cart' ) ) {
					return;
				}
				var trigger = event.submitter || form.querySelector( '.single_add_to_cart_button' ) || form.querySelector( 'button[type="submit"]' );
				if ( handleAddToCartTrigger( trigger || form ) ) {
					event.preventDefault();
					event.stopImmediatePropagation();
				}
			},
			true
		);

		$( document ).on( 'click', '.trizync-pop-cart__cart-remove', function() {
			var key = this.getAttribute( 'data-cart-item-key' );
			if ( ! key ) {
				return;
			}
			triggerCheckoutEvent( 'update_checkout' );
			emitPopcartHook( 'popcart:update_checkout', buildHookPayload( 'popcart:update_checkout' ) );
			removeCartItem( key );
		} );

		$( document ).on( 'change', 'input[name="trizync_pop_cart_shipping"]', function() {
			if ( ! this.value ) {
				return;
			}
			var popup = getPopup();
			if ( popup ) {
				var hidden = popup.querySelector( '[data-trizync-pop-cart-shipping-input]' );
				if ( hidden ) {
					hidden.value = this.value;
				}
			}
			setShippingMethod( this.value );
			triggerCheckoutEvent( 'update_checkout' );
			emitPopcartHook( 'popcart:update_checkout', buildHookPayload( 'popcart:update_checkout', { selection: getSelectionData() } ) );
		} );

		$( document ).on( 'change', 'input[name="trizync_pop_cart_payment"]', function() {
			if ( ! this.value ) {
				return;
			}
			var popup = getPopup();
			if ( popup ) {
				var hidden = popup.querySelector( '[data-trizync-pop-cart-payment-input]' );
				if ( hidden ) {
					hidden.value = this.value;
				}
			}
			setPaymentMethod( this.value );
			triggerCheckoutEvent( 'update_checkout' );
			emitPopcartHook( 'popcart:update_checkout', buildHookPayload( 'popcart:update_checkout', { selection: getSelectionData() } ) );
		} );

		$( document ).on( 'click', '[data-trizync-pop-cart-coupon-apply]', function() {
			var popup = getPopup();
			if ( ! popup ) {
				return;
			}
			var input = popup.querySelector( '[data-trizync-pop-cart-coupon-input]' );
			if ( ! input ) {
				return;
			}
			var code = ( input.value || '' ).trim();
			if ( ! code ) {
				showCouponError( 'Please enter a coupon code.' );
				return;
			}
			applyCoupon( code );
		} );

		$( document ).on( 'keydown', '[data-trizync-pop-cart-coupon-input]', function( event ) {
			if ( event.key === 'Enter' ) {
				event.preventDefault();
				var code = ( this.value || '' ).trim();
				if ( code ) {
					applyCoupon( code );
				} else {
					showCouponError( 'Please enter a coupon code.' );
				}
			}
		} );

		$( document ).on( 'click', '[data-trizync-pop-cart-coupon-remove]', function() {
			var code = this.getAttribute( 'data-coupon-code' ) || '';
			if ( ! code ) {
				return;
			}
			removeCoupon( code );
		} );

		$( document ).on( 'input change', '#trizync-pop-cart form.woocommerce-checkout [name^="billing_"], #trizync-pop-cart form.woocommerce-checkout [name^="shipping_"]', function() {
			scheduleCustomerUpdate();
		} );

		$( document ).on( 'change', '[data-trizync-pop-cart-variation-select]', function() {
			if ( ! currentProductData || ! currentProductData.attributes ) {
				return;
			}
			var key = this.getAttribute( 'data-variation-key' );
			if ( ! key ) {
				return;
			}
			if ( this.value ) {
				currentVariationAttributes[ key ] = this.value;
			} else {
				delete currentVariationAttributes[ key ];
			}
			var isComplete = isVariationSelectionComplete( currentProductData, currentVariationAttributes );
			var match = isComplete ? findMatchingVariation( currentProductData, currentVariationAttributes ) : null;
			currentVariationData = match;
			currentVariationId = match ? match.id : 0;
			var popup = getPopup();
			if ( popup ) {
				var error = popup.querySelector( '[data-trizync-pop-cart-variation-error]' );
				if ( error ) {
					if ( ! currentVariationId ) {
						error.textContent = 'Please select product options.';
						error.hidden = false;
					} else if ( match && ( match.is_in_stock === false || match.is_purchasable === false ) ) {
						error.textContent = 'Selected variation is unavailable.';
						error.hidden = false;
					} else {
						error.hidden = true;
					}
				}
			}
			updateCtaState();
			if ( currentMode === 'product' && currentVariationId ) {
				fetchCart( false );
			}
		} );

		$( document ).on( 'input change', '.woocommerce-checkout input, .woocommerce-checkout select, .woocommerce-checkout textarea', function() {
			updateCtaState();
		} );

		$( document ).on( 'click', '[data-trizync-pop-cart-close]', function( event ) {
			event.preventDefault();
			closePopup();
			emitPopcartHook( 'popcart:close', buildHookPayload( 'popcart:close' ) );
			if ( currentMode === 'product' && productCheckoutPrepared ) {
				$.post(
					TrizyncPopCart.ajaxUrl,
					{
						action: 'trizync_pop_cart_restore_cart',
						nonce: TrizyncPopCart.nonce
					}
				).always( function() {
					productCheckoutPrepared = false;
					emitPopcartHook( 'popcart:cleanup', buildHookPayload( 'popcart:cleanup', { cart_restored: true } ) );
				} );
			} else {
				emitPopcartHook( 'popcart:cleanup', buildHookPayload( 'popcart:cleanup', { cart_restored: false } ) );
			}
		} );

		function submitCheckoutForm( form, ctaButton ) {
			var popup = getPopup();
			var noticesWrap = popup ? popup.querySelector( '.woocommerce-notices-wrapper' ) : null;
			if ( ctaButton ) {
				setCtaLoading( ctaButton, true );
			}
			emitPopcartHook( 'popcart:checkout:submit', buildHookPayload( 'popcart:checkout:submit', { selection: getSelectionData() } ) );
			var actionUrl = '';
			if ( window.wc_checkout_params && wc_checkout_params.checkout_url ) {
				actionUrl = wc_checkout_params.checkout_url;
			} else if ( window.wc_checkout_params && wc_checkout_params.wc_ajax_url ) {
				actionUrl = wc_checkout_params.wc_ajax_url.toString().replace( '%%endpoint%%', 'checkout' );
			} else if ( form && form.action ) {
				try {
					var url = new URL( form.action, window.location.origin );
					url.searchParams.set( 'wc-ajax', 'checkout' );
					actionUrl = url.toString();
				} catch ( e ) {
					actionUrl = form.action;
				}
			}

			if ( ! actionUrl ) {
				if ( typeof form.requestSubmit === 'function' ) {
					form.requestSubmit();
				} else {
					form.submit();
				}
				return;
			}

			var formData = $( form ).serialize();
			$.ajax( {
				type: 'POST',
				url: actionUrl,
				data: formData,
				dataType: 'json',
				success: function( response ) {
					if ( response && response.result === 'success' && response.redirect ) {
						emitPopcartHook( 'popcart:checkout:success', buildHookPayload( 'popcart:checkout:success', { order_id: response.order_id || null, redirect: response.redirect } ) );
						window.location = response.redirect;
						return;
					}
					if ( noticesWrap && response && response.messages ) {
						noticesWrap.innerHTML = response.messages;
					}
					if ( ctaButton ) {
						setCtaLoading( ctaButton, false );
					}
					triggerCheckoutEvent( 'checkout_error' );
					emitPopcartHook( 'popcart:checkout_error', buildHookPayload( 'popcart:checkout_error', { errors: [ { message: response && response.messages ? response.messages : 'Checkout failed' } ] } ) );
					emitPopcartHook( 'popcart:checkout:error', buildHookPayload( 'popcart:checkout:error', { errors: [ { message: response && response.messages ? response.messages : 'Checkout failed' } ] } ) );
				},
				error: function( xhr ) {
					if ( noticesWrap && xhr && xhr.responseText ) {
						noticesWrap.innerHTML = xhr.responseText;
					}
					if ( ctaButton ) {
						setCtaLoading( ctaButton, false );
					}
					triggerCheckoutEvent( 'checkout_error' );
					emitPopcartHook( 'popcart:checkout_error', buildHookPayload( 'popcart:checkout_error', { errors: [ { message: xhr && xhr.responseText ? xhr.responseText : 'Checkout failed' } ] } ) );
					emitPopcartHook( 'popcart:checkout:error', buildHookPayload( 'popcart:checkout:error', { errors: [ { message: xhr && xhr.responseText ? xhr.responseText : 'Checkout failed' } ] } ) );
				}
			} );
		}

		function setCtaLoading( button, isLoading ) {
			if ( ! button ) {
				return;
			}
			if ( isLoading ) {
				button.disabled = true;
				if ( ! button.getAttribute( 'data-label' ) ) {
					button.setAttribute( 'data-label', button.textContent );
				}
				button.textContent = 'Processing…';
			} else {
				button.disabled = false;
				var label = button.getAttribute( 'data-label' );
				if ( label ) {
					button.textContent = label;
				}
			}
		}
	} );

})( jQuery );
