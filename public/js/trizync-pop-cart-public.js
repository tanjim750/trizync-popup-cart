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

	function triggerCheckoutEvent( name, args ) {
		if ( typeof jQuery === 'undefined' ) {
			return;
		}
		jQuery( document.body ).trigger( name, args || [] );
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
		var lastLoaded = parseInt( checkoutWrap.getAttribute( 'data-loaded-ts' ) || '0', 10 ) || 0;
		var now = Date.now();
		var isFresh = loaded && ( now - lastLoaded < 20000 );
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
				if ( typeof updateCtaState === 'function' ) {
					updateCtaState();
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
			}
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
			triggerCheckoutEvent( 'woocommerce_before_checkout_form' );
			triggerCheckoutEvent( 'woocommerce_checkout_before_customer_details' );
			triggerCheckoutEvent( 'woocommerce_checkout_billing' );
			triggerCheckoutEvent( 'woocommerce_checkout_shipping' );
			triggerCheckoutEvent( 'woocommerce_checkout_after_customer_details' );
			triggerCheckoutEvent( 'woocommerce_checkout_before_order_review' );
			triggerCheckoutEvent( 'woocommerce_checkout_order_review' );
			triggerCheckoutEvent( 'woocommerce_checkout_after_order_review' );
			triggerCheckoutEvent( 'woocommerce_after_checkout_form' );
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
		var lastItemCount = 0;
		var productCheckoutPrepared = false;
		var productCheckoutPreparing = false;
		var preparedProductId = 0;
		var preparedProductQty = 0;

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

			lastItemCount = payload && payload.itemCount ? payload.itemCount : 0;
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
			triggerCheckoutEvent( 'updated_checkout', [ payload ] );
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
				cta.disabled = true;
				return;
			}

			if ( lastItemCount < 1 ) {
				cta.disabled = true;
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
							quantity: currentProductQty
						}
					).done( function( response ) {
						if ( response && response.success ) {
							productCheckoutPrepared = true;
							preparedProductId = currentProductId;
							preparedProductQty = currentProductQty;
							renderCart( response.data );
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
			var ctaButton = this;
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
			if ( currentMode === 'product' && currentProductId && ! productCheckoutPrepared ) {
				setCtaLoading( ctaButton, true );
				$.post(
					TrizyncPopCart.ajaxUrl,
					{
						action: 'trizync_pop_cart_prepare_product_checkout',
						nonce: TrizyncPopCart.nonce,
						product_id: currentProductId,
						quantity: currentProductQty
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
			updateCartItem( key, next );
		} );

		$( document ).on( 'click', '.trizync-pop-cart__cart-remove', function() {
			var key = this.getAttribute( 'data-cart-item-key' );
			if ( ! key ) {
				return;
			}
			triggerCheckoutEvent( 'update_checkout' );
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
		} );

		$( document ).on( 'input change', '.woocommerce-checkout input, .woocommerce-checkout select, .woocommerce-checkout textarea', function() {
			updateCtaState();
		} );

		$( document ).on( 'click', '[data-trizync-pop-cart-close]', function( event ) {
			event.preventDefault();
			closePopup();
			if ( currentMode === 'product' && productCheckoutPrepared ) {
				$.post(
					TrizyncPopCart.ajaxUrl,
					{
						action: 'trizync_pop_cart_restore_cart',
						nonce: TrizyncPopCart.nonce
					}
				).always( function() {
					productCheckoutPrepared = false;
				} );
			}
		} );

		function submitCheckoutForm( form, ctaButton ) {
			var popup = getPopup();
			var noticesWrap = popup ? popup.querySelector( '.woocommerce-notices-wrapper' ) : null;
			if ( ctaButton ) {
				setCtaLoading( ctaButton, true );
			}
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
				},
				error: function( xhr ) {
					if ( noticesWrap && xhr && xhr.responseText ) {
						noticesWrap.innerHTML = xhr.responseText;
					}
					if ( ctaButton ) {
						setCtaLoading( ctaButton, false );
					}
					triggerCheckoutEvent( 'checkout_error' );
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
