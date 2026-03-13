# Trizync Pop Cart

Pop‑up checkout for WooCommerce with a fast, branded checkout drawer that supports cart and single‑product flows.

## Requirements
- WordPress 6.x+
- WooCommerce 7.x+

## Installation
1. Upload the plugin folder to `wp-content/plugins/trizync-pop-cart`.
2. Activate **Trizync Pop Cart** in **Plugins**.
3. Open **Pop Cart Settings** in the WP admin sidebar.

## Key Features
- Popup checkout for cart and single product flows.
- Optional “Replace Add‑to‑Cart” behavior.
- Optional product‑page checkout button.
- Coupon apply/remove inside the popup.
- Shipping method selection.
- Cash on Delivery flow inside the popup.
- Custom checkout fields manager with live preview.
- Branding controls (primary/secondary/tertiary colors + header text).
- Custom script slots for analytics and integrations.

## Admin Settings
All settings are under **Pop Cart Settings** in WP Admin → **Settings** → **Pop Cart**.

### General
- **Status**: Enable/disable popup checkout.
- **Replace Add‑to‑Cart**: When enabled, the popup opens instead of the default add‑to‑cart flow.
- **Replace Add‑to‑Cart Label**: Button label used for replacement.
- **Product Button**: Optional “Checkout” button on single product pages.
- **Product Button Label**: Label for the product‑page button.
- **Header Eyebrow / Title**: Text shown in the popup header.
- **CTA Label**: Text for the “Proceed to Checkout” button.

### Branding
Override brand colors used in the popup UI:
- Primary
- Secondary
- Tertiary

### Custom Fields Manager
Controls which checkout fields appear in the popup. Default fields are always present:
- Full Name
- Phone
- Email
- Address
- City
- Postcode
- Country
- State

You can add custom fields (text, textarea, select). Values are saved to the order and displayed in the order admin.

### Custom Scripts
You can attach JavaScript snippets to Pop Cart lifecycle slots. Scripts run in the browser within the popup context and receive a data object with current cart and product context.

Recommended uses:
- Analytics events (Initiate Checkout, Purchase, etc.)
- Third‑party widgets or tracking
- Custom logic needed for your storefront

#### Available Hooks
Use these hook names in the Custom Scripts dropdown:
- `popcart:boot`
- `popcart:open:start`
- `popcart:checkout:attempt`
- `popcart:checkout:blocked`
- `popcart:checkout:submit`
- `popcart:checkout:error`
- `popcart:checkout:success`
- `popcart:close`
- `popcart:cleanup`
- `popcart:init_checkout`
- `popcart:updated_checkout`
- `popcart:update_checkout`
- `popcart:checkout_error`
- `popcart:woocommerce_before_checkout_form`
- `popcart:woocommerce_checkout_before_customer_details`
- `popcart:woocommerce_checkout_billing`
- `popcart:woocommerce_checkout_shipping`
- `popcart:woocommerce_checkout_after_customer_details`
- `popcart:woocommerce_checkout_before_order_review`
- `popcart:woocommerce_checkout_order_review`
- `popcart:woocommerce_checkout_after_order_review`
- `popcart:woocommerce_after_checkout_form`

#### Payload (What You Receive)
Every hook provides a data object with the current cart and product context. Typical fields:
- `action` (hook name)
- `popup_type` (`cart` or `product`)
- `cart` (items_count, qty_total, subtotal, total, currency)
- `cart_items` (product list with id, name, qty, price, image, permalink)
- `product` (selected product for product popup)
- `selection` (variation_id + attributes when applicable)
- `errors` (array of error messages if any)
- `page_url` (current page URL)
- `timestamp` and `meta.session_id`

#### Example Script
```js
// Example: Google Analytics begin_checkout + simple console log
if (typeof gtag === 'function') {
  gtag('event', 'begin_checkout', {
    currency: data.cart?.currency,
    value: data.cart?.total_raw,
    items: data.cart_items || []
  });
}
console.log('Pop Cart hook:', data.action, data);
```

## How to Use
1. Enable **Status** in **General**.
2. Choose whether to **Replace Add‑to‑Cart** or use the optional **Product Button**.
3. Customize the header text and CTA label.
4. Set branding colors.
5. Configure checkout fields in **Custom Fields Manager**.
6. Add optional scripts in **Custom Scripts**.

## Troubleshooting
- **Popup not opening**: Ensure the plugin is enabled and the button settings are configured.
- **No shipping methods**: Confirm shipping zones and customer address fields are set.
- **Coupons not applied**: Check coupon validity and usage limits.

## Notes
This README focuses on usage and configuration. For advanced customization, use the Custom Scripts section in the admin panel.

## About ZyncOps
Pop Cart is built by ZyncOps, the e‑commerce growth team at Trizync. If you want hands‑on help to improve conversion, optimize checkout flow, or ship custom WooCommerce features, ZyncOps can help you move faster without disrupting your current store.

**Contact**: 01873316706  
**Website**: `https://triizync.com/`
