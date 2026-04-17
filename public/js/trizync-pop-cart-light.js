/* global jQuery, TrizyncPopCart */
(function ($) {
  "use strict";

  if (!window.TrizyncPopCart) {
    return;
  }

  var ajaxUrl = TrizyncPopCart.ajaxUrl;
  var popupTemplate = null;
  var lightCurrentPayload = null;
  var lastSubtotalPayload = null;
  var lightCurrentContext = null;
  var noticesClearTimer = null;

  var lightUiState = {
    product: null,
    shipping: null,
    payment: null,
    totals: null,
    fields: null,
    values: null,
    cart: null,
    coupons: null,
    context: null,
    wc_checkout_nonce:
      (TrizyncPopCart && TrizyncPopCart.wooCheckoutNonce) || null,
    meta: {
      popup_type: null,
    },
    ui: {
      loading: false,
      error: null,
      sections: {
        cart: null,
        shipping: null,
        totals: null,
        payment: null,
        coupon: null,
        fields: null,
      },
    },
  };

  function mergeUiState(partial) {
    lightUiState = {
      product:
        partial.product !== undefined ? partial.product : lightUiState.product,
      shipping:
        partial.shipping !== undefined
          ? partial.shipping
          : lightUiState.shipping,
      payment:
        partial.payment !== undefined ? partial.payment : lightUiState.payment,
      totals:
        partial.totals !== undefined ? partial.totals : lightUiState.totals,
      fields:
        partial.fields !== undefined ? partial.fields : lightUiState.fields,
      values:
        partial.values !== undefined ? partial.values : lightUiState.values,
      cart: partial.cart !== undefined ? partial.cart : lightUiState.cart,
      coupons:
        partial.coupons !== undefined ? partial.coupons : lightUiState.coupons,
      context:
        partial.context !== undefined ? partial.context : lightUiState.context,
      wc_checkout_nonce:
        partial.wc_checkout_nonce !== undefined
          ? partial.wc_checkout_nonce
          : lightUiState.wc_checkout_nonce,
      meta:
        partial.meta !== undefined
          ? Object.assign({}, lightUiState.meta, partial.meta)
          : lightUiState.meta,
      ui:
        partial.ui !== undefined
          ? {
              loading:
                partial.ui.loading !== undefined
                  ? partial.ui.loading
                  : lightUiState.ui.loading,
              error:
                partial.ui.error !== undefined
                  ? partial.ui.error
                  : lightUiState.ui.error,
              sections:
                partial.ui.sections !== undefined
                  ? Object.assign(
                      {},
                      lightUiState.ui.sections,
                      partial.ui.sections,
                    )
                  : lightUiState.ui.sections,
            }
          : lightUiState.ui,
    };

    // console.log("[popcart light] updated ui state", lightUiState);
  }

  function setState(partial, source) {
    var prev = lightUiState;
    mergeUiState(partial || {});
    lightUiState.meta = Object.assign({}, lightUiState.meta, {
      last_update_source: source || null,
      last_update_ts: new Date().toISOString(),
    });
    if (window.TrizyncPopCartLight && window.TrizyncPopCartLight.debugState) {
      //   console.log("[popcart light] state update", {
      //     source: source || null,
      //     changed: getChangedKeys(prev, lightUiState),
      //     state: lightUiState,
      //   });
    }
    var changedKeys = getChangedKeys(prev, lightUiState);

    // Keep parity with classic flow: only emit checkout lifecycle hooks for
    // meaningful checkout-impacting updates (avoid spamming on every keystroke).
    var skipSources = { field_input: true, fetch_wc_checkout_nonce: true };
    var shouldEmit =
      !skipSources[source || ""] &&
      changedKeys &&
      changedKeys.some(function (k) {
        return (
          k === "product" ||
          k === "shipping" ||
          k === "payment" ||
          k === "totals" ||
          k === "cart" ||
          k === "coupons" ||
          k === "context"
        );
      });

    if (shouldEmit) {
      emitHook("popcart:update_checkout", {
        source: source || null,
        partial: partial || {},
        prev_state: prev,
      });
    }

    notifySubscribers(prev, lightUiState, changedKeys, source);

    if (shouldEmit) {
      emitHook("popcart:updated_checkout", {
        source: source || null,
        changed_keys: changedKeys,
        prev_state: prev,
        state: lightUiState,
      });
    }
  }

  function getState() {
    return lightUiState;
  }

  function isUiFullyLoaded(state) {
    var s = state || lightUiState;
    var hasProduct = !!(s.product && s.product.product);
    var hasCart = !!(s.cart && s.cart.items && s.cart.items.length);
    var hasShipping = !!(
      s.shipping &&
      s.shipping.methods &&
      s.shipping.methods.length
    );
    var hasPayment = !!(
      s.payment &&
      s.payment.gateways &&
      s.payment.gateways.length
    );
    var hasFields = !!(s.fields && s.fields.length);
    var hasValues = !!(s.values && Object.keys(s.values).length);
    return (
      (hasProduct || hasCart) &&
      hasShipping &&
      hasPayment &&
      hasFields &&
      hasValues
    );
  }

  function emitUiFullyLoaded() {
    try {
      document.dispatchEvent(
        new CustomEvent("trizync_pop_cart:ui_ready", {
          detail: { state: lightUiState },
        }),
      );
    } catch (err) {
      // ignore
    }
  }

  var stateSubscribers = [];
  var isNotifyingSubscribers = false;
  var uiReadyEmitted = false;

  function subscribe(fn) {
    if (typeof fn === "function") {
      stateSubscribers.push(fn);
    }
  }

  function notifySubscribers(prev, next, changedKeys, source) {
    if (isNotifyingSubscribers) {
      return;
    }
    isNotifyingSubscribers = true;
    stateSubscribers.forEach(function (fn) {
      try {
        fn(prev, next, changedKeys, source);
      } catch (err) {
        // swallow subscriber errors
      }
    });
    isNotifyingSubscribers = false;
  }

  function getChangedKeys(prev, next) {
    var keys = [
      "product",
      "shipping",
      "payment",
      "totals",
      "fields",
      "values",
      "cart",
      "coupons",
      "context",
      "meta",
      "ui",
    ];
    var changed = [];
    keys.forEach(function (key) {
      if (prev[key] !== next[key]) {
        changed.push(key);
      }
    });
    return changed;
  }

  function debounce(fn, delay) {
    var timer;
    return function () {
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(null, args);
      }, delay);
    };
  }

  function decodeHtmlEntities(input) {
    if (input === null || typeof input === "undefined") {
      return "";
    }
    var str = String(input);
    if (str.indexOf("&") === -1) {
      return str;
    }
    // Decode a single layer of HTML entities (also fixes double-encoded strings like &amp;quot;).
    var textarea = document.createElement("textarea");
    textarea.innerHTML = str;
    return textarea.value;
  }

  var debouncedInputUpdate = debounce(function () {
    var validation = validateOrderReadinessFromState();
    if (validation.ok) {
      enableCta();
    } else {
      disableCta();
    }
  }, 400);

  var pendingCustomerPayload = null;
  var debouncedCustomerSync = debounce(function () {
    if (!pendingCustomerPayload) {
      return;
    }
    var payload = pendingCustomerPayload;
    pendingCustomerPayload = null;

    updateCustomerInfo(payload)
      .done(function (response) {
        if (response && response.success && response.data) {
          applyCartStateFromResponse(response, "customer_update");
        }
      })
      .fail(function () {
        // Keep silent; UI already handles errors elsewhere.
      });
  }, 500);

  var debouncedCartSync = debounce(function () {
    if (!lightCurrentContext) {
      return;
    }
    // Don't call prepare checkout for variable products until a variation is selected.
    if (
      lightUiState &&
      lightUiState.product &&
      lightUiState.product.product &&
      lightUiState.product.product.type === "variable"
    ) {
      var ctx = normalizeContext(lightCurrentContext);
      if (!ctx.variation_id) {
        return;
      }
    }
    prepareCheckout(lightCurrentContext, lightUiState.coupons || []);
  }, 400);

  function resolvePopupType(trigger) {
    if (trigger && trigger.getAttribute) {
      var explicit = trigger.getAttribute("data-trizync-pop-cart-open");
      if (explicit) {
        return { type: explicit, source: "trigger" };
      }
    }

    var body = document.body;
    if (body) {
      if (body.classList.contains("woocommerce-cart")) {
        return { type: "cart", source: "body" };
      }
      if (body.classList.contains("woocommerce-checkout")) {
        return { type: "checkout", source: "body" };
      }
    }

    var path = window.location ? window.location.pathname || "" : "";
    if (path.indexOf("/cart") === 0) {
      return { type: "cart", source: "url" };
    }
    if (path.indexOf("/checkout") === 0) {
      return { type: "checkout", source: "url" };
    }

    return { type: "product", source: "default" };
  }

  function reconcileUiState(state) {
    if (!state) {
      return;
    }

    // Sections visibility based on full current state
    if (state.product || (state.cart && state.cart.items && state.cart.items.length)) {
      showCartSection();
      hideEmptyCart();
    } else {
      hideCartSection();
      showEmptyCart();
    }

    if (
      state.product &&
      state.product.product &&
      state.product.product.variations &&
      state.product.product.variations.length
    ) {
      showVariationsSection();
    } else {
      hideVariationsSection();
    }

    if (
      state.shipping &&
      state.shipping.methods &&
      state.shipping.methods.length
    ) {
      showShippingSection();
    } else {
      hideShippingSection();
    }

    if (state.totals) {
      showTotalsSection();
    } else {
      hideTotalsSection();
    }

    if (
      state.payment &&
      state.payment.gateways &&
      state.payment.gateways.length
    ) {
      showPaymentSection();
    } else {
      hidePaymentSection();
    }

    var storeHasCoupons =
      !!(window.TrizyncPopCart && TrizyncPopCart.storeHasCoupons);
    if (storeHasCoupons) {
      showCouponSection();
    } else {
      hideCouponSection();
    }
  }

  function refreshCtaState() {
    var validation = validateOrderReadinessFromState();
    if (validation.ok) {
      enableCta();
    } else {
      disableCta();
    }
  }

  subscribe(function (prev, next, changedKeys) {
    reconcileUiState(next);

    if (!uiReadyEmitted && isUiFullyLoaded(next)) {
      uiReadyEmitted = true;
      lightUiState.ui.loaded = true;
      emitUiFullyLoaded();
      refreshCtaState();
    }

    if (changedKeys.indexOf("product") !== -1 && next.product) {
      updateProductInfo(next.product);
      if (
        next.product.product &&
        next.product.product.variations &&
        next.product.product.variations.length
      ) {
        showVariationsSection();
      } else {
        hideVariationsSection();
      }
    }

    if (changedKeys.indexOf("shipping") !== -1 && next.shipping) {
      updateShippingMethods(next.shipping);
      updateTotalsWithShipping(
        next.shipping.total_raw || 0,
        next.shipping.total || "",
      );
    }

    if (changedKeys.indexOf("payment") !== -1 && next.payment) {
      updatePaymentMethods(next.payment);
    }

    if (changedKeys.indexOf("totals") !== -1 && next.totals) {
      updateSubtotals(next.totals);
    }

    if (changedKeys.indexOf("values") !== -1) {
      refreshCtaState();
    }

    if (changedKeys.indexOf("cart") !== -1 && next.cart) {
      updateCartItems(next.cart);
      var countEl = document.querySelector("[data-trizync-pop-cart-count]");
      if (countEl) {
        var count =
          next.cart.items_count || next.cart.qty_total || next.cart.count || 0;
        countEl.textContent = count;
      }
    }

    if (changedKeys.indexOf("coupons") !== -1) {
      renderCoupons(next.coupons || []);
    }

    if (
      changedKeys.indexOf("product") !== -1 ||
      changedKeys.indexOf("shipping") !== -1 ||
      changedKeys.indexOf("totals") !== -1 ||
      changedKeys.indexOf("payment") !== -1 ||
      changedKeys.indexOf("fields") !== -1
    ) {
      refreshCtaState();
    }
  });

  function buildPayload(action, data, nonceKey) {
    var payload = $.extend({}, data || {}, {
      action: action,
      nonce: TrizyncPopCart[nonceKey] || TrizyncPopCart.nonce,
    });
    return payload;
  }

  function postAction(action, data, nonceKey) {
    return $.ajax({
      url: ajaxUrl,
      method: "POST",
      dataType: "json",
      data: buildPayload(action, data, nonceKey),
    });
  }

  function refreshFragmentsSilently(cartHash) {
    if (!window.wc_cart_fragments_params) {
      return;
    }
    var params = window.wc_cart_fragments_params;
    var url = params.wc_ajax_url
      ? params.wc_ajax_url.toString().replace("%%endpoint%%", "get_refreshed_fragments")
      : "";
    if (!url) {
      return;
    }

    $.ajax({
      type: "POST",
      url: url,
      success: function (data) {
        if (data && data.fragments) {
          $.each(data.fragments, function (key, value) {
            $(key).replaceWith(value);
          });
          try {
            if (window.sessionStorage && params.fragment_name) {
              sessionStorage.setItem(
                params.fragment_name,
                JSON.stringify(data.fragments),
              );
              if (cartHash) {
                sessionStorage.setItem("wc_cart_hash", cartHash);
              }
            }
          } catch (e) {}
          $(document.body).trigger("wc_fragments_refreshed");
        }
      },
    });
  }

  function triggerAddedToCart(payload) {
    var cartHash = payload && payload.hash ? payload.hash : "";
    refreshFragmentsSilently(cartHash);

    // Classic compatibility event.
    $(document.body).trigger("trizync_pop_cart_added_to_cart", [payload || {}]);

    // PopCart lifecycle hook (light + classic scripts can use it too).
    emitHook("popcart:added_to_cart", { cart: payload || {} });
  }

  function applyCartStateFromResponse(response, source) {
    if (response && response.success && response.data) {
      var src = source || "cart_update";
      var prevHash =
        (lightUiState && lightUiState.cart && lightUiState.cart.hash) ||
        (window.TrizyncPopCart && TrizyncPopCart.cartHash) ||
        "";
      var prevCount =
        (lightUiState &&
          lightUiState.cart &&
          (lightUiState.cart.itemCount ||
            lightUiState.cart.items_count ||
            lightUiState.cart.count ||
            lightUiState.cart.qty_total)) ||
        0;

      var cart = response.data;
      var nextCount =
        (cart &&
          (cart.itemCount || cart.items_count || cart.count || cart.qty_total)) ||
        (cart && Array.isArray(cart.items) ? cart.items.length : 0);
      var existingShipping = (lightUiState && lightUiState.shipping) || {
        methods: [],
      };
      var nextCoupons =
        cart && Array.isArray(cart.coupons) ? cart.coupons : lightUiState.coupons;
      var nextPayment =
        cart && cart.payment ? cart.payment : (lightUiState && lightUiState.payment) || null;
      var nextShipping = {
        methods:
          cart && cart.shipping && Array.isArray(cart.shipping.methods) && cart.shipping.methods.length
            ? cart.shipping.methods
            : existingShipping.methods || [],
        chosen: cart.shipping ? cart.shipping.chosen : existingShipping.chosen,
        total: cart.shipping ? cart.shipping.total : existingShipping.total,
        total_raw: cart.shipping
          ? cart.shipping.total_raw
          : existingShipping.total_raw,
        zones: existingShipping.zones || [],
      };
      var nextTotals = $.extend({}, lightUiState.totals || {}, {
        subtotal: cart.subtotal,
        subtotal_raw: cart.subtotal_raw,
        total: cart.total,
        total_raw: cart.total_raw,
        shipping: nextShipping,
      });
      setState(
        {
          cart: cart,
          shipping: nextShipping,
          totals: nextTotals,
          coupons: nextCoupons || [],
          payment: nextPayment,
        },
        src,
      );

      // Only fire "added to cart" lifecycle for endpoints that actually add/replace
      // the cart item (avoid firing on generic cart updates like coupons/shipping).
      var isPrepareSource =
        src === "light_prepare_checkout" ||
        src === "prepare_product_checkout" ||
        src === "prepare_product_checkout_light";
      var hashChanged = !!(cart && cart.hash && cart.hash !== prevHash);
      var becameNonEmpty = prevCount <= 0 && nextCount > 0;

      if (isPrepareSource && (hashChanged || becameNonEmpty)) {
        if (window.TrizyncPopCart) {
          TrizyncPopCart.cartHash = cart.hash;
        }
        triggerAddedToCart(cart);
      }
    } else {
      if (typeof rollback !== "undefined" && rollback) {
        setState(rollback, source + "_failed");
      }
      renderErrorMessage("Sorry, unable to update cart state.");
    }
  }

  function normalizeContext(context) {
    var ctx = context || {};
    return {
      product_id: ctx.product_id || ctx.productId || 0,
      variation_id: ctx.variation_id || ctx.variationId || 0,
      quantity: ctx.quantity || ctx.qty || 1,
      attributes: ctx.attributes || {},
    };
  }

  function normalizeCoupons(coupons) {
    if (!coupons) {
      return [];
    }
    if (Array.isArray(coupons)) {
      return coupons
        .map(function (item) {
          if (!item) {
            return "";
          }
          if (typeof item === "string") {
            return item;
          }
          if (typeof item === "object" && item.code) {
            return String(item.code);
          }
          return "";
        })
        .map(function (code) {
          return String(code || "").trim();
        })
        .filter(Boolean);
    }
    if (typeof coupons === "string") {
      return coupons
        .split(",")
        .map(function (code) {
          return code.trim();
        })
        .filter(Boolean);
    }
    return [];
  }

  function normalizeAttributeKey(key) {
    if (!key) {
      return "";
    }
    if (key.indexOf("attribute_") === 0) {
      return key;
    }
    return "attribute_" + key;
  }

  function normalizeVariationAttributeKey(key) {
    // Prevent mismatches like `attribute_Waist` vs `attribute_waist`.
    var normalized = normalizeAttributeKey(key || "");
    return normalized ? normalized.toLowerCase() : "";
  }

  function normalizeVariationAttributesMap(attrs) {
    var out = {};
    if (!attrs || typeof attrs !== "object") {
      return out;
    }
    Object.keys(attrs).forEach(function (k) {
      var key = normalizeVariationAttributeKey(k);
      if (key) {
        out[key] = attrs[k];
      }
    });
    return out;
  }

  function resolveProductContext(trigger) {
    var context = {
      productId: 0,
      qty: 1,
      variationId: 0,
      attributes: {},
    };
    if (!trigger) {
      return context;
    }
    var form = trigger.closest ? trigger.closest("form.cart") : null;
    if (!form && trigger.getAttribute) {
      var formId = trigger.getAttribute("form");
      if (formId) {
        form = document.getElementById(formId);
      }
    }
    if (!form) {
      form = document.querySelector("form.cart");
    }
    if (!form && trigger.closest) {
      var productWrap =
        trigger.closest(".product") || trigger.closest(".type-product");
      if (productWrap) {
        form = productWrap.querySelector("form.cart");
      }
    }
    if (form) {
      var addInput = form.querySelector('[name="add-to-cart"]');
      if (addInput) {
        context.productId = parseInt(addInput.value, 10) || 0;
      }
      if (!context.productId) {
        var productInput = form.querySelector('[name="product_id"]');
        if (productInput) {
          context.productId = parseInt(productInput.value, 10) || 0;
        }
      }
      var variationInput = form.querySelector('[name="variation_id"]');
      if (variationInput) {
        context.variationId = parseInt(variationInput.value, 10) || 0;
      }
      var qtyInput = form.querySelector("input.qty");
      if (qtyInput) {
        context.qty = parseInt(qtyInput.value, 10) || 1;
      }
      var attrInputs = form.querySelectorAll('[name^="attribute_"]');
      attrInputs.forEach(function (input) {
        if (input.value) {
          context.attributes[normalizeAttributeKey(input.name)] = input.value;
        }
      });
    }

    if (trigger.getAttribute) {
      var dataId =
        trigger.getAttribute("data-product_id") ||
        trigger.getAttribute("data-product-id");
      if (dataId) {
        context.productId = parseInt(dataId, 10) || context.productId;
      }
      if (!context.productId) {
        var zyncopsId = trigger.getAttribute("data-zyncops-post-data-id");
        if (zyncopsId) {
          context.productId = parseInt(zyncopsId, 10) || context.productId;
        }
      }
      if (!context.productId) {
        var altId = trigger.getAttribute("data-id");
        if (altId) {
          context.productId = parseInt(altId, 10) || 0;
        }
      }
      if (!context.productId) {
        var valueId = trigger.getAttribute("value");
        if (valueId && /^\d+$/.test(valueId)) {
          context.productId = parseInt(valueId, 10) || 0;
        }
      }
      if (!context.productId) {
        var href = trigger.getAttribute("href");
        if (href && href.indexOf("add-to-cart=") !== -1) {
          var match = href.match(/add-to-cart=(\d+)/);
          if (match && match[1]) {
            context.productId = parseInt(match[1], 10) || 0;
          }
        }
      }
      var dataQty = trigger.getAttribute("data-quantity");
      if (dataQty) {
        context.qty = parseInt(dataQty, 10) || context.qty;
      }
      var dataVariation =
        trigger.getAttribute("data-variation-id") ||
        trigger.getAttribute("data-variation_id");
      if (dataVariation) {
        context.variationId =
          parseInt(dataVariation, 10) || context.variationId;
      }
    }

    if (!context.productId && trigger.closest) {
      var parent = trigger.closest(
        "[data-product_id],[data-product-id],[data-zyncops-post-data-id]",
      );
      if (parent) {
        var parentId =
          parent.getAttribute("data-product_id") ||
          parent.getAttribute("data-product-id") ||
          parent.getAttribute("data-zyncops-post-data-id");
        if (parentId) {
          context.productId = parseInt(parentId, 10) || 0;
        }
      }
    }
    if (!context.productId && trigger.closest) {
      var altParent = trigger.closest("[data-id]");
      if (altParent) {
        var altParentId = altParent.getAttribute("data-id");
        if (altParentId) {
          context.productId = parseInt(altParentId, 10) || 0;
        }
      }
    }
    if (!context.productId && trigger.closest) {
      var productWrap = trigger.closest(
        ".product, .type-product, .wc-block-grid__product",
      );
      if (productWrap) {
        if (productWrap.getAttribute) {
          var wrapId =
            productWrap.getAttribute("data-product_id") ||
            productWrap.getAttribute("data-product-id") ||
            productWrap.getAttribute("data-zyncops-post-data-id");
          if (wrapId) {
            context.productId = parseInt(wrapId, 10) || 0;
          }
        }
        if (!context.productId) {
          var wrapAlt = productWrap.getAttribute("data-id");
          if (wrapAlt) {
            context.productId = parseInt(wrapAlt, 10) || 0;
          }
        }
        if (!context.productId && productWrap.className) {
          var match = productWrap.className.match(/post-(\d+)/);
          if (match && match[1]) {
            context.productId = parseInt(match[1], 10) || 0;
          }
        }
        if (!context.productId) {
          var addButton = productWrap.querySelector(
            "[data-product_id],[data-product-id],[data-zyncops-post-data-id]",
          );
          if (addButton) {
            var addId =
              addButton.getAttribute("data-product_id") ||
              addButton.getAttribute("data-product-id") ||
              addButton.getAttribute("data-zyncops-post-data-id");
            if (addId) {
              context.productId = parseInt(addId, 10) || 0;
            }
          }
        }
      }
    }
    if (!context.productId) {
      var globalAdd = document.querySelector('input[name="add-to-cart"]');
      if (globalAdd && globalAdd.value) {
        context.productId = parseInt(globalAdd.value, 10) || 0;
      }
    }
    if (!context.productId) {
      var globalProduct = document.querySelector('input[name="product_id"]');
      if (globalProduct && globalProduct.value) {
        context.productId = parseInt(globalProduct.value, 10) || 0;
      }
    }
    return context;
  }

  function getProductInfo(context, coupons) {
    var ctx = normalizeContext(context);
    return postAction(
      "trizync_pop_cart_get_product_preview_light",
      {
        product_id: ctx.product_id,
        variation_id: ctx.variation_id,
        quantity: ctx.quantity,
        attributes: JSON.stringify(ctx.attributes || {}),
        coupons: JSON.stringify(normalizeCoupons(coupons)),
      },
      "nonce_preview",
    );
  }

  function fetchWooCheckoutNonce() {
    return postAction(
      "trizync_pop_cart_get_wc_checkout_nonce",
      {},
      "nonce_preview",
    ).then(function (res) {
      var nonce =
        res &&
        res.success &&
        res.data &&
        res.data["woocommerce-process-checkout-nonce"]
          ? res.data["woocommerce-process-checkout-nonce"]
          : "";
      if (nonce) {
        setState({ wc_checkout_nonce: nonce }, "fetch_wc_checkout_nonce");
        return nonce;
      }
      return $.Deferred().reject(res).promise();
    });
  }

  function getCart(ping) {
    return postAction(
      "trizync_pop_cart_get_cart",
      {
        ping: ping ? 1 : 0,
      },
      "nonce_preview",
    ).done(function (response) {
      applyCartStateFromResponse(response, "get_cart");
    });
  }

  function getShippingMethods(context) {
    var ctx = normalizeContext(context);
    // console.log("[popcart light] getShippingMethods payload", {
    //   product_id: ctx.product_id,
    //   variation_id: ctx.variation_id,
    //   quantity: ctx.quantity,
    // });
    return postAction(
      "trizync_pop_cart_get_shipping_methods_light",
      {
        product_id: ctx.product_id,
        variation_id: ctx.variation_id,
        quantity: ctx.quantity,
      },
      "nonce_preview",
    );
  }

  function getAppliedShippingMethods(context, customer) {
    var ctx = normalizeContext(context);
    // console.log("[popcart light] getAppliedShippingMethods payload", {
    //   product_id: ctx.product_id,
    //   variation_id: ctx.variation_id,
    //   quantity: ctx.quantity,
    //   customer: customer || {},
    // });
    return postAction(
      "trizync_pop_cart_get_shipping_methods_applied_light",
      {
        product_id: ctx.product_id,
        variation_id: ctx.variation_id,
        quantity: ctx.quantity,
        customer: JSON.stringify(customer || {}),
      },
      "nonce_preview",
    );
  }

  function getAppliedShippingMethod(context) {
    return getShippingMethods(context).then(function (response) {
      if (!response || !response.success) {
        return null;
      }
      var shipping =
        response.data && response.data.shipping ? response.data.shipping : {};
      return shipping.chosen || null;
    });
  }

  function getCustomerInfo() {
    return postAction("trizync_pop_cart_get_customer", {}, "nonce_preview");
  }

  function getEnabledFields() {
    return postAction(
      "trizync_pop_cart_get_enabled_fields",
      {},
      "nonce_preview",
    );
  }

  function getSubtotal(context, coupons) {
    var ctx = normalizeContext(context);
    return postAction(
      "trizync_pop_cart_calc_subtotal_light",
      {
        product_id: ctx.product_id,
        variation_id: ctx.variation_id,
        quantity: ctx.quantity,
        attributes: JSON.stringify(ctx.attributes || {}),
        coupons: JSON.stringify(normalizeCoupons(coupons)),
      },
      "nonce_preview",
    );
  }

  function previewCoupon(context, coupons) {
    var ctx = normalizeContext(context);
    return postAction(
      "trizync_pop_cart_preview_coupon_light",
      {
        product_id: ctx.product_id,
        variation_id: ctx.variation_id,
        quantity: ctx.quantity,
        attributes: JSON.stringify(ctx.attributes || {}),
        coupons: JSON.stringify(normalizeCoupons(coupons)),
      },
      "nonce_preview",
    );
  }

  function updateCustomerInfo(payload) {
    return postAction(
      "trizync_pop_cart_update_customer",
      { data: payload || {} },
      "nonce_checkout",
    );
  }

  function updateCartItem(key, quantity) {
    return postAction("trizync_pop_cart_update_cart_item", {
      cart_item_key: key,
      quantity: quantity,
    }).done(function (response) {
      applyCartStateFromResponse(response, "update_cart_item");
    });
  }

  function removeCartItem(key) {
    return postAction(
      "trizync_pop_cart_remove_cart_item",
      {
        key: key,
      },
      "nonce_checkout",
    ).done(function (response) {
      applyCartStateFromResponse(response, "remove_cart_item");
    });
  }

  function restoreCart() {
    return postAction(
      "trizync_pop_cart_restore_cart",
      {},
      "nonce_checkout",
    ).done(function (response) {
      applyCartStateFromResponse(response, "restore_cart");
    });
  }

  function prepareProductCheckout(context) {
    var ctx = normalizeContext(context);
    return postAction(
      "trizync_pop_cart_prepare_product_checkout",
      {
        product_id: ctx.product_id,
        variation_id: ctx.variation_id,
        quantity: ctx.quantity,
        attributes: JSON.stringify(ctx.attributes || {}),
      },
      "nonce_checkout",
    ).done(function (response) {
      applyCartStateFromResponse(response, "prepare_product_checkout");
    });
  }

  function warmSession() {
    return postAction("trizync_pop_cart_light_warm", {}, "nonce_preview");
  }

  function getCheckoutForm() {
    return postAction(
      "trizync_pop_cart_get_checkout_form",
      {},
      "nonce_preview",
    );
  }

  function getNotices() {
    return postAction("trizync_pop_cart_get_notices", {}, "nonce_preview");
  }

  function prepareCheckout(context, coupons) {
    var ctx = normalizeContext(context);
    return postAction(
      "trizync_pop_cart_light_prepare_checkout",
      {
        product_id: ctx.product_id,
        variation_id: ctx.variation_id,
        quantity: ctx.quantity,
        attributes: JSON.stringify(ctx.attributes || {}),
        coupons: JSON.stringify(normalizeCoupons(coupons)),
      },
      "nonce_checkout",
    ).done(function (response) {
      applyCartStateFromResponse(response, "light_prepare_checkout");
    }).fail(function (xhr) {
      var res = xhr && xhr.responseJSON ? xhr.responseJSON : null;
      if (res && res.data && res.data.notices && res.data.notices.length) {
        var msg = res.data.notices[0].message || "";
        msg = decodeHtmlEntities(msg);
        renderErrorMessage(msg || "Unable to update cart.");
      } else if (res && res.data && res.data.message) {
        renderErrorMessage(res.data.message);
      } else {
        renderErrorMessage("Unable to update cart.");
      }
      disableCta();
    });
  }

  function createOrder(context, customer, coupons) {
    var ctx = normalizeContext(context);
    var shippingChosen =
      (lightUiState.shipping && lightUiState.shipping.chosen) || "";
    var paymentChosen =
      (lightUiState.payment && lightUiState.payment.chosen) || "cod";

    return postAction(
      "trizync_pop_cart_create_order",
      {
        product_id: ctx.product_id,
        variation_id: ctx.variation_id,
        quantity: ctx.quantity,
        attributes: JSON.stringify(ctx.attributes || {}),
        coupons: JSON.stringify(normalizeCoupons(coupons)),

        "shipping_method[0]": shippingChosen,
        payment_method: paymentChosen,
        terms: 1,
        "woocommerce-process-checkout-nonce":
          lightUiState.wc_checkout_nonce ||
          (TrizyncPopCart && TrizyncPopCart.wooCheckoutNonce) ||
          "",
        _wp_http_referer: "/checkout/",
        trizync_pop_cart: 1,
        ...customer
      },
      "nonce_checkout",
    );
  }

  function applyCoupon(code, context) {
    var ctx = normalizeContext(context);
    return postAction(
      "trizync_pop_cart_apply_coupon",
      {
        code: code,
        product_id: ctx.product_id,
        variation_id: ctx.variation_id,
        quantity: ctx.quantity,
        attributes: JSON.stringify(ctx.attributes || {}),
      },
      "nonce_checkout",
    );
  }

  function removeCoupon(code, context) {
    var ctx = normalizeContext(context);
    return postAction(
      "trizync_pop_cart_remove_coupon",
      {
        code: code,
        product_id: ctx.product_id,
        variation_id: ctx.variation_id,
        quantity: ctx.quantity,
        attributes: JSON.stringify(ctx.attributes || {}),
      },
      "nonce_checkout",
    );
  }

  function setShippingMethod(methodId, context, rollback) {
    var ctx = normalizeContext(context);
    return postAction(
      "trizync_pop_cart_set_shipping_method",
      {
        shipping_method: methodId,
        product_id: ctx.product_id,
        variation_id: ctx.variation_id,
        quantity: ctx.quantity,
      },
      "nonce_checkout",
    )
      .done(function (response) {
        if (response && response.success && response.data) {
          var cart = response.data;
          var existingShipping = (lightUiState && lightUiState.shipping) || {
            methods: [],
          };
          // console.log("[popcart shipping] existingShipping", existingShipping);
          // console.log("[popcart shipping] cart.shipping", cart.shipping);

          var nextShipping = {
            methods: existingShipping.methods || [],
            chosen: cart.shipping
              ? cart.shipping.chosen
              : existingShipping.chosen,
            total: cart.shipping ? cart.shipping.total : existingShipping.total,
            total_raw: cart.shipping
              ? cart.shipping.total_raw
              : existingShipping.total_raw,
            zones: existingShipping.zones || [],
          };
          // console.log("[popcart shipping] nextShipping", nextShipping);
          var nextTotals = $.extend({}, lightUiState.totals || {}, {
            subtotal: cart.subtotal,
            subtotal_raw: cart.subtotal_raw,
            total: cart.total,
            total_raw: cart.total_raw,
            shipping: nextShipping,
          });
          setState(
            { cart: cart, shipping: nextShipping, totals: nextTotals },
            "set_shipping_method",
          );
        } else {
          if (rollback) {
            setState(rollback, "set_shipping_method_failed");
          }
          renderErrorMessage("Selected shipping method is not available.");
        }
      })
      .fail(function (xhr) {
        if (rollback) {
          setState(rollback, "set_shipping_method_failed");
        }
        var message =
          xhr &&
          xhr.responseJSON &&
          xhr.responseJSON.data &&
          xhr.responseJSON.data.message === "shipping_method_unavailable"
            ? "Selected shipping method is not available."
            : "Unable to update shipping method.";
        renderErrorMessage(message);
      });
  }

  function setPaymentMethod(methodId) {
    return postAction(
      "trizync_pop_cart_set_payment_method",
      {
        payment_method: methodId,
      },
      "nonce_checkout",
    );
  }

  function updateSubtotal(context, coupons) {
    return getSubtotal(context, coupons);
  }

  // UI logic starts here - keep UI handlers below this line.

  function initClickListeners(handler) {
    $(document).on("click", "[data-trizync-pop-cart-open]", function (event) {
      if (typeof handler === "function") {
        handler(event);
      }
    });
  }

  function getPopup() {
    return document.getElementById("trizync-pop-cart");
  }

  function buildPopup() {
    var popup = getPopup();
    if (popup) {
      if (popupTemplate === null) {
        popupTemplate = popup.innerHTML;
      }
      return popup;
    }
    popup = document.createElement("div");
    popup.id = "trizync-pop-cart";
    popup.className = "trizync-pop-cart";
    popup.setAttribute("aria-hidden", "true");
    document.body.appendChild(popup);
    if (popupTemplate === null) {
      popupTemplate = popup.innerHTML;
    }
    return popup;
  }

  function openPopup() {
    var popup = buildPopup();
    popup.classList.add("is-open");
    popup.setAttribute("aria-hidden", "false");
    return popup;
  }

  function resetPopup() {
    var popup = getPopup();
    if (!popup) {
      return;
    }
    popup.classList.remove("is-open");
    popup.setAttribute("aria-hidden", "true");
    popup.innerHTML = popupTemplate !== null ? popupTemplate : "";
  }

  function closePopup() {
    var popup = getPopup();
    if (!popup) {
      return;
    }
    popup.classList.remove("is-open");
    popup.setAttribute("aria-hidden", "true");
  }

  function updateProductInfo(payload) {
    var popup = getPopup();
    if (!popup) {
      return;
    }
    var list = popup.querySelector("[data-trizync-pop-cart-list]");
    var empty = popup.querySelector("[data-trizync-pop-cart-empty]");
    var cartLabel = popup.querySelector("[data-trizync-pop-cart-cart-label]");
    if (!list || !empty) {
      return;
    }
    list.innerHTML = "";
    if (cartLabel) {
      cartLabel.hidden = false;
      cartLabel.textContent = "Selected item";
    }

    if (!payload || !payload.items || !payload.items.length) {
      return;
    }
    lightCurrentPayload = payload || null;
    mergeUiState({ product: payload || null });
    renderItemList(payload, list);

    if (
      payload.product &&
      payload.product.variations &&
      payload.product.variations.length
    ) {
      renderVariationList(payload.product);
    }
  }

  function updateCartItems(cart) {
    var popup = getPopup();
    if (!popup) {
      return;
    }
    var list = popup.querySelector("[data-trizync-pop-cart-list]");
    var empty = popup.querySelector("[data-trizync-pop-cart-empty]");
    var cartLabel = popup.querySelector("[data-trizync-pop-cart-cart-label]");
    if (!list || !empty) {
      return;
    }
    list.innerHTML = "";
    if (cartLabel) {
      cartLabel.hidden = false;
      cartLabel.textContent = "Your cart";
    }

    if (!cart || !cart.items || !cart.items.length) {
      if (empty) {
        empty.hidden = false;
      }
      return;
    }
    if (empty) {
      empty.hidden = true;
    }
    renderCartItemList(cart, list);
    showCartSection();
  }

  function renderCartItemList(cart, list) {
    cart.items.forEach(function (item) {
      var li = document.createElement("li");
      li.className = "trizync-pop-cart__cart-item";
      if (item.key) {
        li.setAttribute("data-cart-item-key", item.key);
      }

      var left = document.createElement("div");
      left.className = "trizync-pop-cart__cart-info";

      var imageUrl = item.image || "";
      if (imageUrl) {
        var thumb = document.createElement("img");
        thumb.className = "trizync-pop-cart__cart-thumb";
        thumb.src = imageUrl;
        thumb.alt = item.name || "";
        left.appendChild(thumb);
      }

      var name = document.createElement("span");
      name.className = "trizync-pop-cart__cart-name";
      name.textContent = item.name || "";
      left.appendChild(name);

      var qtyWrap = document.createElement("div");
      qtyWrap.className = "trizync-pop-cart__cart-qty";

      var qtyControls = document.createElement("div");
      qtyControls.className = "trizync-pop-cart__qty-controls";

      var minus = document.createElement("button");
      minus.type = "button";
      minus.className = "trizync-pop-cart__qty-btn";
      minus.textContent = "−";
      minus.setAttribute("data-qty-action", "decrease");
      minus.setAttribute("data-qty-scope", "cart");
      if (item.key) {
        minus.setAttribute("data-cart-item-key", item.key);
      }

      var qtyValue = document.createElement("span");
      qtyValue.className = "trizync-pop-cart__qty-value";
      qtyValue.textContent = item.quantity || 1;
      qtyValue.setAttribute("data-qty-scope", "cart");
      if (item.key) {
        qtyValue.setAttribute("data-cart-item-key", item.key);
      }

      var plus = document.createElement("button");
      plus.type = "button";
      plus.className = "trizync-pop-cart__qty-btn";
      plus.textContent = "+";
      plus.setAttribute("data-qty-action", "increase");
      plus.setAttribute("data-qty-scope", "cart");
      if (item.key) {
        plus.setAttribute("data-cart-item-key", item.key);
      }

      qtyControls.appendChild(minus);
      qtyControls.appendChild(qtyValue);
      qtyControls.appendChild(plus);
      qtyWrap.appendChild(qtyControls);
      left.appendChild(qtyWrap);

      var right = document.createElement("div");
      right.className = "trizync-pop-cart__cart-meta";
      var price = document.createElement("span");
      price.className = "trizync-pop-cart__cart-price";
      price.innerHTML = item.total || "";
      right.appendChild(price);

      li.appendChild(left);
      li.appendChild(right);
      list.appendChild(li);
    });
  }

  function renderItemList(payload, list) {
    payload.items.forEach(function (item) {
      var li = document.createElement("li");
      li.className = "trizync-pop-cart__cart-item";

      var left = document.createElement("div");
      left.className = "trizync-pop-cart__cart-info";

      var imageUrl =
        item.image || (payload.product ? payload.product.image : "");
      if (imageUrl) {
        var thumb = document.createElement("img");
        thumb.className = "trizync-pop-cart__cart-thumb";
        thumb.src = imageUrl;
        thumb.alt = item.name || "";
        left.appendChild(thumb);
      }

      var name = document.createElement("span");
      name.className = "trizync-pop-cart__cart-name";
      name.textContent = item.name || "";
      left.appendChild(name);

      var qtyWrap = document.createElement("div");
      qtyWrap.className = "trizync-pop-cart__cart-qty";

      var qtyControls = document.createElement("div");
      qtyControls.className = "trizync-pop-cart__qty-controls";

      var minus = document.createElement("button");
      minus.type = "button";
      minus.className = "trizync-pop-cart__qty-btn";
      minus.textContent = "−";
      minus.setAttribute("data-qty-action", "decrease");
      minus.setAttribute("data-qty-scope", "product");

      var qtyValue = document.createElement("span");
      qtyValue.className = "trizync-pop-cart__qty-value";
      qtyValue.textContent = item.quantity || 1;
      qtyValue.setAttribute("data-qty-scope", "product");
      qtyValue.setAttribute("data-qty-value", "");

      var plus = document.createElement("button");
      plus.type = "button";
      plus.className = "trizync-pop-cart__qty-btn";
      plus.textContent = "+";
      plus.setAttribute("data-qty-action", "increase");
      plus.setAttribute("data-qty-scope", "product");

      qtyControls.appendChild(minus);
      qtyControls.appendChild(qtyValue);
      qtyControls.appendChild(plus);
      qtyWrap.appendChild(qtyControls);
      left.appendChild(qtyWrap);

      var right = document.createElement("div");
      right.className = "trizync-pop-cart__cart-meta";
      var price = document.createElement("span");
      price.className = "trizync-pop-cart__cart-price";
      price.innerHTML = item.total || "";
      right.appendChild(price);

      li.appendChild(left);
      li.appendChild(right);
      list.appendChild(li);
    });
  }

  function renderVariationList(product) {
    var popup = getPopup();
    if (!popup) {
      return;
    }
    var wrap = popup.querySelector("[data-trizync-pop-cart-variations]");
    var list = popup.querySelector("[data-trizync-pop-cart-variation-list]");
    if (!wrap || !list) {
      return;
    }
    list.innerHTML = "";

    function isVariationSelectable(v) {
      // Mirror the guard in applySelectedVariationToContext().
      return !(v && (v.is_in_stock === false || v.is_purchasable === false));
    }

    var ctx = normalizeContext(lightCurrentContext || lightUiState.context || {});
    var ctxSelectedId = ctx && ctx.variation_id ? ctx.variation_id : 0;
    var selectedId = ctxSelectedId || product.selected_variation_id || 0;
    var selectedVar =
      selectedId && product.variations
        ? product.variations.find(function (v) {
            return v && v.id === selectedId;
          })
        : null;

    // If the current selection is out of stock / not purchasable, don't keep it selected.
    if (selectedVar && !isVariationSelectable(selectedVar)) {
      selectedId = 0;
      selectedVar = null;
    }

    // If nothing selected yet, pick the first selectable variation (avoids "default is OOS" mismatch).
    if (!selectedId && product.variations && product.variations.length) {
      selectedVar = product.variations.find(isVariationSelectable) || null;
      selectedId = selectedVar && selectedVar.id ? selectedVar.id : 0;
    }

    if (selectedId) {
      product.selected_variation_id = selectedId;
      if (lightCurrentPayload && lightCurrentPayload.product) {
        lightCurrentPayload.product.selected_variation_id = selectedId;
      }
    }

    // Keep checkout context in sync (but avoid loops when it's already correct).
    if (selectedId && selectedVar && (!ctxSelectedId || ctxSelectedId !== selectedId)) {
      applySelectedVariationToContext(product, selectedVar, "variation_auto_select");
    } else if (selectedId && selectedVar && typeof updatePreviewFromVariation === "function") {
      // At least keep the preview consistent if we're not changing context.
      updatePreviewFromVariation(selectedVar, product);
    }

    product.variations.forEach(function (variation) {
      var li = document.createElement("li");
      li.className =
        "trizync-pop-cart__cart-item trizync-pop-cart__variation-item";
      li.setAttribute("data-variation-id", variation.id);
      if (selectedId && variation.id === selectedId) {
        li.classList.add("is-selected");
      }

      var left = document.createElement("div");
      left.className = "trizync-pop-cart__cart-info";

      var radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "trizync_pop_cart_variation";
      radio.value = variation.id;
      radio.className = "trizync-pop-cart__variation-radio";
      if (selectedId && variation.id === selectedId) {
        radio.checked = true;
      }
      left.appendChild(radio);

      var imageUrl = variation.image || product.image || "";
      if (imageUrl) {
        var thumb = document.createElement("img");
        thumb.className = "trizync-pop-cart__cart-thumb";
        thumb.src = imageUrl;
        thumb.alt = product.name || "";
        left.appendChild(thumb);
      }

      var name = document.createElement("span");
      name.className = "trizync-pop-cart__cart-name";
      name.textContent = product.name || "";
      left.appendChild(name);

      var metaText = document.createElement("span");
      metaText.className = "trizync-pop-cart__cart-meta-text";
      if (variation.attributes) {
        var parts = [];
        Object.keys(variation.attributes).forEach(function (key) {
          parts.push(variation.attributes[key]);
        });
        metaText.textContent = parts.join(" / ");
      }
      left.appendChild(metaText);

      var right = document.createElement("div");
      right.className = "trizync-pop-cart__cart-meta";
      var price = document.createElement("span");
      price.className = "trizync-pop-cart__cart-price";
      if (variation.price_html) {
        price.innerHTML = variation.price_html;
      } else if (typeof variation.price_raw !== "undefined") {
        price.innerHTML = variation.price_raw;
      } else {
        price.innerHTML = "";
      }
      right.appendChild(price);

      li.appendChild(left);
      li.appendChild(right);
      list.appendChild(li);
    });

    wrap.hidden = false;
  }

  function renderVariations(product) {
    var popup = getPopup();
    if (!popup) {
      return;
    }
    var wrap = popup.querySelector("[data-trizync-pop-cart-variations]");
    var list = popup.querySelector("[data-trizync-pop-cart-variation-list]");
    var error = popup.querySelector("[data-trizync-pop-cart-variation-error]");
    if (!wrap || !list) {
      return;
    }
    list.innerHTML = "";
    if (!product || !product.attributes || !product.attributes.length) {
      if (error) {
        error.hidden = true;
      }
      return;
    }

    product.attributes.forEach(function (attr) {
      var field = document.createElement("div");
      field.className = "trizync-pop-cart__variation-field";

      var label = document.createElement("label");
      label.className = "trizync-pop-cart__variation-label";
      label.textContent = attr.label || attr.name || "";
      field.appendChild(label);

      var select = document.createElement("select");
      select.className = "trizync-pop-cart__variation-select";
      select.setAttribute("data-trizync-pop-cart-variation-select", "");
      select.setAttribute("data-attribute", attr.key || "");

      var placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Choose";
      select.appendChild(placeholder);

      if (Array.isArray(attr.options)) {
        attr.options.forEach(function (option) {
          var opt = document.createElement("option");
          opt.value = option;
          opt.textContent = option;
          select.appendChild(opt);
        });
      }

      var selected = "";
      if (
        product.selected_attributes &&
        attr.key &&
        product.selected_attributes[attr.key]
      ) {
        selected = product.selected_attributes[attr.key];
      } else if (
        product.default_attributes &&
        attr.key &&
        product.default_attributes[attr.key]
      ) {
        selected = product.default_attributes[attr.key];
      }
      if (selected) {
        select.value = selected;
      }

      field.appendChild(select);
      list.appendChild(field);
    });

    if (error) {
      error.hidden = true;
    }
  }

  function collectVariationAttributes() {
    var popup = getPopup();
    if (!popup) {
      return {};
    }
    var attrs = {};
    var selects = popup.querySelectorAll(
      "[data-trizync-pop-cart-variation-select]",
    );
    selects.forEach(function (select) {
      var key = select.getAttribute("data-attribute");
      var cleanKey = normalizeVariationAttributeKey(key);
      if (cleanKey && select.value) {
        attrs[cleanKey] = select.value;
      }
    });
    return attrs;
  }

  function findMatchingVariation(product, attrs) {
    if (!product || !product.variations || !product.variations.length) {
      return null;
    }
    var cleanAttrs = normalizeVariationAttributesMap(attrs || {});
    return (
      product.variations.find(function (variation) {
        var variationAttrs = normalizeVariationAttributesMap(
          variation && variation.attributes ? variation.attributes : {},
        );
        return Object.keys(cleanAttrs).every(function (key) {
          return variationAttrs[key] === cleanAttrs[key];
        });
      }) || null
    );
  }

  function applySelectedVariationToContext(product, variation, source) {
    if (!product || !variation) {
      return;
    }
    var variationId = variation.id || 0;
    if (!variationId) {
      return;
    }

    function showVariationError(message) {
      var popup = getPopup();
      if (!popup) {
        return;
      }
      var err = popup.querySelector("[data-trizync-pop-cart-variation-error]");
      if (!err) {
        return;
      }
      err.textContent = message || "Please select product options.";
      err.hidden = false;
    }

    function hideVariationError() {
      var popup = getPopup();
      if (!popup) {
        return;
      }
      var err = popup.querySelector("[data-trizync-pop-cart-variation-error]");
      if (!err) {
        return;
      }
      err.hidden = true;
    }

    // Fast client-side check (server will also validate).
    if (variation.is_in_stock === false || variation.is_purchasable === false) {
      showVariationError("Selected option is out of stock.");
      renderErrorMessage("Selected option is out of stock.");
      disableCta();
      if (lightCurrentContext) {
        lightCurrentContext.variationId = 0;
        setState(
          { context: normalizeContext(lightCurrentContext) },
          "variation_out_of_stock",
        );
      }
      return;
    }

    hideVariationError();

    // Keep these in sync so later calls (checkout, shipping, totals) use the right variation.
    product.selected_variation_id = variationId;

    if (!lightCurrentContext) {
      lightCurrentContext = {
        productId: product.id || 0,
        qty: 1,
        variationId: variationId,
        attributes: {},
      };
    }

    lightCurrentContext.productId = product.id || lightCurrentContext.productId;
    lightCurrentContext.variationId = variationId;
    // Always trust variation.attributes (it uses the exact keys Woo expects).
    lightCurrentContext.attributes = normalizeVariationAttributesMap(
      variation.attributes || {},
    );

    setState(
      { context: normalizeContext(lightCurrentContext) },
      source || "variation_change",
    );
    refreshCtaState();

    // Rebuild cart/checkout calculations for the selected variation.
    setOverlayLoading(true);
    prepareCheckout(lightCurrentContext, lightUiState.coupons || [])
      .always(function () {
        setOverlayLoading(false);
      });

    // Refresh product preview so Woo notices like "choose options" disappear.
    getProductInfo(lightCurrentContext, lightUiState.coupons || [])
      .done(function (response) {
        if (response && response.success && response.data) {
          setState({ product: response.data }, "variation_preview");
        }
      })
      .always(function () {
        refreshCtaState();
      });
  }

  function updatePreviewFromVariation(variation, product) {
    var popup = getPopup();
    if (!popup) {
      return;
    }
    var img = popup.querySelector(".trizync-pop-cart__cart-thumb");
    if (img) {
      var imgSrc =
        variation && variation.image
          ? variation.image
          : product
            ? product.image
            : "";
      if (imgSrc) {
        img.src = imgSrc;
      }
    }
    var price = popup.querySelector(".trizync-pop-cart__cart-price");
    if (price) {
      if (variation && variation.price_html) {
        price.innerHTML = variation.price_html;
      }
    }
  }

  function toggleSection(selector, shouldShow) {
    var popup = getPopup();
    if (!popup) {
      return;
    }
    var el = popup.querySelector(selector);
    if (!el) {
      return;
    }
    el.hidden = !shouldShow;
  }

  function showSection(selector) {
    toggleSection(selector, true);
  }

  function hideSection(selector) {
    toggleSection(selector, false);
  }

  function showEmptyCart() {
    showSection("[data-trizync-pop-cart-empty]");
  }

  function hideEmptyCart() {
    hideSection("[data-trizync-pop-cart-empty]");
  }

  function showFieldsSection() {
    showSection("[data-trizync-pop-cart-checkout]");
  }

  function hideFieldsSection() {
    hideSection("[data-trizync-pop-cart-checkout]");
  }

  function enableCta() {
    var popup = getPopup();
    if (!popup) {
      return;
    }
    var cta = popup.querySelector(".trizync-pop-cart__cta");
    if (cta) {
      cta.disabled = false;
      cta.classList.remove("is-disabled");
    }
  }

  function disableCta() {
    var popup = getPopup();
    if (!popup) {
      return;
    }
    var cta = popup.querySelector(".trizync-pop-cart__cta");
    if (cta) {
      cta.disabled = true;
      cta.classList.add("is-disabled");
    }
  }

  function showCartSection() {
    showSection("[data-trizync-pop-cart-cart]");
  }

  function hideCartSection() {
    hideSection("[data-trizync-pop-cart-cart]");
  }

  function showVariationsSection() {
    showSection("[data-trizync-pop-cart-variations]");
  }

  function hideVariationsSection() {
    hideSection("[data-trizync-pop-cart-variations]");
  }

  function showCouponSection() {
    showSection("[data-trizync-pop-cart-coupon]");
  }

  function hideCouponSection() {
    hideSection("[data-trizync-pop-cart-coupon]");
  }

  function clearCouponError() {
    var popup = getPopup();
    if (!popup) {
      return;
    }
    var error = popup.querySelector("[data-trizync-pop-cart-coupon-error]");
    if (!error) {
      return;
    }
    error.hidden = true;
    error.textContent = "";
  }

  function showCouponError(message) {
    var popup = getPopup();
    if (!popup) {
      return;
    }
    var error = popup.querySelector("[data-trizync-pop-cart-coupon-error]");
    if (!error) {
      return;
    }
    error.textContent = decodeHtmlEntities(message || "Unable to apply coupon.");
    error.hidden = false;
  }

  function renderCoupons(coupons) {
    var popup = getPopup();
    if (!popup) {
      return;
    }
    var wrap = popup.querySelector("[data-trizync-pop-cart-coupon]");
    var list = popup.querySelector("[data-trizync-pop-cart-coupon-list]");
    if (!wrap || !list) {
      return;
    }
    list.innerHTML = "";
    clearCouponError();

    // Visibility is store-driven; list rendering is customer-driven.
    var storeHasCoupons =
      !!(window.TrizyncPopCart && TrizyncPopCart.storeHasCoupons);
    if (!storeHasCoupons) {
      hideCouponSection();
      return;
    }
    showCouponSection();

    if (!coupons || !coupons.length) {
      return;
    }

    coupons.forEach(function (coupon) {
      var row = document.createElement("div");
      row.className = "trizync-pop-cart__coupon-item";

      var code = document.createElement("span");
      code.className = "trizync-pop-cart__coupon-code";
      code.textContent = coupon.code || "";

      var amount = document.createElement("span");
      amount.className = "trizync-pop-cart__coupon-amount";
      amount.innerHTML = coupon.amount || "";

      var remove = document.createElement("button");
      remove.type = "button";
      remove.className = "trizync-pop-cart__coupon-remove";
      remove.textContent = "×";
      remove.setAttribute("data-trizync-pop-cart-coupon-remove", "");
      remove.setAttribute("data-coupon-code", coupon.code || "");

      row.appendChild(code);
      row.appendChild(amount);
      row.appendChild(remove);
      list.appendChild(row);
    });
  }

  function showShippingSection() {
    showSection("[data-trizync-pop-cart-shipping]");
  }

  function hideShippingSection() {
    hideSection("[data-trizync-pop-cart-shipping]");
  }

  function showTotalsSection() {
    showSection("[data-trizync-pop-cart-totals]");
  }

  function hideTotalsSection() {
    hideSection("[data-trizync-pop-cart-totals]");
  }

  function showPaymentSection() {
    showSection("[data-trizync-pop-cart-payment]");
  }

  function hidePaymentSection() {
    hideSection("[data-trizync-pop-cart-payment]");
  }

  function updateShippingMethods(shipping) {
    var popup = getPopup();
    if (!popup) {
      return;
    }
    var wrap = popup.querySelector("[data-trizync-pop-cart-shipping]");
    var list = popup.querySelector("[data-trizync-pop-cart-shipping-list]");
    var empty = popup.querySelector("[data-trizync-pop-cart-shipping-empty]");
    var hiddenInput = popup.querySelector(
      "[data-trizync-pop-cart-shipping-input]",
    );

    if (!wrap || !list || !empty) {
      return;
    }
    mergeUiState({ shipping: shipping || null });

    list.innerHTML = "";
    if (!shipping || !shipping.methods || !shipping.methods.length) {
      empty.hidden = false;
      return;
    }

    empty.hidden = true;

    // Source of truth: shipping.chosen (if provided). Otherwise fall back to
    // server-provided `method.selected`, then previous state, then first method.
    var chosenId = (shipping && shipping.chosen) || "";
    if (!chosenId && shipping && Array.isArray(shipping.methods)) {
      var selected = shipping.methods.find(function (m) {
        return !!(m && m.selected);
      });
      if (selected && selected.id) {
        chosenId = selected.id;
      }
    }
    if (!chosenId && lightUiState.shipping && lightUiState.shipping.chosen) {
      chosenId = lightUiState.shipping.chosen;
    }
    if (!chosenId && shipping && shipping.methods && shipping.methods[0]) {
      chosenId = shipping.methods[0].id || "";
    }

    shipping.methods.forEach(function (method) {
      var option = document.createElement("label");
      option.className = "trizync-pop-cart__shipping-option";

      var input = document.createElement("input");
      input.type = "radio";
      input.name = "trizync_pop_cart_shipping";
      input.value = method.id;
      if (typeof method.price_raw !== "undefined") {
        input.setAttribute("data-price-raw", method.price_raw);
      }
      input.checked = !!(chosenId && method.id === chosenId);
      // Keep selected flag consistent (helpful for downstream code).
      method.selected = input.checked;

      var meta = document.createElement("span");
      meta.className = "trizync-pop-cart__shipping-meta";
      var label = document.createElement("span");
      label.className = "trizync-pop-cart__shipping-label";
      label.textContent = method.label || "";
      meta.appendChild(label);

      var price = document.createElement("span");
      price.className = "trizync-pop-cart__shipping-price";
      price.innerHTML = method.price || "";
      meta.appendChild(price);

      option.appendChild(input);
      option.appendChild(meta);
      list.appendChild(option);
    });

    // Normalize chosen id.
    shipping.chosen = chosenId || "";

    if (hiddenInput) {
      hiddenInput.value = chosenId || "";
    }

    if (
      shipping &&
      chosenId &&
      shipping.methods &&
      shipping.methods.length
    ) {
      var chosenMethod = shipping.methods.find(function (method) {
        return method.id === chosenId;
      });
      if (chosenMethod) {
        mergeUiState({ shipping: shipping });
        updateTotalsWithShipping(
          typeof chosenMethod.price_raw !== "undefined"
            ? chosenMethod.price_raw
            : chosenMethod.total_raw || 0,
          chosenMethod.price || "",
        );
      }
    }
  }

  function updatePaymentMethods(payment) {
    var popup = getPopup();
    if (!popup) {
      return;
    }
    var wrap = popup.querySelector("[data-trizync-pop-cart-payment]");
    var list = popup.querySelector("[data-trizync-pop-cart-payment-list]");
    var empty = popup.querySelector("[data-trizync-pop-cart-payment-empty]");
    var hiddenInput = popup.querySelector(
      "[data-trizync-pop-cart-payment-input]",
    );

    if (!wrap || !list || !empty) {
      return;
    }
    mergeUiState({ payment: payment || null });

    list.innerHTML = "";
    if (!payment || !payment.gateways || !payment.gateways.length) {
      empty.hidden = false;
      wrap.hidden = true;
      return;
    }

    empty.hidden = true;
    wrap.hidden = false;

    payment.gateways.forEach(function (gateway) {
      var option = document.createElement("label");
      option.className = "trizync-pop-cart__payment-option";

      var input = document.createElement("input");
      input.type = "radio";
      input.name = "trizync_pop_cart_payment";
      input.value = gateway.id;
      if (gateway.selected) {
        input.checked = true;
      }

      var meta = document.createElement("span");
      meta.className = "trizync-pop-cart__payment-meta";
      var title = document.createElement("span");
      title.className = "trizync-pop-cart__payment-title";
      title.textContent = gateway.title || "";
      meta.appendChild(title);

      if (gateway.description) {
        var desc = document.createElement("span");
        desc.className = "trizync-pop-cart__payment-desc";
        desc.innerHTML = gateway.description;
        meta.appendChild(desc);
      }

      option.appendChild(input);
      option.appendChild(meta);
      list.appendChild(option);
    });

    if (hiddenInput) {
      hiddenInput.value = payment.chosen || "";
    }
  }

  function updateSubtotals(payload) {
    var popup = getPopup();
    // console.log("Attempting to update subtotals.");
    if (!popup) {
      // console.log("Popup not found, cannot update subtotals.");
      return;
    }
    var totals = popup.querySelector("[data-trizync-pop-cart-totals]");
    var subtotal = popup.querySelector("[data-trizync-pop-cart-subtotal]");
    var total = popup.querySelector("[data-trizync-pop-cart-total]");
    var shippingRow = popup.querySelector(
      "[data-trizync-pop-cart-shipping-row]",
    );
    var shippingTotal = popup.querySelector(
      "[data-trizync-pop-cart-shipping-total]",
    );

    // console.log("Updating subtotals with payload:", payload);
    // console.log("Found elements:", {
    //   totals,
    //   subtotal,
    //   total,
    //   shippingRow,
    //   shippingTotal,
    // });
    if (!totals || !subtotal || !total || !shippingRow || !shippingTotal) {
      return;
    }

    if (payload) {
      lastSubtotalPayload = payload;
      mergeUiState({ totals: payload });
      subtotal.innerHTML = payload.subtotal || "";
      total.innerHTML = payload.total || "";
      if (payload.shipping && payload.shipping.total) {
        shippingTotal.innerHTML = payload.shipping.total;
        shippingRow.hidden = false;
      } else {
        shippingTotal.innerHTML = "";
        shippingRow.hidden = true;
      }
    }
  }

  function extractCurrencySymbol(html) {
    if (!html) {
      return "";
    }
    var match = html.match(/woocommerce-Price-currencySymbol[^>]*>([^<]*)</);
    return match ? match[1] : "";
  }

  function formatPriceHtml(amount, templateHtml) {
    var currency = extractCurrencySymbol(templateHtml);
    var formatted = Number(amount || 0).toFixed(2);
    return (
      '<span class="woocommerce-Price-amount amount"><bdi>' +
      formatted +
      '<span class="woocommerce-Price-currencySymbol">' +
      currency +
      "</span></bdi></span>"
    );
  }

  function updateTotalsWithShipping(shippingPriceRaw, shippingPriceHtml) {
    if (!lastSubtotalPayload) {
      return;
    }
    var subtotalRaw =
      typeof lastSubtotalPayload.subtotal_raw !== "undefined"
        ? Number(lastSubtotalPayload.subtotal_raw)
        : 0;
    var prevShippingRaw =
      lastSubtotalPayload.shipping &&
      typeof lastSubtotalPayload.shipping.total_raw !== "undefined"
        ? Number(lastSubtotalPayload.shipping.total_raw)
        : 0;
    var totalRaw =
      typeof lastSubtotalPayload.total_raw !== "undefined"
        ? Number(lastSubtotalPayload.total_raw)
        : subtotalRaw + prevShippingRaw;

    var newTotalRaw =
      totalRaw - prevShippingRaw + Number(shippingPriceRaw || 0);

    var popup = getPopup();
    if (!popup) {
      return;
    }
    var totalEl = popup.querySelector("[data-trizync-pop-cart-total]");
    var shippingTotal = popup.querySelector(
      "[data-trizync-pop-cart-shipping-total]",
    );
    var shippingRow = popup.querySelector(
      "[data-trizync-pop-cart-shipping-row]",
    );
    if (shippingTotal) {
      shippingTotal.innerHTML = shippingPriceHtml || "";
      if (shippingRow) {
        shippingRow.hidden = false;
      }
    }
    if (totalEl) {
      var template =
        lastSubtotalPayload.total || lastSubtotalPayload.subtotal || "";
      totalEl.innerHTML = formatPriceHtml(newTotalRaw, template);
    }
  }

  function setOverlayLoading(isLoading) {
    var popup = getPopup();
    if (!popup) {
      return;
    }
    var overlay = popup.querySelector("[data-trizync-pop-cart-overlay]");
    if (!overlay) {
      return;
    }
    if (isLoading) {
      overlay.removeAttribute("hidden");
    } else {
      overlay.setAttribute("hidden", "hidden");
    }
  }

  function scheduleNoticesAutoHide(noticesEl) {
    if (!noticesEl) {
      return;
    }
    if (noticesClearTimer) {
      clearTimeout(noticesClearTimer);
    }
    noticesClearTimer = setTimeout(function () {
      // Keep it simple: clear the notices container.
      noticesEl.innerHTML = "";
    }, 7000);
  }

  function renderErrorMessage(message) {
    var popup = getPopup();
    if (!popup) {
      return;
    }
    var notices = popup.querySelector(".trizync-pop-cart__notices");
    if (!notices) {
      return;
    }
    var html =
      '<ul class="trizync-pop-cart__notice-list">' +
      '<li class="trizync-pop-cart__notice-item trizync-pop-cart__notice-item--error">' +
      '<span class="trizync-pop-cart__notice-title">Please review</span>' +
      '<span class="trizync-pop-cart__notice-text">' +
      (message || "Something went wrong.") +
      "</span></li></ul>";
    notices.innerHTML = html;
    scheduleNoticesAutoHide(notices);
  }

  function renderNoticesHtml(html) {
    // console.log("Rendering notices with HTML:", html);
    var popup = getPopup();
    if (!popup) {
      return;
    }
    var notices = popup.querySelector(".trizync-pop-cart__notices");
    if (!notices) {
      return;
    }
    var output = html;
    if (output && typeof output === "object") {
      if (output.notices) {
        output = output.notices;
      } else if (output.data && output.data.notices) {
        output = output.data.notices;
      }
    }
    if (!output) {
      return;
    }
    var parser = document.createElement("div");
    parser.innerHTML = output;
    var messageItems = [];
    Array.prototype.forEach.call(parser.querySelectorAll("li"), function (li) {
      var text = (li.textContent || "").trim();
      if (text) {
        messageItems.push(text);
      }
    });
    if (!messageItems.length) {
      var fallback = (parser.textContent || "").trim();
      if (fallback) {
        messageItems.push(fallback);
      }
    }
    if (!messageItems.length) {
      return;
    }
    var htmlOut = '<ul class="trizync-pop-cart__notice-list">';
    messageItems.forEach(function (text) {
      if (!text) {
        return;
      }
      htmlOut +=
        '<li class="trizync-pop-cart__notice-item trizync-pop-cart__notice-item--error">' +
        '<span class="trizync-pop-cart__notice-title">Please review</span>' +
        '<span class="trizync-pop-cart__notice-text">' +
        text +
        "</span></li>";
    });
    htmlOut += "</ul>";
    notices.innerHTML = htmlOut;
    scheduleNoticesAutoHide(notices);
  }

  function getCheckoutContainer() {
    var popup = getPopup();
    if (!popup) {
      return null;
    }
    return popup.querySelector("[data-trizync-pop-cart-checkout]");
  }

  // Inject (or overwrite) a field into the light-flow checkout form inside the popup.
  // This is useful for adding hidden fields (e.g. popcart_* meta) that should be included
  // in the `customer` payload sent during order creation.
  function injectFieldIntoCheckoutForm(name, value, options) {
    options = options || {};
    var container = getCheckoutContainer();
    if (!container) {
      return null;
    }

    var form = container.querySelector("form[data-trizync-pop-cart-form]");
    if (!form) {
      return null;
    }

    var fieldName = String(name || "");
    if (!fieldName) {
      return null;
    }

    var input = form.querySelector('[name="' + fieldName + '"]');
    if (!input) {
      input = document.createElement("input");
      input.name = fieldName;
      input.type = options.type || "hidden";
      input.className =
        "trizync-pop-cart__input trizync-pop-cart__input--hidden";
      input.setAttribute("data-popcart-injected", "1");
      form.appendChild(input);
    }

    // Allow switching input type only for input elements.
    if (options.type && input.type !== options.type) {
      input.type = options.type;
    }

    input.value = value == null ? "" : String(value);
    return input;
  }

  function renderFieldsFromJson(fields) {
    var container = getCheckoutContainer();
    if (!container) {
      return;
    }
    lightUiState.fields = Array.isArray(fields) ? fields : [];
    container.innerHTML = "";
    if (!fields || !fields.length) {
      return;
    }

    var form = document.createElement("form");
    form.className = "trizync-pop-cart__form";
    form.setAttribute("data-trizync-pop-cart-form", "");
    form.setAttribute("novalidate", "novalidate");

    var fieldsWrap = document.createElement("div");
    fieldsWrap.className = "trizync-pop-cart__fields";

    fields.forEach(function (field) {
      var wrap = document.createElement("div");
      wrap.className = "trizync-pop-cart__field";
      wrap.setAttribute("data-field-key", field.key);

      var label = document.createElement("label");
      label.className = "trizync-pop-cart__label";
      label.setAttribute("for", field.key);
      label.textContent = field.label || field.key;
      if (field.required) {
        var req = document.createElement("span");
        req.className = "trizync-pop-cart__required";
        req.textContent = "*";
        label.appendChild(req);
      }
      wrap.appendChild(label);

      var input;
      if (field.type === "select") {
        input = document.createElement("select");
        if (Array.isArray(field.options)) {
          field.options.forEach(function (option) {
            var opt = document.createElement("option");
            opt.value = option.value;
            opt.textContent = option.label || option.value;
            input.appendChild(opt);
          });
        }
      } else if (field.type === "textarea") {
        input = document.createElement("textarea");
      } else {
        input = document.createElement("input");
        input.type = field.type || "text";
      }

      input.id = field.key;
      input.name = field.key;
      input.className = "trizync-pop-cart__input";
      if (field.placeholder) {
        input.setAttribute("placeholder", field.placeholder);
      }
      if (field.required) {
        input.setAttribute("data-required", "1");
        input.setAttribute("aria-required", "true");
        input.setAttribute("required", "required");
      }
      if (field.default && (field.type !== "select" || !input.value)) {
        input.value = field.default;
      }

      wrap.appendChild(input);
      fieldsWrap.appendChild(wrap);
    });

    form.appendChild(fieldsWrap);
    container.appendChild(form);
  }

  function autofillCustomerInfo(customer) {
    var container = getCheckoutContainer();
    if (!container || !customer) {
      return;
    }
    var billing = customer.billing || {};
    var shipping = customer.shipping || {};
    if (!lightUiState.values) {
      lightUiState.values = {};
    }

    Array.prototype.forEach.call(
      container.querySelectorAll(".trizync-pop-cart__input"),
      function (input) {
        var key = input.name || "";
        var value = "";
        if (key.indexOf("billing_") === 0) {
          var billingKey = key.replace("billing_", "");
          value = billing[billingKey] || "";
        } else if (key.indexOf("shipping_") === 0) {
          var shippingKey = key.replace("shipping_", "");
          value = shipping[shippingKey] || "";
        }
        if (value) {
          input.value = value;
          lightUiState.values[key] = value;
        }
      },
    );
  }

  function validateRequiredFields() {
    var container = getCheckoutContainer();
    if (!container) {
      return { ok: true, errors: [] };
    }
    var errors = [];
    Array.prototype.forEach.call(
      container.querySelectorAll(".trizync-pop-cart__field-input"),
      function (input) {
        if (input.getAttribute("data-required") === "1") {
          var value = (input.value || "").trim();
          if (!value) {
            errors.push({
              key: input.name || "",
              message: "Required",
            });
          }
        }
      },
    );
    return {
      ok: errors.length === 0,
      errors: errors,
    };
  }

  function validateRequiredFieldsFromState() {
    var fields = lightUiState.fields || [];
    var values = lightUiState.values || {};
    if (!fields.length) {
      return { ok: true, errors: [] };
    }
    var errors = [];
    fields.forEach(function (field) {
      if (field && field.required) {
        var key = field.key || "";
        var value = (values[key] || "").toString().trim();
        if (!value) {
          errors.push({ key: key, message: "Required" });
        }
      }
    });
    return { ok: errors.length === 0, errors: errors };
  }

  function validateOrderReadinessFromState() {
    var errors = [];

    var popupType =
      (lightUiState.meta && lightUiState.meta.popup_type) || "product";
    if (popupType === "cart") {
      if (!lightUiState.cart || !lightUiState.cart.items || !lightUiState.cart.items.length) {
        errors.push({ key: "cart", message: "Cart is empty" });
      }
    } else {
      if (!lightUiState.product || !lightUiState.product.product) {
        errors.push({ key: "product", message: "Missing product" });
      }
    }

    if (
      lightUiState.product &&
      lightUiState.product.product &&
      lightUiState.product.product.type === "variable"
    ) {
      var ctx = getCheckoutContextFromState();
      if (!ctx || !ctx.variation_id) {
        errors.push({ key: "variation", message: "Missing variation" });
      }
    }

    if (
      !lightUiState.shipping ||
      !lightUiState.shipping.chosen ||
      !lightUiState.shipping.methods ||
      !lightUiState.shipping.methods.length
    ) {
      errors.push({ key: "shipping", message: "Missing shipping method" });
    }

    if (
      !lightUiState.payment ||
      !lightUiState.payment.chosen ||
      !lightUiState.payment.gateways ||
      !lightUiState.payment.gateways.length
    ) {
      errors.push({ key: "payment", message: "Missing payment method" });
    }

    if (!lightUiState.totals) {
      errors.push({ key: "totals", message: "Missing totals" });
    }

    var fieldValidation = validateRequiredFieldsFromState();
    if (!fieldValidation.ok) {
      errors = errors.concat(fieldValidation.errors);
    }

    return { ok: errors.length === 0, errors: errors };
  }

  function collectCustomerPayload() {
    var container = getCheckoutContainer();
    if (!container) {
      return {};
    }
    var payload = {};
    Array.prototype.forEach.call(
      container.querySelectorAll(".trizync-pop-cart__input"),
      function (input) {
        if (input.name) {
          payload[input.name] = input.value || "";
        }
      },
    );
    lightUiState.values = payload;
    return payload;
  }

  function getCheckoutContextFromState() {
    // console.log("Getting checkout context from state:", lightUiState);
    if (lightUiState.context) {
      return normalizeContext(lightUiState.context);
    }
    if (lightCurrentContext) {
      return normalizeContext(lightCurrentContext);
    }
    if (lightUiState.product && lightUiState.product.product) {
      return normalizeContext({
        product_id: lightUiState.product.product.id || 0,
        variation_id: lightUiState.product.product.selected_variation_id || 0,
        quantity:
          (lightUiState.product.items &&
            lightUiState.product.items[0] &&
            lightUiState.product.items[0].quantity) ||
          1,
      });
    }
    return {};
  }

  function wireLightCheckoutFields() {
    return $.when(getEnabledFields(), getCustomerInfo()).then(
      function (fieldsResponse, customerResponse) {
        var fieldsPayload =
          fieldsResponse && fieldsResponse[0]
            ? fieldsResponse[0]
            : fieldsResponse;
        var customerPayload =
          customerResponse && customerResponse[0]
            ? customerResponse[0]
            : customerResponse;
        if (fieldsPayload && fieldsPayload.success) {
          renderFieldsFromJson(
            fieldsPayload.data ? fieldsPayload.data.fields : [],
          );
        }
        if (customerPayload && customerPayload.success) {
          autofillCustomerInfo(customerPayload.data);
        }
        var validation = validateRequiredFields();
        if (validation.ok) {
          enableCta();
        } else {
          disableCta();
        }
      },
    );
  }

  function wireFieldSync() {
    var popup = getPopup();
    if (!popup) {
      return;
    }
    $(popup).on("input change", ".trizync-pop-cart__input", function () {
      var payload = collectCustomerPayload();
      setState({ values: payload }, "field_input");
      pendingCustomerPayload = payload;
      debouncedCustomerSync();
      debouncedInputUpdate();
    });
  }

  function wireCtaSubmit() {
    $(document).on("click", ".trizync-pop-cart__cta", function (event) {
      emitHook("popcart:checkout:attempt", {});
      var validation = validateOrderReadinessFromState();
      if (!validation.ok) {
        event.preventDefault();
        emitHook("popcart:checkout:blocked", { errors: validation.errors });
        return;
      }
      var payload = collectCustomerPayload();
      var context = getCheckoutContextFromState();
      disableCta();
      updateCustomerInfo(payload).always(function () {
        emitHook("popcart:checkout:submit", {});
        createOrder(context, payload, lightUiState.coupons || [])
          .done(function (response) {
            if (
              response &&
              response.result === "success" &&
              response.redirect
            ) {
              emitHook("popcart:checkout:success", {
                redirect: response.redirect,
                order_id: response.order_id || null,
                response: response,
              });
              window.location.href = response.redirect;
              return;
            }
            if (response && response.result === "failure") {
              emitHook("popcart:checkout_error", {
                messages: response.messages || "",
                response: response,
              });
              emitHook("popcart:checkout:error", {
                messages: response.messages || "",
                response: response,
              });
              if (typeof response.messages === "string") {
                renderNoticesHtml(response.messages);
              } else {
                renderErrorMessage("Unable to place order.");
              }
              if (
                typeof response.messages === "string" &&
                response.messages.indexOf(
                  "We were unable to process your order",
                ) !== -1
              ) {
                getNotices().done(function (noticeResponse) {
                  if (
                    noticeResponse &&
                    noticeResponse.success &&
                    noticeResponse.data
                  ) {
                    if (noticeResponse.data.notices) {
                      renderNoticesHtml(noticeResponse.data.notices);
                    }
                  }
                });
              }
            } else {
              emitHook("popcart:checkout_error", { response: response || null });
              emitHook("popcart:checkout:error", { response: response || null });
              renderErrorMessage("Unable to place order.");
            }
            enableCta();
          })
          .fail(function (xhr) {
            var res = xhr && xhr.responseJSON ? xhr.responseJSON : null;
            emitHook("popcart:checkout_error", {
              xhr: xhr || null,
              response: res || null,
            });
            emitHook("popcart:checkout:error", {
              xhr: xhr || null,
              response: res || null,
            });
            if (
              res &&
              res.result === "failure" &&
              typeof res.messages === "string"
            ) {
              renderNoticesHtml(res.messages);
            } else if (res && res.data && res.data.message) {
              renderErrorMessage(res.data.message);
            } else {
              renderErrorMessage("Unable to place order.");
            }
            getNotices().done(function (noticeResponse) {
              if (
                noticeResponse &&
                noticeResponse.success &&
                noticeResponse.data
              ) {
                if (noticeResponse.data.notices) {
                  renderNoticesHtml(noticeResponse.data.notices);
                }
              }
            });
            enableCta();
          });
      });
    });
  }

  window.TrizyncPopCartLight = {
    getCart: getCart,
    getProductInfo: getProductInfo,
    getShippingMethods: getShippingMethods,
    getAppliedShippingMethods: getAppliedShippingMethods,
    getAppliedShippingMethod: getAppliedShippingMethod,
    getCustomerInfo: getCustomerInfo,
    getEnabledFields: getEnabledFields,
    getSubtotal: getSubtotal,
    previewCoupon: previewCoupon,
    updateCustomerInfo: updateCustomerInfo,
    updateSubtotal: updateSubtotal,
    warmSession: warmSession,
    fetchWooCheckoutNonce: fetchWooCheckoutNonce,
    getCheckoutForm: getCheckoutForm,
    getNotices: getNotices,
    prepareCheckout: prepareCheckout,
    createOrder: createOrder,
    injectFieldIntoCheckoutForm: injectFieldIntoCheckoutForm,
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
    setState: setState,
    getState: getState,
    isUiFullyLoaded: isUiFullyLoaded,
    subscribe: subscribe,
    debugState: false,
  };

  // Lifecycle hooks start

  var popcartSessionId =
    "pc_" + Math.random().toString(36).slice(2) + "_" + Date.now();

  function getHookContext(action) {
    return {
      hook: action,
      popup_type:
        (lightUiState &&
          lightUiState.meta &&
          lightUiState.meta.popup_type) ||
        "cart",
      page_url: window.location ? window.location.href : "",
      timestamp: new Date().toISOString(),
      session_id: popcartSessionId,
    };
  }

  function runHookScripts(action, data, context) {
    if (!window.TrizyncPopCart || !TrizyncPopCart.scripts) {
      return;
    }
    if (
      typeof TrizyncPopCart.scriptsEnabled !== "undefined" &&
      !TrizyncPopCart.scriptsEnabled
    ) {
      return;
    }
    var script = TrizyncPopCart.scripts[action];
    if (!script || !script.trim) {
      return;
    }
    var code = script.trim();
    if (!code) {
      return;
    }
    try {
      /* eslint-disable no-new-func */
      new Function("data", "context", code)(data, context);
      /* eslint-enable no-new-func */
    } catch (err) {
      // Keep light flow silent by default (classic shows script errors in UI).
    }
  }

  function buildHookPayload(action, extra) {
    var payload = $.extend({}, extra || {});
    payload.action = action;
    payload.timestamp = new Date().toISOString();
    payload.popup_type =
      (lightUiState && lightUiState.meta && lightUiState.meta.popup_type) ||
      "cart";
    payload.page_url = window.location ? window.location.href : "";
    payload.selection = {
      context: lightUiState && lightUiState.context ? lightUiState.context : {},
      shipping:
        lightUiState && lightUiState.shipping ? lightUiState.shipping.chosen : "",
      payment:
        lightUiState && lightUiState.payment ? lightUiState.payment.chosen : "",
      coupons: normalizeCoupons(lightUiState ? lightUiState.coupons : []),
      values: lightUiState && lightUiState.values ? lightUiState.values : {},
    };
    if (!payload.meta) {
      payload.meta = {};
    }
    if (!payload.meta.session_id) {
      payload.meta.session_id = popcartSessionId;
    }
    return payload;
  }

  function emitHook(action, data) {
    var context = getHookContext(action);
    var payload = buildHookPayload(action, data || {});

    // Trigger from document.body so listeners on either `document.body` or
    // `document` receive it (bubbling), without double-triggering.
    if (typeof jQuery !== "undefined") {
      jQuery(document.body).trigger(action, [payload, context]);
    }

    // Admin-injected scripts (Settings > Scripts).
    runHookScripts(action, payload, context);
  }

  function initLifecycleHooks() {
    emitHook("popcart:boot", {});
  }

  // Lifecycle hooks end

  // UI logic starts here - keep UI handlers below this line.

  function openPopupFlow(trigger) {
    var context = resolveProductContext(trigger);
    // console.log("[popcart light] openPopupFlow context", context);
    lightCurrentContext = context;
    var popupMeta = resolvePopupType(trigger);
    setState(
      {
        context: normalizeContext(context),
        meta: {
          popup_type: popupMeta.type,
          popup_source: popupMeta.source,
        },
      },
      "openPopupFlow",
    );

    // Light flow is custom UI; emit Woo-style lifecycle hooks manually (classic parity).
    emitHook("popcart:open:start", {});
    emitHook("popcart:init_checkout", {});
    emitHook("popcart:woocommerce_before_checkout_form", {});
    emitHook("popcart:woocommerce_checkout_before_customer_details", {});
    emitHook("popcart:woocommerce_checkout_billing", {});
    emitHook("popcart:woocommerce_checkout_shipping", {});
    emitHook("popcart:woocommerce_checkout_after_customer_details", {});
    emitHook("popcart:woocommerce_checkout_before_order_review", {});
    emitHook("popcart:woocommerce_checkout_order_review", {});
    emitHook("popcart:woocommerce_checkout_after_order_review", {});
    emitHook("popcart:woocommerce_after_checkout_form", {});

    hideEmptyCart();
    hideCartSection();
    hideShippingSection();
    hideTotalsSection();
    hidePaymentSection();
    hideCouponSection();
    disableCta();
    setState({ ui: { loaded: false } }, "popup_open");
    openPopup();
    setOverlayLoading(true);
    warmSession().always(function () {
      setOverlayLoading(false);
    });
    fetchWooCheckoutNonce();
    wireLightCheckoutFields();
    wireFieldSync();
    wireCtaSubmit();

    getProductInfo(context, lightUiState.coupons || [])
      .done(function (response) {
        if (response && response.success) {
          setState(
            {
              product: response.data,
              totals: response.data,
              shipping: response.data.shipping || null,
              payment: response.data.payment || null,
              coupons: response.data.coupons || [],
            },
            "product_preview",
          );

          // Variable products: seed initial variation from preview payload (defaults)
          // so prepare checkout doesn't fail with `missing_variation`.
          if (
            response.data &&
            response.data.product &&
            response.data.product.type === "variable" &&
            lightCurrentContext
          ) {
            var selectedId = response.data.product.selected_variation_id || 0;

            // If API chose an out-of-stock default, pick the first available variation.
            if (response.data.product.variations && response.data.product.variations.length) {
              var byId = selectedId
                ? response.data.product.variations.find(function (v) {
                    return v && v.id === selectedId;
                  })
                : null;
              if (byId && (byId.is_in_stock === false || byId.is_purchasable === false)) {
                selectedId = 0;
              }
              if (!selectedId) {
                var firstOk = response.data.product.variations.find(function (v) {
                  return !!(
                    v &&
                    v.id &&
                    v.is_in_stock !== false &&
                    v.is_purchasable !== false
                  );
                });
                if (firstOk) {
                  selectedId = firstOk.id;
                }
              }
            } else if (!selectedId && response.data.product.variations && response.data.product.variations.length === 1) {
              selectedId = response.data.product.variations[0].id || 0;
            }

            if (selectedId && !normalizeContext(lightCurrentContext).variation_id) {
              lightCurrentContext.variationId = selectedId;
              // Best-effort: capture attributes for the selected variation if present.
              if (response.data.product.variations && response.data.product.variations.length) {
                var matchVar = response.data.product.variations.find(function (v) {
                  return v && v.id === selectedId;
                });
                if (matchVar && matchVar.attributes) {
                  lightCurrentContext.attributes = normalizeVariationAttributesMap(
                    matchVar.attributes,
                  );
                }
              }
              setState(
                { context: normalizeContext(lightCurrentContext) },
                "seed_variation_from_preview",
              );
              prepareCheckout(lightCurrentContext, response.data.coupons || []);
            }
          }

          // Ensure subtotal/total reflect applied coupons.
          getSubtotal(context, response.data.coupons || [])
            .done(function (sub) {
              if (sub && sub.success && sub.data) {
                setState({ totals: sub.data }, "subtotal");
              }
            })
            .fail(function () {
              // ignore subtotal failure; product preview already includes totals
            });
        } else {
          renderErrorMessage(
            response && response.data && response.data.message
              ? response.data.message
              : "Unable to load product details.",
          );
        }
      })
      .fail(function () {
        renderErrorMessage("Unable to load product details.");
      })
      .always(function () {
        setOverlayLoading(false);
      });

    getShippingMethods(context)
      .done(function (response) {
        // console.log("[popcart light] shipping methods response", response);
        if (response && response.success && response.data) {
          setState(
            { shipping: response.data.shipping || null },
            "shipping_list",
          );
        }
      })
      .fail(function () {
        renderErrorMessage("Unable to load shipping methods.");
      });

    getCustomerInfo()
      .then(function (customerResponse) {
        var customerPayload =
          customerResponse && customerResponse.success
            ? customerResponse.data
            : {};
        return getAppliedShippingMethods(context, customerPayload);
      })
      .done(function (response) {
        // console.log("[popcart light] applied shipping response", response);
        if (response && response.success && response.data) {
          setState(
            { shipping: response.data.shipping || null },
            "applied_shipping",
          );
        }
      })
      .fail(function () {
        // keep enabled list if applied lookup fails
      });

    // Subtotal is now calculated after product preview so coupons are respected.

    // setTimeout(
    //   () => console.log("current state at end of openPopupFlow:", getState()),
    //   5000,
    // );
  }

  function openCartPopupFlow(trigger) {
    var popupMeta = resolvePopupType(trigger);
    setState(
      {
        context: {
          product_id: 0,
          variation_id: 0,
          quantity: 0,
          attributes: {},
        },
        meta: {
          popup_type: "cart",
          popup_source: popupMeta.source,
        },
      },
      "openCartPopupFlow",
    );

    emitHook("popcart:open:start", {});
    emitHook("popcart:init_checkout", {});
    emitHook("popcart:woocommerce_before_checkout_form", {});
    emitHook("popcart:woocommerce_checkout_before_customer_details", {});
    emitHook("popcart:woocommerce_checkout_billing", {});
    emitHook("popcart:woocommerce_checkout_shipping", {});
    emitHook("popcart:woocommerce_checkout_after_customer_details", {});
    emitHook("popcart:woocommerce_checkout_before_order_review", {});
    emitHook("popcart:woocommerce_checkout_order_review", {});
    emitHook("popcart:woocommerce_checkout_after_order_review", {});
    emitHook("popcart:woocommerce_after_checkout_form", {});

    hideEmptyCart();
    hideCartSection();
    hideShippingSection();
    hideTotalsSection();
    hidePaymentSection();
    hideCouponSection();
    disableCta();
    setState({ ui: { loaded: false } }, "cart_popup_open");
    openPopup();
    setOverlayLoading(true);

    warmSession().always(function () {
      setOverlayLoading(false);
    });
    fetchWooCheckoutNonce();
    wireLightCheckoutFields();
    wireFieldSync();
    wireCtaSubmit();

    warmSession()
      .done(function () {
        return getCart();
      })
      .done(function (response) {
        if (response && response.success && response.data) {
          setState({ cart: response.data }, "cart_payload");
          setState(
            {
              shipping: response.data.shipping || null,
              payment: response.data.payment || null,
              totals: response.data,
              coupons: response.data.coupons || [],
            },
            "cart_payload",
          );
        }
      })
      .fail(function () {})
      .always(function () {
        setOverlayLoading(false);
      });
  }

  initClickListeners(function (event) {
    var trigger =
      event.target && event.target.closest
        ? event.target.closest("[data-trizync-pop-cart-open]")
        : null;
    if (trigger) {
      event.preventDefault();
      var mode =
        trigger.getAttribute("data-trizync-pop-cart-open") || "product";
      if (mode === "cart") {
        openCartPopupFlow(trigger);
      } else {
        openPopupFlow(trigger);
      }
      //   renderDummyPreviewSequence();
    }
    // console.log("Open popup click triggered:", trigger);
  });

  var checkoutSelectors = [
    ".checkout-button",
    ".checkout",
    ".woocommerce-checkout",
    ".order-now",
    ".order-now-button",
    ".confirm-order",
    ".confirm-order-button",
  ];

  var addToCartSelectors = [
    ".add_to_cart_button",
    ".single_add_to_cart_button",
    ".buy-now",
    ".buy-now-button",
    ".order-now",
    ".order-now-button",
    ".confirm-order",
    ".confirm-order-button",
  ];

  function parseCustomSelectors(raw) {
    if (!raw) {
      return [];
    }
    return raw
      .split(/,|\n/)
      .map(function (item) {
        return item.trim();
      })
      .filter(function (item) {
        return item.length > 0;
      });
  }

  function uniqueSelectors(selectors) {
    var seen = {};
    return selectors.filter(function (selector) {
      if (!selector || seen[selector]) {
        return false;
      }
      seen[selector] = true;
      return true;
    });
  }

  if (window.TrizyncPopCart && TrizyncPopCart.customButtonSelectors) {
    var customList = parseCustomSelectors(TrizyncPopCart.customButtonSelectors);
    if (customList.length) {
      checkoutSelectors = uniqueSelectors(checkoutSelectors.concat(customList));
      addToCartSelectors = uniqueSelectors(
        addToCartSelectors.concat(customList),
      );
    }
  }

  function findClosestBySelectors(target, selectors) {
    if (!target || !target.closest) {
      return null;
    }
    return target.closest(selectors.join(","));
  }

  document.addEventListener(
    "click",
    function (event) {
      if (
        event.target &&
        event.target.closest &&
        event.target.closest("#trizync-pop-cart")
      ) {
        return;
      }
      if (!window.TrizyncPopCart || !TrizyncPopCart.replaceAddToCart) {
        return;
      }
      var customTrigger = findClosestBySelectors(
        event.target,
        addToCartSelectors,
      );
      if (customTrigger) {
        if (!customTrigger.getAttribute("data-trizync-pop-cart-open")) {
          customTrigger.setAttribute("data-trizync-pop-cart-open", "product");
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        openPopupFlow(customTrigger);
      }
    },
    true,
  );

  function ensureZyncopsProductAttributes() {
    var nodes = document.querySelectorAll('a[href*="add-to-cart="]');
    nodes.forEach(function (node) {
      if (!node || !node.getAttribute) {
        return;
      }
      var href = node.getAttribute("href") || "";
      var match = href.match(/[?&]add-to-cart=(\d+)/);
      if (!match || !match[1]) {
        return;
      }
      var productId = parseInt(match[1], 10) || 0;
      if (!productId) {
        return;
      }
      if (!node.getAttribute("data-zyncops-post-data-id")) {
        node.setAttribute("data-zyncops-post-data-id", productId.toString());
      }
      if (!node.getAttribute("data-trizync-pop-cart-open")) {
        node.setAttribute("data-trizync-pop-cart-open", "product");
      }
    });
  }

  ensureZyncopsProductAttributes();

  function tagMiniCartCheckoutButtons() {
    var selectors = [
      ".widget_shopping_cart a.checkout",
      ".widget_shopping_cart .checkout-button",
      ".cart-widget-side a.checkout",
      ".cart-widget-side .checkout",
      ".wc-block-mini-cart a.checkout",
      ".wc-block-mini-cart .checkout-button",
      ".mini-cart a.checkout",
      ".mini-cart .checkout-button",
    ];
    selectors.forEach(function (selector) {
      var nodes = document.querySelectorAll(selector);
      nodes.forEach(function (btn) {
        if (!btn || !btn.getAttribute) {
          return;
        }
        if (!btn.getAttribute("data-popcart-source")) {
          btn.setAttribute("data-popcart-source", "mini_cart");
        }
        if (!btn.getAttribute("data-trizync-pop-cart-open")) {
          btn.setAttribute("data-trizync-pop-cart-open", "cart");
        }
      });
    });
  }

  tagMiniCartCheckoutButtons();
  if (window.MutationObserver) {
    var miniCartObserver = new MutationObserver(function () {
      tagMiniCartCheckoutButtons();
    });
    miniCartObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  $(document).on("click", "[data-trizync-pop-cart-close]", function (event) {
    event.preventDefault();
    emitHook("popcart:close", {});
    closePopup();
    emitHook("popcart:cleanup", { cart_restored: null });
  });

  $(document).on(
    "click",
    "[data-trizync-pop-cart-coupon-apply]",
    function () {
      clearCouponError();
      var popup = getPopup();
      if (!popup) {
        return;
      }
      var input = popup.querySelector("[data-trizync-pop-cart-coupon-input]");
      if (!input) {
        return;
      }
      var code = (input.value || "").trim();
      if (!code) {
        showCouponError("Please enter a coupon code.");
        return;
      }

      var ctx = getCheckoutContextFromState();
      setOverlayLoading(true);
      applyCoupon(code, ctx)
        .done(function (response) {
          if (response && response.success && response.data) {
            applyCartStateFromResponse(response, "apply_coupon");
            input.value = "";
            // Keep product preview consistent with applied coupons.
            if (lightCurrentContext) {
              getProductInfo(lightCurrentContext, response.data.coupons || [])
                .done(function (r) {
                  if (r && r.success && r.data) {
                    setState({ product: r.data }, "coupon_preview");
                  }
                })
                .always(function () {
                  refreshCtaState();
                });
            }
          } else if (response && response.data && response.data.message) {
            showCouponError(response.data.message);
          } else {
            showCouponError("Unable to apply coupon.");
          }
        })
        .fail(function (xhr) {
          var message = "Unable to apply coupon.";
          if (
            xhr &&
            xhr.responseJSON &&
            xhr.responseJSON.data &&
            xhr.responseJSON.data.message
          ) {
            message = xhr.responseJSON.data.message;
          }
          showCouponError(message);
        })
        .always(function () {
          setOverlayLoading(false);
        });
    },
  );

  $(document).on(
    "keydown",
    "[data-trizync-pop-cart-coupon-input]",
    function (event) {
      if (event.key !== "Enter") {
        return;
      }
      event.preventDefault();
      var popup = getPopup();
      if (!popup) {
        return;
      }
      var applyBtn = popup.querySelector(
        "[data-trizync-pop-cart-coupon-apply]",
      );
      if (applyBtn) {
        applyBtn.click();
      }
    },
  );

  $(document).on(
    "click",
    "[data-trizync-pop-cart-coupon-remove]",
    function () {
      clearCouponError();
      var code = this.getAttribute("data-coupon-code") || "";
      if (!code) {
        return;
      }
      var ctx = getCheckoutContextFromState();
      setOverlayLoading(true);
      removeCoupon(code, ctx)
        .done(function (response) {
          if (response && response.success && response.data) {
            applyCartStateFromResponse(response, "remove_coupon");
            if (lightCurrentContext) {
              getProductInfo(lightCurrentContext, response.data.coupons || [])
                .done(function (r) {
                  if (r && r.success && r.data) {
                    setState({ product: r.data }, "coupon_preview_remove");
                  }
                })
                .always(function () {
                  refreshCtaState();
                });
            }
          }
        })
        .always(function () {
          setOverlayLoading(false);
        });
    },
  );

  $(document).on(
    "change",
    "[data-trizync-pop-cart-variation-select]",
    function () {
      if (!lightCurrentPayload || !lightCurrentPayload.product) {
        return;
      }
      var attrs = collectVariationAttributes();
      var match = findMatchingVariation(lightCurrentPayload.product, attrs);
      if (match) {
        applySelectedVariationToContext(
          lightCurrentPayload.product,
          match,
          "variation_select",
        );
      } else {
        // Not a complete/valid combination yet.
        lightCurrentPayload.product.selected_variation_id = 0;
        if (lightCurrentContext) {
          lightCurrentContext.variationId = 0;
          lightCurrentContext.attributes = normalizeVariationAttributesMap(attrs);
          setState(
            { context: normalizeContext(lightCurrentContext) },
            "variation_select_incomplete",
          );
          refreshCtaState();
        }
        updatePreviewFromVariation(null, lightCurrentPayload.product);
      }
    },
  );

  $(document).on(
    "click",
    ".trizync-pop-cart__variation-item[data-variation-id]",
    function () {
      if (!lightCurrentPayload || !lightCurrentPayload.product) {
        return;
      }
      var variationId =
        parseInt(this.getAttribute("data-variation-id"), 10) || 0;
      if (!variationId) {
        return;
      }
      lightCurrentPayload.product.selected_variation_id = variationId;
      Array.prototype.forEach.call(
        this.parentNode.querySelectorAll(
          ".trizync-pop-cart__variation-item[data-variation-id]",
        ),
        function (item) {
          item.classList.remove("is-selected");
        },
      );
      this.classList.add("is-selected");
      var radio = this.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
      }
      var match = lightCurrentPayload.product.variations.find(
        function (variation) {
          return variation.id === variationId;
        },
      );
      if (match) {
        applySelectedVariationToContext(
          lightCurrentPayload.product,
          match,
          "variation_click",
        );
      } else {
        updatePreviewFromVariation(null, lightCurrentPayload.product);
      }
    },
  );

  $(document).on(
    "change",
    'input[name="trizync_pop_cart_shipping"]',
    function () {
      var rollbackState = {
        shipping: $.extend(true, {}, lightUiState.shipping || {}),
        totals: $.extend(true, {}, lightUiState.totals || {}),
      };
      var priceRaw = this.getAttribute("data-price-raw");
      var priceHtml = "";
      var option = this.closest(".trizync-pop-cart__shipping-option");
      if (option) {
        var priceEl = option.querySelector(".trizync-pop-cart__shipping-price");
        priceHtml = priceEl ? priceEl.innerHTML : "";
      }
      updateTotalsWithShipping(priceRaw, priceHtml);
      if (lightCurrentContext) {
        setShippingMethod(this.value, lightCurrentContext, rollbackState);
      }
    },
  );

  $(document).on(
    "click",
    ".trizync-pop-cart__qty-btn[data-qty-scope='product']",
    function () {
      var action = this.getAttribute("data-qty-action");
      var wrap = this.closest(".trizync-pop-cart__qty-controls");
      if (!wrap) {
        return;
      }
      var valueEl = wrap.querySelector(".trizync-pop-cart__qty-value");
      var current = valueEl ? parseInt(valueEl.textContent, 10) || 1 : 1;
      var next = current;
      if (action === "increase") {
        next = current + 1;
      } else if (action === "decrease") {
        next = Math.max(1, current - 1);
      }
      if (valueEl) {
        valueEl.textContent = String(next);
      }
      if (lightCurrentContext) {
        lightCurrentContext.quantity = next;
      }

      if (lightCurrentContext) {
        getProductInfo(lightCurrentContext, lightUiState.coupons || [])
          .done(function (response) {
            if (response && response.success) {
              setState({ product: response.data }, "qty_product_preview");
            }
          })
          .fail(function () {
            // keep UI as-is if update fails
          });

        getSubtotal(lightCurrentContext, lightUiState.coupons || [])
          .done(function (response) {
            if (response && response.success && response.data) {
              setState({ totals: response.data }, "qty_subtotal");
            }
          })
          .fail(function () {
            // keep UI as-is if subtotal fails
          });

        debouncedCartSync();
      }
    },
  );

  $(document).on(
    "click",
    ".trizync-pop-cart__qty-btn[data-qty-scope='cart']",
    function () {
      var action = this.getAttribute("data-qty-action");
      var key =
        this.getAttribute("data-cart-item-key") ||
        (this.closest("[data-cart-item-key]")
          ? this.closest("[data-cart-item-key]").getAttribute(
              "data-cart-item-key",
            )
          : "");
      if (!key) {
        return;
      }
      var wrap = this.closest(".trizync-pop-cart__qty-controls");
      if (!wrap) {
        return;
      }
      var valueEl = wrap.querySelector(".trizync-pop-cart__qty-value");
      var current = valueEl ? parseInt(valueEl.textContent, 10) || 1 : 1;
      var next = current;
      if (action === "increase") {
        next = current + 1;
      } else if (action === "decrease") {
        next = Math.max(0, current - 1);
      }
      if (valueEl) {
        valueEl.textContent = String(next);
      }
      updateCartItem(key, next).always(function () {
        refreshCtaState();
      });
    },
  );

  document.addEventListener("trizync_pop_cart:ui_ready", function () {
    if (!lightCurrentContext) {
      return;
    }
    const currentState = getState();

    // Avoid calling prepare checkout before variable products have a variation.
    if (
      currentState &&
      currentState.product &&
      currentState.product.product &&
      currentState.product.product.type === "variable"
    ) {
      var ctx = normalizeContext(lightCurrentContext);
      if (ctx && ctx.variation_id) {
        prepareCheckout(lightCurrentContext, lightUiState.coupons || []);
      }
    } else if (normalizeContext(lightCurrentContext).product_id) {
      prepareCheckout(lightCurrentContext, lightUiState.coupons || []);
    }
    fetchWooCheckoutNonce().done(function (nonceResponse) {
      // console.log("[popcart light] Woo nonce response", nonceResponse);
      // injectFieldIntoCheckoutForm("woocommerce-process-checkout-nonce", nonceResponse,{
      // 	type: "hidden"
      // });

      lightUiState.wc_checkout_nonce = nonceResponse;
    });

    // if(currentState && currentState.payment) {
    // 	injectFieldIntoCheckoutForm("payment_method", currentState.payment.chosen || 'cod', {
    // 		type: "hidden"
    // 	});
    // }

    // if(currentState && currentState.shipping && currentState.shipping.chosen) {
    // 	injectFieldIntoCheckoutForm("shipping_method[0]", currentState.shipping.chosen, {
    // 		type: "hidden"
    // 	});
    // }

    // // Additional fields can be injected here as needed
    // injectFieldIntoCheckoutForm("terms", "on", {
    // 	type: "hidden"
    // });

    injectFieldIntoCheckoutForm("_wp_http_referer", "/checkout/", {
      type: "hidden",
    });
  });

  function renderDummyPreviewSequence() {
    var dummyProductPreview = {
      items: [
        {
          key: "preview",
          product_id: 123,
          sku: "SKU-123",
          name: "Sample Product",
          quantity: 1,
          total:
            '<span class="woocommerce-Price-amount amount"><bdi>100.00<span class="woocommerce-Price-currencySymbol">&#36;</span></bdi></span>',
          line_total_raw: 100,
          price_raw: 100,
          regular_price_raw: 120,
          sale_price_raw: 100,
          image:
            "http://zyncops.com/wp-content/uploads/2025/10/1758300496645.20250919_153450@728958583-150x150.jpg",
          permalink: "#",
        },
      ],
      subtotal:
        '<span class="woocommerce-Price-amount amount"><bdi>100.00<span class="woocommerce-Price-currencySymbol">&#36;</span></bdi></span>',
      subtotal_raw: 100,
      total:
        '<span class="woocommerce-Price-amount amount"><bdi>120.00<span class="woocommerce-Price-currencySymbol">&#36;</span></bdi></span>',
      total_raw: 120,
      shipping: {
        methods: [
          {
            id: "flat_rate:2",
            label: "ঢাকার বাহির",
            price:
              '<span class="woocommerce-Price-amount amount"><bdi>120.00<span class="woocommerce-Price-currencySymbol">৳&nbsp;</span></bdi></span>',
            selected: true,
            method_id: "flat_rate",
          },
          {
            id: "flat_rate:1",
            label: "ঢাকার ভিতর",
            price:
              '<span class="woocommerce-Price-amount amount"><bdi>70.00<span class="woocommerce-Price-currencySymbol">৳&nbsp;</span></bdi></span>',
            selected: false,
            method_id: "flat_rate",
          },
          {
            id: "local_pickup:1",
            label: "স্টোর পিকআপ",
            price:
              '<span class="woocommerce-Price-amount amount"><bdi>0.00<span class="woocommerce-Price-currencySymbol">৳&nbsp;</span></bdi></span>',
            selected: false,
            method_id: "local_pickup",
          },
          {
            id: "express:1",
            label: "এক্সপ্রেস",
            price:
              '<span class="woocommerce-Price-amount amount"><bdi>200.00<span class="woocommerce-Price-currencySymbol">৳&nbsp;</span></bdi></span>',
            selected: false,
            method_id: "express",
          },
          {
            id: "same_day:1",
            label: "সেম ডে",
            price:
              '<span class="woocommerce-Price-amount amount"><bdi>250.00<span class="woocommerce-Price-currencySymbol">৳&nbsp;</span></bdi></span>',
            selected: false,
            method_id: "same_day",
          },
        ],
        chosen: "flat_rate:2",
        total:
          '<span class="woocommerce-Price-amount amount"><bdi>120.00<span class="woocommerce-Price-currencySymbol">৳&nbsp;</span></bdi></span>',
        total_raw: 120,
      },
      payment: {
        gateways: [
          {
            id: "cod",
            title: "Cash on delivery",
            description: "Pay with cash upon delivery.",
            selected: true,
          },
        ],
        chosen: "cod",
      },
      product: {
        id: 123,
        type: "variable",
        name: "Sample Product",
        sku: "SKU-123",
        price_raw: 100,
        regular_price_raw: 120,
        sale_price_raw: 100,
        image:
          "http://zyncops.com/wp-content/uploads/2025/10/1758300496645.20250919_153450@728958583-150x150.jpg",
        permalink: "#",
        attributes: [
          {
            name: "size",
            key: "attribute_size",
            label: "Size",
            options: ["S", "M", "L"],
          },
        ],
        variations: [
          {
            id: 1001,
            sku: "SKU-123-S",
            price_raw: 100,
            regular_price_raw: 120,
            price_html: "",
            image: "",
            is_in_stock: true,
            is_purchasable: true,
            attributes: {
              attribute_size: "S",
            },
          },
          {
            id: 1002,
            sku: "SKU-123-M",
            price_raw: 105,
            regular_price_raw: 120,
            price_html: "",
            image: "",
            is_in_stock: true,
            is_purchasable: true,
            attributes: {
              attribute_size: "M",
            },
          },
        ],
        default_attributes: {
          attribute_size: "S",
        },
        selected_variation_id: 1001,
        selected_attributes: {
          attribute_size: "S",
        },
      },
    };

    var dummySubtotal = {
      subtotal: dummyProductPreview.subtotal,
      subtotal_raw: 100,
      total: dummyProductPreview.total,
      total_raw: 120,
      shipping: dummyProductPreview.shipping,
      shipping_methods: dummyProductPreview.shipping.methods,
      shipping_chosen: dummyProductPreview.shipping.chosen,
    };

    var dummyShipping = dummyProductPreview.shipping;
    var dummyPayment = dummyProductPreview.payment;

    var dummyFields = [
      {
        key: "billing_first_name",
        label: "First name",
        type: "text",
        required: true,
        default: "",
        placeholder: "Your full name",
      },
      {
        key: "billing_last_name",
        label: "Last name",
        type: "text",
        required: false,
        default: "",
        placeholder: "Last name",
      },
      {
        key: "billing_phone",
        label: "Phone",
        type: "tel",
        required: true,
        default: "",
        placeholder: "Phone number",
      },
      {
        key: "billing_address_1",
        label: "Address",
        type: "text",
        required: true,
        default: "",
        placeholder: "Street address",
      },
    ];

    hideCartSection();
    hideShippingSection();
    hideTotalsSection();
    hidePaymentSection();
    hideEmptyCart();
    hideCouponSection();
    disableCta();

    openPopup();
    updateProductInfo(dummyProductPreview);
    updateShippingMethods(dummyShipping);
    updateSubtotals(dummySubtotal);
    updatePaymentMethods(dummyPayment);
    renderFieldsFromJson(dummyFields);

    showCartSection();
    showVariationsSection();
    showShippingSection();
    showTotalsSection();
    showPaymentSection();
  }

  initLifecycleHooks();
})(jQuery);
