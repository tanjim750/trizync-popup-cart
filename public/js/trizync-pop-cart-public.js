(function( $ ) {
	'use strict';

	function getPopup() {
		return document.getElementById( 'trizync-pop-cart' );
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

	function openPopup() {
		var popup = getPopup();
		if ( ! popup ) {
			return;
		}
		applyPopupBranding();
		popup.classList.add( 'is-open' );
		popup.setAttribute( 'aria-hidden', 'false' );
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

		var isFetchingCart = false;
		var currentMode = 'cart';
		var currentProductId = 0;
		var currentProductQty = 1;

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
			var overlay = popup.querySelector( '[data-trizync-pop-cart-overlay]' );
			var paymentWrap = popup.querySelector( '[data-trizync-pop-cart-payment]' );
			var paymentEmpty = popup.querySelector( '[data-trizync-pop-cart-payment-empty]' );
			var paymentList = popup.querySelector( '[data-trizync-pop-cart-payment-list]' );
			var cta = popup.querySelector( '.trizync-pop-cart__cta' );

			if ( ! list || ! empty || ! totals || ! subtotal || ! total || ! shippingRow || ! shippingTotal || ! cartLabel || ! overlay || ! paymentWrap || ! paymentEmpty || ! paymentList ) {
				return;
			}

			overlay.hidden = true;
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
				renderShipping( null );
				return;
			}

			payload.items.forEach( function( item ) {
				var li = document.createElement( 'li' );
				li.className = 'trizync-pop-cart__cart-item';

				var left = document.createElement( 'div' );
				var name = document.createElement( 'span' );
				name.className = 'trizync-pop-cart__cart-name';
				name.textContent = item.name;
				left.appendChild( name );

				var qtyWrap = document.createElement( 'div' );
				qtyWrap.className = 'trizync-pop-cart__cart-qty';

				var qtyLabel = document.createElement( 'span' );
				qtyLabel.className = 'trizync-pop-cart__cart-qty-label';
				qtyLabel.textContent = 'Qty';
				qtyWrap.appendChild( qtyLabel );

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
			if ( cta ) {
				cta.disabled = false;
			}
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
			} else {
				payload.action = 'trizync_pop_cart_get_cart';
			}

			$.post( TrizyncPopCart.ajaxUrl, payload )
				.done( function( response ) {
				if ( response && response.success && response.data ) {
					renderCart( response.data );
				}
				var popup = getPopup();
				if ( popup ) {
					var overlay = popup.querySelector( '[data-trizync-pop-cart-overlay]' );
					if ( overlay ) {
						overlay.hidden = true;
					}
				}
			} )
			.always( function() {
				var popup = getPopup();
				if ( popup ) {
					var overlay = popup.querySelector( '[data-trizync-pop-cart-overlay]' );
					if ( overlay ) {
						overlay.hidden = true;
					}
				}
				isFetchingCart = false;
			} );
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

			if ( type === 'product' ) {
				var qty = button.getAttribute( 'data-quantity' ) || '1';
				var productId = button.getAttribute( 'data-product-id' ) || '0';

				currentProductId = parseInt( productId, 10 ) || 0;
				currentProductQty = parseInt( qty, 10 ) || 1;
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
			event.preventDefault();
			updateContext( this );
			openPopup();
		} );

		$( document ).on( 'click', 'a', function( event ) {
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
			event.preventDefault();
			updateContext( this );
			openPopup();
		} );

		$( document ).on( 'click', '.trizync-pop-cart__cta', function( event ) {
			var popup = getPopup();
			if ( ! popup ) {
				return;
			}
			var form = popup.querySelector( 'form.woocommerce-checkout' );
			if ( ! form ) {
				return;
			}
			if ( this.disabled ) {
				event.preventDefault();
				return;
			}
			event.preventDefault();
			var placeOrder = popup.querySelector( '[data-trizync-pop-cart-place-order]' );
			if ( placeOrder ) {
				placeOrder.value = '1';
			}
			if ( typeof form.requestSubmit === 'function' ) {
				form.requestSubmit();
			} else {
				form.submit();
			}
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
			updateCartItem( key, next );
		} );

		$( document ).on( 'click', '.trizync-pop-cart__cart-remove', function() {
			var key = this.getAttribute( 'data-cart-item-key' );
			if ( ! key ) {
				return;
			}
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
		} );

		$( document ).on( 'click', '[data-trizync-pop-cart-close]', function( event ) {
			event.preventDefault();
			closePopup();
		} );
	} );

})( jQuery );
