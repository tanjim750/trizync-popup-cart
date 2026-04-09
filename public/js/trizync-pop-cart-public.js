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
		if ( document.querySelector( 'form.woocommerce-checkout' ) ) {
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
		if ( typeof window.TrizyncPopCartUpdateCheckoutReady === 'function' ) {
			window.TrizyncPopCartUpdateCheckoutReady();
		}
	}

	function hasFreshCheckoutForm() {
		var popup = getPopup();
		if ( ! popup ) {
			return false;
		}
		var checkoutWrap = popup.querySelector( '[data-trizync-pop-cart-checkout]' );
		if ( ! checkoutWrap ) {
			return false;
		}
		var loaded = checkoutWrap.getAttribute( 'data-loaded' ) === '1';
		var hasHtml = checkoutWrap.innerHTML && checkoutWrap.innerHTML.trim().length > 0;
		var lastLoaded = parseInt( checkoutWrap.getAttribute( 'data-loaded-ts' ) || '0', 10 ) || 0;
		var now = Date.now();
		return loaded && hasHtml && ( now - lastLoaded < 20000 );
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
			maybeEmitCheckoutHooks();
			if ( typeof updateCtaState === 'function' ) {
				updateCtaState();
			}
			syncHiddenSelections();
			return;
		}

		if ( ! loaded ) {
			setLoadingFlag( popup, 'checkout', true );
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
				maybeEmitCheckoutHooks();
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
			if ( ! loaded ) {
				setLoadingFlag( popup, 'checkout', false );
			}
		} );
	}

	function refreshOverlayState( popup ) {
		if ( ! popup ) {
			return;
		}
		var overlay = popup.querySelector( '[data-trizync-pop-cart-overlay]' );
		if ( ! overlay ) {
			return;
		}
		var isLoading =
			popup.hasAttribute( 'data-cart-loading' ) ||
			popup.hasAttribute( 'data-checkout-loading' ) ||
			popup.hasAttribute( 'data-notices-loading' );
		overlay.hidden = ! isLoading;
	}

	function setLoadingFlag( popup, key, isLoading ) {
		if ( ! popup || ! key ) {
			return;
		}
		var attr = 'data-' + key + '-loading';
		if ( isLoading ) {
			popup.setAttribute( attr, '1' );
		} else {
			popup.removeAttribute( attr );
		}
		refreshOverlayState( popup );
	}

	function maybeEmitCheckoutHooks() {
		var popup = getPopup();
		if ( ! popup ) {
			return;
		}
		var popupMode = window.TrizyncPopCartCurrentMode || 'cart';
		var now = Date.now();
		var modeKey = popupMode === 'product' ? 'product' : 'cart';
		var storageKey = 'trizync_pop_cart_init_ts_' + modeKey;
		var lastInit = parseInt( window.sessionStorage ? sessionStorage.getItem( storageKey ) : '0', 10 ) || 0;
		if ( now - lastInit <= 20000 ) {
			return;
		}
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

	function openPopup() {
		var popup = getPopup();
		if ( ! popup ) {
			return;
		}
		showScriptError( '' );
		window.TrizyncPopCartWarmSession();
		if ( ! hasFreshCheckoutForm() ) {
			popup.removeAttribute( 'data-validation-ready' );
		}
		emitPopcartHook( 'popcart:open:start', {} );
		applyPopupBranding();
		popup.classList.add( 'is-open' );
		popup.setAttribute( 'aria-hidden', 'false' );
		var popupMode = window.TrizyncPopCartCurrentMode || 'cart';
		loadCheckoutForm();
		if ( typeof fetchCart === 'function' && ( popupMode === 'cart' || popupMode === 'product' ) && ! productCheckoutPreparing ) {
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
		if ( typeof window.TrizyncPopCartWarmSession === 'function' ) {
			window.TrizyncPopCartWarmSession();
		}
		setTimeout( function() {
			if ( typeof loadCheckoutForm === 'function' ) {
				loadCheckoutForm();
			}
		}, 300 );

		function ensureZyncopsProductAttributes() {
			var nodes = document.querySelectorAll( 'a[href*="add-to-cart="]' );
			nodes.forEach( function( node ) {
				if ( ! node || ! node.getAttribute ) {
					return;
				}
				var href = node.getAttribute( 'href' ) || '';
				var match = href.match( /[?&]add-to-cart=(\d+)/ );
				if ( ! match || ! match[1] ) {
					return;
				}
				var productId = parseInt( match[1], 10 ) || 0;
				if ( ! productId ) {
					return;
				}
				if ( ! node.getAttribute( 'data-zyncops-post-data-id' ) ) {
					node.setAttribute( 'data-zyncops-post-data-id', productId.toString() );
				}
				if ( ! node.getAttribute( 'data-trizync-pop-cart-open' ) ) {
					node.setAttribute( 'data-trizync-pop-cart-open', 'product' );
				}
			} );
		}

		ensureZyncopsProductAttributes();

		var isFetchingCart = false;
		var currentMode = 'cart';
		var currentProductId = 0;
		var currentProductQty = 1;
		var lastItemCount = 0;
		var productCheckoutPrepared = false;
		var productCheckoutPreparing = false;
		var productCheckoutRestoreOnClose = true;
		var preparedProductId = 0;
		var preparedProductQty = 0;
		var lastCartPayload = null;
		var currentProductData = null;
		var currentVariationId = 0;
		var currentVariationAttributes = {};
		var currentVariationData = null;
		var lastTriggerEl = null;
		var holdNotices = false;
		var pendingCheckoutError = false;
		var fallbackCheckoutError = 'We were unable to process your order. Please check your details and try again.';
		var sessionWarmed = false;
		var checkoutReady = false;
		var shippingReady = false;
		var paymentReady = false;
		var shippingSetPending = false;
		var paymentSetPending = false;
		var updateCheckoutTimer = null;
		var lastCartErrorTs = 0;
		var lastCartErrorStatus = 0;
		var lastCartErrorAction = '';

		function scheduleUpdateCheckout( payload ) {
			if ( updateCheckoutTimer ) {
				clearTimeout( updateCheckoutTimer );
			}
			updateCheckoutTimer = setTimeout( function() {
				triggerCheckoutEvent( 'update_checkout' );
				emitPopcartHook( 'popcart:update_checkout', buildHookPayload( 'popcart:update_checkout', payload || {} ) );
			}, 350 );
		}

		window.TrizyncPopCartUpdateCheckoutReady = function() {
			var popup = getPopup();
			if ( ! popup ) {
				checkoutReady = false;
				return;
			}
			var form = popup.querySelector( 'form' );
			if ( ! form || ! popup.hasAttribute( 'data-validation-ready' ) ) {
				checkoutReady = false;
				return;
			}
			var nonceField = form.querySelector( 'input[name="woocommerce-process-checkout-nonce"]' );
			if ( ! nonceField || ! nonceField.value ) {
				checkoutReady = false;
				return;
			}
			if ( popup.hasAttribute( 'data-cart-loading' ) || popup.hasAttribute( 'data-checkout-loading' ) || popup.hasAttribute( 'data-notices-loading' ) ) {
				checkoutReady = false;
				return;
			}
			if ( currentMode === 'product' && productCheckoutPreparing ) {
				checkoutReady = false;
				return;
			}
			if ( shippingSetPending || paymentSetPending ) {
				checkoutReady = false;
				return;
			}
			var paymentInput = popup.querySelector( '[data-trizync-pop-cart-payment-input]' );
			var shippingInput = popup.querySelector( '[data-trizync-pop-cart-shipping-input]' );
			if ( ! paymentInput || ! paymentInput.value || ! shippingInput || ! shippingInput.value ) {
				checkoutReady = false;
				return;
			}
			checkoutReady = shippingReady && paymentReady && lastItemCount > 0;
		};

		window.TrizyncPopCartWarmSession = function() {
			if ( sessionWarmed || ! window.TrizyncPopCart ) {
				return;
			}
			sessionWarmed = true;
			$.post(
				TrizyncPopCart.ajaxUrl,
				{
					action: 'trizync_pop_cart_get_cart',
					nonce: TrizyncPopCart.nonce,
					ping: 1
				}
			);
		};

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

			if ( currentMode === 'product' && payload && payload.items && payload.items.length ) {
				var firstItem = payload.items[0];
				var expectedIds = [];
				if ( currentVariationId ) {
					expectedIds.push( parseInt( currentVariationId, 10 ) );
				}
				if ( currentProductId ) {
					expectedIds.push( parseInt( currentProductId, 10 ) );
				}
				if ( firstItem && firstItem.product_id && expectedIds.length ) {
					var itemId = parseInt( firstItem.product_id, 10 );
					if ( expectedIds.indexOf( itemId ) === -1 ) {
						return;
					}
				}
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
			var noticesWrap = popup.querySelector( '.trizync-pop-cart__notices' );

			if ( ! list || ! empty || ! totals || ! subtotal || ! total || ! shippingRow || ! shippingTotal || ! cartLabel || ! overlay || ! paymentWrap || ! paymentEmpty || ! paymentList ) {
				return;
			}
			if ( cartWrap ) {
				cartWrap.hidden = false;
			}

			if ( checkoutWrap && ! checkoutWrap.innerHTML.trim() && ! popup.hasAttribute( 'data-checkout-loading' ) ) {
				loadCheckoutForm();
			}

			refreshOverlayState( popup );
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
			if ( payload && typeof payload.notices !== 'undefined' && noticesWrap && ! holdNotices ) {
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
			var hasItems = payload && payload.items && payload.items.length > 0;
			if ( ! hasItems ) {
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
				renderVariations( payload && payload.product ? payload.product : null );
				renderShipping( payload ? payload.shipping : null );
				renderPayment( payload ? payload.payment : null );
				renderCoupons( payload ? payload.coupons : [] );
				window.TrizyncPopCartUpdateCheckoutReady();
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
			window.TrizyncPopCartUpdateCheckoutReady();
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
					setLoadingFlag( popup, 'cart', true );
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
					refreshOverlayState( popup );
					if ( cta ) {
						cta.disabled = true;
					}
				}
			}

			isFetchingCart = true;
			if ( currentMode === 'product' && ! currentProductId && lastTriggerEl ) {
				var resolved = resolveProductContext( lastTriggerEl );
				if ( resolved.productId ) {
					currentProductId = resolved.productId;
					currentProductQty = resolved.qty || 1;
					currentVariationId = resolved.variationId || 0;
					currentVariationAttributes = resolved.attributes || {};
				}
			}

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
					setLoadingFlag( popup, 'cart', false );
				}
			} )
			.fail( function( xhr ) {
				lastCartErrorTs = Date.now();
				lastCartErrorStatus = xhr && typeof xhr.status !== 'undefined' ? xhr.status : 0;
				lastCartErrorAction = payload.action || '';
				console.log( '[popcart] fetchCart failed', {
					action: lastCartErrorAction,
					status: lastCartErrorStatus
				} );
			} )
			.always( function() {
				var popup = getPopup();
				if ( popup ) {
					setLoadingFlag( popup, 'cart', false );
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
			var form = popup.querySelector( 'form' );
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

		function renderNotices( html ) {
			var popup = getPopup();
			if ( ! popup ) {
				return;
			}
			var noticesWrap = popup.querySelector( '.trizync-pop-cart__notices' );
			if ( ! noticesWrap ) {
				return;
			}
			noticesWrap.innerHTML = html || '';
		}

		function clearNoticeHold() {
			holdNotices = false;
			pendingCheckoutError = false;
		}

		function renderValidationNotices( errors ) {
			if ( ! errors || ! errors.length ) {
				renderNotices( '' );
				return;
			}
			holdNotices = true;
			var items = errors.map( function( err ) {
				return '<li class="trizync-pop-cart__notice-item">' + ( err.message || 'Invalid field' ) + '</li>';
			} ).join( '' );
			var html = '<ul class="trizync-pop-cart__notice-list">' + items + '</ul>';
			renderNotices( html );
		}

		function fetchNotices() {
			if ( ! window.TrizyncPopCart ) {
				return;
			}
			if ( holdNotices ) {
				return;
			}
			var popup = getPopup();
			if ( ! popup ) {
				return;
			}
			var noticesWrap = popup.querySelector( '.trizync-pop-cart__notices' );
			if ( ! noticesWrap ) {
				return;
			}

			setLoadingFlag( popup, 'notices', true );
			$.post(
				TrizyncPopCart.ajaxUrl,
				{
					action: 'trizync_pop_cart_get_notices',
					nonce: TrizyncPopCart.nonce
				}
			).done( function( response ) {
				if ( response && response.success && response.data ) {
					var noticesHtml = response.data.notices || '';
					noticesWrap.innerHTML = noticesHtml;
					if ( pendingCheckoutError && noticesHtml ) {
						pendingCheckoutError = false;
					} else if ( pendingCheckoutError && ! noticesHtml ) {
						renderNotices( '<ul class="trizync-pop-cart__notice-list"><li class="trizync-pop-cart__notice-item">' + fallbackCheckoutError + '</li></ul>' );
						holdNotices = true;
						pendingCheckoutError = false;
					}
				}
			} ).fail( function() {
				if ( pendingCheckoutError ) {
					renderNotices( '<ul class="trizync-pop-cart__notice-list"><li class="trizync-pop-cart__notice-item">' + fallbackCheckoutError + '</li></ul>' );
					holdNotices = true;
					pendingCheckoutError = false;
				}
			} ).always( function() {
				setLoadingFlag( popup, 'notices', false );
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
			var form = popup.querySelector( 'form' );
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
				shippingReady = false;
				window.TrizyncPopCartUpdateCheckoutReady();
				return;
			}

			var selectedId = '';
			var firstId = '';
			shipping.methods.forEach( function( method ) {
				var option = document.createElement( 'label' );
				option.className = 'trizync-pop-cart__shipping-option';

				var input = document.createElement( 'input' );
				input.type = 'radio';
				input.name = 'trizync_pop_cart_shipping';
				input.value = method.id;
				if ( ! firstId ) {
					firstId = method.id;
				}
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

			if ( ! selectedId && firstId ) {
				var firstInput = list.querySelector( 'input[name="trizync_pop_cart_shipping"]' );
				if ( firstInput ) {
					firstInput.checked = true;
					selectedId = firstInput.value;
				}
			}
			if ( hiddenInput ) {
				hiddenInput.value = selectedId;
			}
			empty.hidden = true;
			shippingWrap.hidden = false;
			shippingReady = !! selectedId;
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
				paymentReady = false;
				window.TrizyncPopCartUpdateCheckoutReady();
				return;
			}

			var selectedId = '';
			var firstId = '';
			payment.gateways.forEach( function( gateway ) {
				var option = document.createElement( 'label' );
				option.className = 'trizync-pop-cart__payment-option';

				var input = document.createElement( 'input' );
				input.type = 'radio';
				input.name = 'trizync_pop_cart_payment';
				input.value = gateway.id;
				if ( ! firstId ) {
					firstId = gateway.id;
				}
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

			if ( ! selectedId && firstId ) {
				var firstInput = list.querySelector( 'input[name="trizync_pop_cart_payment"]' );
				if ( firstInput ) {
					firstInput.checked = true;
					selectedId = firstInput.value;
				}
			}
			if ( hiddenInput ) {
				hiddenInput.value = selectedId;
			}
			empty.hidden = true;
			wrap.hidden = false;
			paymentReady = !! selectedId;
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
			paymentSetPending = true;
			if ( typeof window.TrizyncPopCartUpdateCheckoutReady === 'function' ) {
				window.TrizyncPopCartUpdateCheckoutReady();
			}

			$.post(
				TrizyncPopCart.ajaxUrl,
				{
					action: 'trizync_pop_cart_set_payment_method',
					nonce: TrizyncPopCart.nonce,
					payment_method: methodId
				}
			).done( function( response ) {
				if ( currentMode === 'product' ) {
					fetchCart( false );
					return;
				}
				if ( response && response.success && response.data ) {
					renderCart( response.data );
				}
			} ).always( function() {
				paymentSetPending = false;
				if ( typeof window.TrizyncPopCartUpdateCheckoutReady === 'function' ) {
					window.TrizyncPopCartUpdateCheckoutReady();
				}
			} );
		}
		function setShippingMethod( methodId ) {
			if ( ! window.TrizyncPopCart ) {
				return;
			}
			shippingSetPending = true;
			if ( typeof window.TrizyncPopCartUpdateCheckoutReady === 'function' ) {
				window.TrizyncPopCartUpdateCheckoutReady();
			}

			$.post(
				TrizyncPopCart.ajaxUrl,
				{
					action: 'trizync_pop_cart_set_shipping_method',
					nonce: TrizyncPopCart.nonce,
					shipping_method: methodId
				}
			).done( function( response ) {
				if ( currentMode === 'product' ) {
					fetchCart( false );
					return;
				}
				if ( response && response.success && response.data ) {
					renderCart( response.data );
				}
			} ).always( function() {
				shippingSetPending = false;
				if ( typeof window.TrizyncPopCartUpdateCheckoutReady === 'function' ) {
					window.TrizyncPopCartUpdateCheckoutReady();
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
				lastTriggerEl = button;
				var context = resolveProductContext( button );
				currentProductId = context.productId || 0;
				currentProductQty = context.qty || 1;
				productCheckoutPrepared = false;
				productCheckoutPreparing = false;
				productCheckoutRestoreOnClose = false;
				currentProductData = null;
				currentVariationId = context.variationId || 0;
				currentVariationAttributes = context.attributes || {};
				currentVariationData = null;
				prepareProductCheckout( context );
			}

			if ( cart ) {
				cart.hidden = false;
			}
		}

		function prepareProductCheckout( context ) {
			if ( ! window.TrizyncPopCart || ! context || ! context.productId ) {
				return;
			}
			productCheckoutPreparing = true;
			var popup = getPopup();
			if ( popup ) {
				setLoadingFlag( popup, 'cart', true );
			}
			$.post(
				TrizyncPopCart.ajaxUrl,
				{
					action: 'trizync_pop_cart_prepare_product_checkout',
					nonce: TrizyncPopCart.nonce,
					product_id: context.productId,
					quantity: context.qty || 1,
					variation_id: context.variationId || 0,
					attributes: context.attributes && Object.keys( context.attributes ).length ? JSON.stringify( context.attributes ) : '',
					replace_cart_only: 1
				}
			).done( function( response ) {
				productCheckoutPreparing = false;
				if ( response && response.success ) {
					productCheckoutPrepared = true;
					productCheckoutRestoreOnClose = false;
					fetchCart( false );
				} else {
					if ( popup ) {
						setLoadingFlag( popup, 'cart', false );
					}
					if ( typeof fetchNotices === 'function' ) {
						fetchNotices();
					}
				}
			} ).fail( function() {
				productCheckoutPreparing = false;
				if ( popup ) {
					setLoadingFlag( popup, 'cart', false );
				}
			} );
		}

	function isCheckoutUrl( href ) {
		if ( ! href ) {
			return false;
		}
		return href.indexOf( '/checkout' ) !== -1;
	}

	var checkoutSelectors = [
		'.checkout-button',
		'.checkout',
		'.wc-forward',
		'.buy-now',
		'.buy-now-button',
		'.order-now',
		'.order-now-button',
		'.confirm-order',
		'.confirm-order-button'
	];

	var addToCartSelectors = [
		'.add_to_cart_button',
		'.single_add_to_cart_button',
		'.buy-now',
		'.buy-now-button',
		'.order-now',
		'.order-now-button',
		'.confirm-order',
		'.confirm-order-button'
	];

	function parseCustomSelectors( raw ) {
		if ( ! raw ) {
			return [];
		}
		return raw
			.split( /,|\n/ )
			.map( function( item ) { return item.trim(); } )
			.filter( function( item ) { return item.length > 0; } );
	}

	function uniqueSelectors( selectors ) {
		var seen = {};
		return selectors.filter( function( selector ) {
			if ( ! selector || seen[ selector ] ) {
				return false;
			}
			seen[ selector ] = true;
			return true;
		} );
	}

	if ( window.TrizyncPopCart && TrizyncPopCart.customButtonSelectors ) {
		var customList = parseCustomSelectors( TrizyncPopCart.customButtonSelectors );
		if ( customList.length ) {
			checkoutSelectors = uniqueSelectors( checkoutSelectors.concat( customList ) );
			addToCartSelectors = uniqueSelectors( addToCartSelectors.concat( customList ) );
		}
	}

	applyReplaceAddToCartLabels();

	var replaceObserver = null;
	if ( window.MutationObserver ) {
		replaceObserver = new MutationObserver( function( mutations ) {
			mutations.forEach( function( mutation ) {
				mutation.addedNodes.forEach( function( node ) {
					if ( node && node.querySelectorAll ) {
						applyReplaceAddToCartLabels( node );
					}
				} );
			} );
		} );
		replaceObserver.observe( document.documentElement, { childList: true, subtree: true } );
	}

	function findClosestBySelectors( target, selectors ) {
		if ( ! target || ! target.closest ) {
			return null;
		}
		return target.closest( selectors.join( ',' ) );
	}

	function applyReplaceAddToCartLabels( root ) {
		if ( ! window.TrizyncPopCart || ! TrizyncPopCart.replaceAddToCart ) {
			return;
		}
		var label = TrizyncPopCart.replaceAddToCartLabel || '';
		if ( ! label ) {
			return;
		}
		var scope = root || document;
		var targets = scope.querySelectorAll( addToCartSelectors.join( ',' ) );
		targets.forEach( function( el ) {
			if ( ! el || el.getAttribute( 'data-popcart-label-replaced' ) === '1' ) {
				return;
			}
			var span = el.querySelector( '.trizync-pop-cart__label' );
			if ( ! span ) {
				span = document.createElement( 'span' );
				span.className = 'trizync-pop-cart__label';
				el.innerHTML = '';
				el.appendChild( span );
			}
			span.textContent = label;
			el.setAttribute( 'data-popcart-label-replaced', '1' );
		} );
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
				if ( event.target && event.target.closest && event.target.closest( '#trizync-pop-cart' ) ) {
					return;
				}

				var dataTrigger = event.target && event.target.closest ? event.target.closest( '[data-trizync-pop-cart-open]' ) : null;
				if ( dataTrigger ) {
					event.preventDefault();
					event.stopImmediatePropagation();
					updateContext( dataTrigger );
					openPopup();
					return;
				}

				var anchor = findCheckoutAnchor( event.target );
				if ( anchor && ! anchor.getAttribute( 'data-trizync-pop-cart-open' ) ) {
					event.preventDefault();
					event.stopImmediatePropagation();
					updateContext( anchor, 'cart' );
					openPopup();
					return;
				}

				if ( window.TrizyncPopCart && TrizyncPopCart.replaceAddToCart ) {
					var addToCartTrigger = findClosestBySelectors( event.target, addToCartSelectors );
					if ( addToCartTrigger ) {
						if ( handleAddToCartTrigger( addToCartTrigger ) ) {
							event.preventDefault();
							event.stopImmediatePropagation();
							return;
						}
					}
					var cartFormButton = event.target.closest ? event.target.closest( 'form.cart button[type="submit"]' ) : null;
					if ( cartFormButton ) {
						if ( handleAddToCartTrigger( cartFormButton ) ) {
							event.preventDefault();
							event.stopImmediatePropagation();
							return;
						}
					}
				}

				var checkoutTrigger = findClosestBySelectors( event.target, checkoutSelectors );
				if ( checkoutTrigger ) {
					event.preventDefault();
					event.stopImmediatePropagation();
					if ( handleAddToCartTrigger( checkoutTrigger ) ) {
						return;
					}
					updateContext( checkoutTrigger, 'cart' );
					openPopup();
				}
			},
			true
		);

		$( document ).on( 'click', '.trizync-pop-cart__cta', function( event ) {
			var popup = getPopup();
			if ( ! popup ) {
				return;
			}
			var ctaButton = this;
			var form = popup.querySelector( 'form' );
			if ( ! form ) {
				loadCheckoutForm();
				renderNotices( '<ul class="trizync-pop-cart__notice-list"><li class="trizync-pop-cart__notice-item">Please wait while we prepare checkout.</li></ul>' );
				return;
			}
			event.preventDefault();
			emitPopcartHook( 'popcart:checkout:attempt', buildHookPayload( 'popcart:checkout:attempt' ) );
			clearNoticeHold();
			syncHiddenSelections();
			if ( ! popup.hasAttribute( 'data-validation-ready' ) ) {
				loadCheckoutForm();
				renderNotices( '<ul class="trizync-pop-cart__notice-list"><li class="trizync-pop-cart__notice-item">Please wait while we prepare checkout.</li></ul>' );
				return;
			}
			var nonceField = form.querySelector( 'input[name="woocommerce-process-checkout-nonce"]' );
			if ( ! nonceField || ! nonceField.value ) {
				loadCheckoutForm();
				renderNotices( '<ul class="trizync-pop-cart__notice-list"><li class="trizync-pop-cart__notice-item">Please wait while we prepare checkout.</li></ul>' );
				return;
			}
			if (
				popup.hasAttribute( 'data-cart-loading' ) ||
				popup.hasAttribute( 'data-checkout-loading' ) ||
				popup.hasAttribute( 'data-notices-loading' ) ||
				( currentMode === 'product' && productCheckoutPreparing )
			) {
				renderNotices( '<ul class="trizync-pop-cart__notice-list"><li class="trizync-pop-cart__notice-item">Please wait while we prepare your checkout.</li></ul>' );
				return;
			}
			if ( lastItemCount < 1 ) {
				renderNotices( '<ul class="trizync-pop-cart__notice-list"><li class="trizync-pop-cart__notice-item">Your cart is empty.</li></ul>' );
				return;
			}
			if ( currentMode === 'product' && currentProductId && ! productCheckoutPrepared ) {
				renderNotices( '<ul class="trizync-pop-cart__notice-list"><li class="trizync-pop-cart__notice-item">Preparing your cart…</li></ul>' );
				return;
			}
			var paymentInput = popup.querySelector( '[data-trizync-pop-cart-payment-input]' );
			var shippingInput = popup.querySelector( '[data-trizync-pop-cart-shipping-input]' );
			if ( ! paymentInput || ! paymentInput.value || ! shippingInput || ! shippingInput.value ) {
				renderNotices( '<ul class="trizync-pop-cart__notice-list"><li class="trizync-pop-cart__notice-item">Please select shipping and payment method.</li></ul>' );
				return;
			}
			if ( ! checkoutReady ) {
				renderNotices( '<ul class="trizync-pop-cart__notice-list"><li class="trizync-pop-cart__notice-item">Preparing your checkout…</li></ul>' );
				return;
			}
			if ( this.disabled ) {
				var errors = collectValidationErrors( form );
				renderValidationNotices( errors );
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
						productCheckoutRestoreOnClose = true;
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
			clearNoticeHold();
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
				scheduleUpdateCheckout();
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
			scheduleUpdateCheckout();
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
					var zyncopsId = trigger.getAttribute( 'data-zyncops-post-data-id' );
					if ( zyncopsId ) {
						id = parseInt( zyncopsId, 10 ) || 0;
					}
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
				var parent = trigger.closest( '[data-product_id],[data-product-id],[data-zyncops-post-data-id]' );
				if ( parent ) {
					var parentId = parent.getAttribute( 'data-product_id' ) || parent.getAttribute( 'data-product-id' ) || parent.getAttribute( 'data-zyncops-post-data-id' );
					if ( parentId ) {
						id = parseInt( parentId, 10 ) || 0;
					}
				}
			}
			if ( ! id && trigger.closest ) {
				var productWrap = trigger.closest( '.product, .type-product, .wc-block-grid__product' );
				if ( productWrap ) {
					if ( productWrap.getAttribute ) {
						var wrapId = productWrap.getAttribute( 'data-product_id' ) || productWrap.getAttribute( 'data-product-id' ) || productWrap.getAttribute( 'data-zyncops-post-data-id' );
						if ( wrapId ) {
							id = parseInt( wrapId, 10 ) || 0;
						}
					}
					if ( ! id && productWrap.className ) {
						var match = productWrap.className.match( /post-(\d+)/ );
						if ( match && match[1] ) {
							id = parseInt( match[1], 10 ) || 0;
						}
					}
					if ( ! id ) {
						var addButton = productWrap.querySelector( '[data-product_id],[data-product-id],[data-zyncops-post-data-id]' );
						if ( addButton ) {
							var addId = addButton.getAttribute( 'data-product_id' ) || addButton.getAttribute( 'data-product-id' ) || addButton.getAttribute( 'data-zyncops-post-data-id' );
							if ( addId ) {
								id = parseInt( addId, 10 ) || 0;
							}
						}
					}
				}
			}
			return id;
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

		function handleAddToCartTrigger( trigger ) {
			if ( ! trigger ) {
				return false;
			}
			if ( ! window.TrizyncPopCart || ! TrizyncPopCart.replaceAddToCart ) {
				return false;
			}
			var context = resolveProductContext( trigger );
			if ( ! context.productId ) {
				return false;
			}

			lastTriggerEl = trigger;
			currentProductId = context.productId;
			currentProductQty = context.qty || 1;
			currentMode = 'product';
			window.TrizyncPopCartCurrentMode = 'product';
			productCheckoutPrepared = false;
			productCheckoutPreparing = false;
			productCheckoutRestoreOnClose = false;
			currentProductData = null;
			currentVariationId = context.variationId || 0;
			currentVariationAttributes = context.attributes || {};
			currentVariationData = null;
			openPopup();
			prepareProductCheckout( context );
			return true;
		}

		// add-to-cart interception is handled in the unified click handler above

		$( document ).on( 'click', '.trizync-pop-cart__cart-remove', function() {
			clearNoticeHold();
			var key = this.getAttribute( 'data-cart-item-key' );
			if ( ! key ) {
				return;
			}
			scheduleUpdateCheckout();
			removeCartItem( key );
		} );

		$( document ).on( 'change', 'input[name="trizync_pop_cart_shipping"]', function() {
			clearNoticeHold();
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
			scheduleUpdateCheckout( { selection: getSelectionData() } );
		} );

		$( document ).on( 'change', 'input[name="trizync_pop_cart_payment"]', function() {
			clearNoticeHold();
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
			scheduleUpdateCheckout( { selection: getSelectionData() } );
		} );

		$( document ).on( 'click', '[data-trizync-pop-cart-coupon-apply]', function() {
			clearNoticeHold();
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
				clearNoticeHold();
				var code = ( this.value || '' ).trim();
				if ( code ) {
					applyCoupon( code );
				} else {
					showCouponError( 'Please enter a coupon code.' );
				}
			}
		} );

		$( document ).on( 'click', '[data-trizync-pop-cart-coupon-remove]', function() {
			clearNoticeHold();
			var code = this.getAttribute( 'data-coupon-code' ) || '';
			if ( ! code ) {
				return;
			}
			removeCoupon( code );
		} );

		$( document ).on( 'input change', '#trizync-pop-cart form [name^="billing_"], #trizync-pop-cart form [name^="shipping_"]', function() {
			clearNoticeHold();
			scheduleCustomerUpdate();
		} );

		$( document ).on( 'change', '[data-trizync-pop-cart-variation-select]', function() {
			clearNoticeHold();
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
				prepareProductCheckout( {
					productId: currentProductId,
					qty: currentProductQty || 1,
					variationId: currentVariationId,
					attributes: currentVariationAttributes || {}
				} );
			}
		} );

		$( document ).on( 'input change', '#trizync-pop-cart form input, #trizync-pop-cart form select, #trizync-pop-cart form textarea', function() {
			clearNoticeHold();
			updateCtaState();
		} );

		$( document ).on( 'click', '[data-trizync-pop-cart-close]', function( event ) {
			event.preventDefault();
			closePopup();
			emitPopcartHook( 'popcart:close', buildHookPayload( 'popcart:close' ) );
			if ( currentMode === 'product' && productCheckoutPrepared && productCheckoutRestoreOnClose ) {
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
			var noticesWrap = popup ? popup.querySelector( '.trizync-pop-cart__notices' ) : null;
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
						holdNotices = true;
						pendingCheckoutError = false;
					} else {
						holdNotices = false;
						pendingCheckoutError = true;
						if ( typeof fetchNotices === 'function' ) {
							fetchNotices();
						}
					}
					if ( ctaButton ) {
						setCtaLoading( ctaButton, false );
					}
					triggerCheckoutEvent( 'checkout_error' );
					emitPopcartHook( 'popcart:checkout_error', buildHookPayload( 'popcart:checkout_error', { errors: [ { message: response && response.messages ? response.messages : 'Checkout failed' } ] } ) );
					emitPopcartHook( 'popcart:checkout:error', buildHookPayload( 'popcart:checkout:error', { errors: [ { message: response && response.messages ? response.messages : 'Checkout failed' } ] } ) );
				},
				error: function( xhr ) {
					var responseText = xhr && xhr.responseText ? xhr.responseText : '';
					var looksLikeNotice = /woocommerce-(error|message|info)/i.test( responseText );
					var looksLikePage = /<\\s*(html|body|head)\\b/i.test( responseText );
					if ( noticesWrap && responseText && looksLikeNotice && ! looksLikePage ) {
						noticesWrap.innerHTML = responseText;
						holdNotices = true;
						pendingCheckoutError = false;
					} else {
						holdNotices = false;
						pendingCheckoutError = true;
						if ( typeof fetchNotices === 'function' ) {
							fetchNotices();
						}
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
