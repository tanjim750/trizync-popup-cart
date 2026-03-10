# Trizync Pop Cart Checkout – Product Spec (Draft)

## Purpose
Provide an on-page (popup) WooCommerce checkout that uses WooCommerce’s built-in hooks and flows, without full page reloads. The popup can be opened from a product or from the cart, dynamically reflects cart contents, shipping, totals, and payment methods, and replaces default WooCommerce (and CartFlows) checkout experiences.

## Goals
- Preserve WooCommerce checkout behavior and compatibility by using core hooks.
- Minimize friction: inline checkout with no full page navigation.
- Support product-specific and cart-based entry points with correct quantities.
- Ensure totals, shipping, and payment methods update dynamically and safely.
- Provide admin controls for checkout fields and branding.
- Persist custom field values in order data and display them in admin order details.

## Non-Goals (for MVP)
- Multi-step checkout wizard.
- Subscription or booking-specific flows beyond WooCommerce core.
- Custom payment gateways beyond those already installed.

## Primary User Flows
1. Product-initiated checkout
   - User clicks a “Checkout” button on a product.
   - Popup opens with only that product’s details.
   - Quantity defaults to existing cart quantity if present, otherwise min 1.

2. Cart-initiated checkout
   - User clicks “Checkout” from cart popup/page.
   - Popup opens with all cart products and selected quantities.
   - Each line item can be removed from cart via close icon.

3. Empty cart
   - If cart is empty and user opens from cart, show empty warning with CTA.

## Core Functional Requirements
### Checkout Rendering (WooCommerce hooks)
- Render checkout form using native WooCommerce hook sequence.
- Preserve order creation and validation using WooCommerce APIs.
- Ensure compatibility with third-party extensions that hook into checkout.
- Display customer information from cookie or session or using the WooCommerce APIs if available
- Persist given customer information using WooCommerce APIs

### Shipping Handling
- Detect all available shipping methods for the current address.
- Default selected method should be free shipping or local pickup if available; otherwise the highest cost option every time shipping recalculates.
- Allow user to change methods when available.
- Update totals immediately when shipping changes.

### Payment Methods
- Load all enabled payment gateways for the current cart.
- Hide unavailable gateways (based on cart, totals, currency, etc.).
- Gracefully handle gateways that require page redirect or external UI (redirect to gateway page on submit).

### Cart and Pricing
- Dynamic quantity updates with price recalculation.
- Support coupons/discounts and cart fees (if present).
- Show line item totals, subtotal, shipping, and total in real time.

### Popup Behavior
- Popup opens for product or cart context.
- Close icon appears on line items only when opened from cart.
- No scroll whenever possible; if scroll exists, keep checkout button fixed at bottom with high z-index.
 - No overlay click-to-close; use explicit close actions only.

### Default Checkouts
- Do not disable CartFlows or default WooCommerce checkout pages.
- `/checkout` page remains fully functional.

## UI Requirements
- Modern, user-friendly UI with strong contrast.
- Proper spacing between labels, inputs, and sections.
- Use flex rows for aligned fields and responsive layout.
- Avoid scroll if possible; if unavoidable, keep CTA fixed bottom.
- Branding colors (defaults):
  - Primary: #411264
  - Secondary: #f0a60a
  - Tertiary: #ffffff
 - CTA label must be configurable.

## Settings and Customization
### Field Management
- Add and remove checkout fields.
- Change labels, placeholders, and default values.
- Reorder fields via drag-and-drop (up/down).
 - Field rules: required/optional/conditional.

### Branding
 - Customize branding colors and auto-sync UI tokens to them.
 - Apply branding previews in admin UI as well.

### Enable/Disable
- Global toggle to enable/disable the plugin.

## Data Persistence
- Save custom field values into order meta.
- Display custom fields in WooCommerce order admin view under billing section with a dedicated section.
 - No email template injection for MVP.

## Suggested Architecture (High-level)
- Frontend: popup rendering + AJAX for cart, shipping, totals, and checkout submission.
- Backend: WooCommerce hooks to inject fields, validate, and persist order meta.
- Settings: admin page for field management and branding.
- Compatibility layer: filters to disable CartFlows and default WooCommerce checkout.

## Edge Cases / Worst-Case Scenarios
1. Shipping rate unavailable (no address / no methods)
   - Show warning and prevent order until shipping is resolved.

2. Payment gateway requires full-page redirect
   - Popup should safely redirect the full page after submit.

3. Product is out of stock or quantity exceeds stock
   - Surface error, correct quantity automatically, or block checkout.

4. Price changes while popup is open
   - Recalculate totals on any update; notify user if price changes.

5. Cart updated elsewhere (another tab)
   - Detect cart hash mismatch; refresh popup state.

6. Coupons and fees applied by plugins
   - Ensure totals API reflects all rules; don’t double-apply.

7. Shipping default rule (max cost)
   - Ensure default selection respects WooCommerce availability and user selection if already set.

8. Address-dependent taxes
   - Totals change after billing/shipping address update; recalc immediately.

9. Guest checkout vs logged-in
   - Support both; prefill billing fields for logged-in users.

10. Very large cart
   - Performance: rendering and recalculations must be efficient, avoid blocking UI.

11. Conflicts with other checkout customizations
   - If other plugins add custom fields or validation, ensure compatibility or show clear error.

12. Mobile viewport constraints
   - Fixed CTA should not cover fields; test for usable viewport height.

## Open Questions (to confirm before implementation)
- Shipping methods: if the user previously selected a method, should we always override with the default rule on recalculation, or preserve their prior selection?

## Implementation Checklist (later)
## Implementation Checklist (ordered, one-by-one)
1. Core plugin scaffold for popup checkout
   - Register scripts/styles, base shortcode or trigger hook
   - Add global enable/disable toggle

2. Popup UI shell (empty state)
   - Responsive modal layout with fixed CTA support
   - Branding color tokens wired to defaults
   - Close controls (no overlay close)

3. Entry point: product checkout
   - Hook product “Checkout” button
   - Open popup with single product data
   - Quantity defaults to cart qty if present, else 1

4. Entry point: cart checkout
   - Hook cart checkout button
   - Open popup with full cart contents
   - Per-line remove icon (cart-only)
   - Empty cart warning

5. Cart/quantity engine
   - AJAX cart fetch, update quantities, remove items
   - Dynamic pricing, subtotal updates
   - Cart hash/state refresh

6. Shipping engine
   - AJAX fetch shipping methods
   - Default selection rule: free/local pickup if available, else max cost
   - Recalculate totals on shipping change

7. Payment engine
   - List all available gateways
   - Handle unavailable gateways gracefully
   - Redirect to gateway page on submit

8. Checkout form rendering (WooCommerce hooks)
   - Render billing fields in popup
   - Prefill customer data from WooCommerce
   - Validation errors inline (warning under field + autofocus)

9. Custom fields manager (admin)
   - Add/remove fields
   - Label/placeholder/default value
   - Required/optional/conditional rules
   - Drag-and-drop reorder

10. Branding & UI settings (admin)
   - Branding color overrides + admin preview
   - CTA label config

11. Order meta persistence + admin display
   - Save custom field values
   - Display under billing section in order admin

12. Compatibility and QA
   - Ensure default WooCommerce/CartFlows checkout still works
   - Test common gateways, shipping, taxes, coupons
