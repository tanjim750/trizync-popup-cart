<?php

/**
 * The public-facing functionality of the plugin.
 *
 * @link       https://triizync.com
 * @since      1.0.0
 *
 * @package    Trizync_Pop_Cart
 * @subpackage Trizync_Pop_Cart/public
 */

/**
 * The public-facing functionality of the plugin.
 *
 * Defines the plugin name, version, and two examples hooks for how to
 * enqueue the public-facing stylesheet and JavaScript.
 *
 * @package    Trizync_Pop_Cart
 * @subpackage Trizync_Pop_Cart/public
 * @author     Trizync Solution <trizyncsolution@gmail.com>
 */
class Trizync_Pop_Cart_Public {

	/**
	 * The ID of this plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 * @var      string    $plugin_name    The ID of this plugin.
	 */
	private $plugin_name;

	/**
	 * The version of this plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 * @var      string    $version    The current version of this plugin.
	 */
	private $version;

	/**
	 * Initialize the class and set its properties.
	 *
	 * @since    1.0.0
	 * @param      string    $plugin_name       The name of the plugin.
	 * @param      string    $version    The version of this plugin.
	 */
	public function __construct( $plugin_name, $version ) {

		$this->plugin_name = $plugin_name;
		$this->version = $version;

	}

	/**
	 * Register the stylesheets for the public-facing side of the site.
	 *
	 * @since    1.0.0
	 */
	public function enqueue_styles() {

		/**
		 * This function is provided for demonstration purposes only.
		 *
		 * An instance of this class should be passed to the run() function
		 * defined in Trizync_Pop_Cart_Loader as all of the hooks are defined
		 * in that particular class.
		 *
		 * The Trizync_Pop_Cart_Loader will then create the relationship
		 * between the defined hooks and the functions defined in this
		 * class.
		 */

		if ( ! $this->is_enabled() ) {
			return;
		}

		wp_enqueue_style( $this->plugin_name, plugin_dir_url( __FILE__ ) . 'css/trizync-pop-cart-public.css', array(), $this->version, 'all' );

		$branding = $this->get_branding_settings();
		$primary_rgb = $this->hex_to_rgb( $branding['primary'] );
		$secondary_rgb = $this->hex_to_rgb( $branding['secondary'] );
		$tertiary_rgb = $this->hex_to_rgb( $branding['tertiary'] );
		$css = ':root{--trizync-primary:' . esc_attr( $branding['primary'] ) . ';--trizync-secondary:' . esc_attr( $branding['secondary'] ) . ';--trizync-tertiary:' . esc_attr( $branding['tertiary'] ) . ';--trizync-primary-rgb:' . esc_attr( $primary_rgb ) . ';--trizync-secondary-rgb:' . esc_attr( $secondary_rgb ) . ';--trizync-tertiary-rgb:' . esc_attr( $tertiary_rgb ) . ';}';
		wp_add_inline_style( $this->plugin_name, $css );

	}

	/**
	 * Register the JavaScript for the public-facing side of the site.
	 *
	 * @since    1.0.0
	 */
	public function enqueue_scripts() {

		/**
		 * This function is provided for demonstration purposes only.
		 *
		 * An instance of this class should be passed to the run() function
		 * defined in Trizync_Pop_Cart_Loader as all of the hooks are defined
		 * in that particular class.
		 *
		 * The Trizync_Pop_Cart_Loader will then create the relationship
		 * between the defined hooks and the functions defined in this
		 * class.
		 */

		if ( ! $this->is_enabled() ) {
			return;
		}

		$flow_mode = $this->get_flow_mode();
		$script_handle = $this->plugin_name;
		$script_src = 'js/trizync-pop-cart-public.js';
		if ( 'light' === $flow_mode ) {
			$script_handle = $this->plugin_name . '-light';
			$script_src = 'js/trizync-pop-cart-light.js';
		}

		wp_enqueue_script( $script_handle, plugin_dir_url( __FILE__ ) . $script_src, array( 'jquery' ), $this->version, true );
		wp_localize_script(
			$script_handle,
			'TrizyncPopCart',
			array(
				'enabled'  => 1,
				'ajaxUrl'  => admin_url( 'admin-ajax.php' ),
				'nonce'    => wp_create_nonce( Trizync_Pop_Cart_Nonces::CLASSIC ),
				'nonce_preview'  => wp_create_nonce( Trizync_Pop_Cart_Nonces::PREVIEW ),
				'nonce_checkout' => wp_create_nonce( Trizync_Pop_Cart_Nonces::CHECKOUT ),
				'cartHash' => function_exists( 'WC' ) && WC()->cart ? WC()->cart->get_cart_hash() : '',
				'currency' => function_exists( 'get_woocommerce_currency' ) ? get_woocommerce_currency() : '',
				'flowMode' => $flow_mode,
				'scripts'  => $this->get_scripts_settings(),
				'scriptsEnabled' => (bool) (int) get_option( TRIZYNC_POP_CART_OPTION_SCRIPTS_ENABLED, 1 ),
				'replaceAddToCart' => $this->is_replace_add_to_cart_enabled(),
				'replaceAddToCartLabel' => $this->get_replace_add_to_cart_label(),
				'customButtonSelectors' => get_option( TRIZYNC_POP_CART_OPTION_BUTTON_SELECTORS, '' ),
				'branding' => array_merge(
					$this->get_branding_settings(),
					array(
						'primaryRgb'   => $this->hex_to_rgb( $this->get_branding_settings()['primary'] ),
						'secondaryRgb' => $this->hex_to_rgb( $this->get_branding_settings()['secondary'] ),
						'tertiaryRgb'  => $this->hex_to_rgb( $this->get_branding_settings()['tertiary'] ),
					)
				),
			)
		);

	}

	/**
	 * Get flow mode.
	 *
	 * @since 1.0.0
	 * @return string
	 */
	public function get_flow_mode() {
		if( defined('TRIZYNC_POP_CART_FLOW_MODE_DEFAULT') && TRIZYNC_POP_CART_FLOW_MODE_DEFAULT ) {
			return TRIZYNC_POP_CART_FLOW_MODE_DEFAULT;
		}
		
		if ( ! defined( 'TRIZYNC_POP_CART_OPTION_FLOW_MODE' ) ) {
			return 'classic';
		}
		$mode = get_option( TRIZYNC_POP_CART_OPTION_FLOW_MODE, 'classic' );
		$mode = is_string( $mode ) ? strtolower( trim( $mode ) ) : 'classic';
		return in_array( $mode, array( 'classic', 'light' ), true ) ? $mode : 'classic';
	}

	/**
	 * Check if classic flow is enabled.
	 *
	 * @since 1.0.0
	 * @return bool
	 */
	public function is_classic_flow() {
		return 'classic' === $this->get_flow_mode();
	}

	/**
	 * Register public shortcodes.
	 *
	 * @since    1.0.0
	 */
	public function register_shortcodes() {
		add_shortcode( 'trizync_pop_cart', array( $this, 'render_shortcode' ) );
	}

	/**
	 * Render a popup trigger button.
	 *
	 * @since    1.0.0
	 * @param array $atts Shortcode attributes.
	 * @return string
	 */
	public function render_shortcode( $atts ) {
		if ( ! $this->is_enabled() ) {
			return '';
		}

		$atts = shortcode_atts(
			array(
				'label' => __( 'Checkout', 'trizync-pop-cart' ),
			),
			$atts,
			'trizync_pop_cart'
		);

		$label = esc_html( $atts['label'] );

		return sprintf(
			'<button type="button" class="trizync-pop-cart-trigger" data-trizync-pop-cart-open="generic">%s</button>',
			$label
		);
	}

	/**
	 * Render checkout button on single product pages.
	 *
	 * @since    1.0.0
	 */
	public function render_product_checkout_button() {
		if ( ! $this->is_enabled() || ! $this->is_product_button_enabled() || ! function_exists( 'is_product' ) || ! is_product() ) {
			return;
		}

		if ( ! function_exists( 'wc_get_product' ) ) {
			return;
		}

		global $product;

		if ( ! $product || ! $product instanceof WC_Product ) {
			return;
		}

		$product_id   = $product->get_id();
		$product_name = $product->get_name();
		$quantity     = $this->get_cart_quantity_for_product( $product_id );

		printf(
			'<button type="button" class="trizync-pop-cart-trigger trizync-pop-cart-trigger--product trizync-pop-cart-trigger--brand" data-trizync-pop-cart-open="product" data-product-id="%d" data-product-name="%s" data-quantity="%d">%s</button>',
			(int) $product_id,
			esc_attr( $product_name ),
			(int) $quantity,
			esc_html( $this->get_product_button_label() )
		);
	}

	/**
	 * Add popup trigger data attributes to loop add-to-cart links.
	 *
	 * @since 1.0.0
	 * @param string      $button  HTML for the loop button.
	 * @param WC_Product  $product Product object.
	 * @return string
	 */
	public function decorate_loop_add_to_cart_link( $button, $product ) {
		if ( ! $this->is_enabled() || ! $this->is_replace_add_to_cart_enabled() || ! $product instanceof WC_Product ) {
			return $button;
		}

		$product_id   = $product->get_id();
		$product_name = $product->get_name();
		$quantity     = $this->get_cart_quantity_for_product( $product_id );

		$looks_like_add_to_cart = false !== strpos( $button, 'add_to_cart_button' )
			|| false !== strpos( $button, 'ajax_add_to_cart' )
			|| false !== strpos( $button, 'data-product_id' )
			|| false !== strpos( $button, 'add-to-cart=' );

		if ( ! $looks_like_add_to_cart ) {
			return $button;
		}

		$attributes = sprintf(
			' data-trizync-pop-cart-open="product" data-product-id="%d" data-zyncops-post-data-id="%d" data-product-name="%s" data-quantity="%d"',
			(int) $product_id,
			(int) $product_id,
			esc_attr( $product_name ),
			(int) $quantity
		);

		if ( false !== strpos( $button, 'data-trizync-pop-cart-open' ) ) {
			return $button;
		}

		$button = preg_replace( '/<a\s/i', '<a' . $attributes . ' ', $button, 1 );

		if ( $this->is_replace_add_to_cart_enabled() ) {
			$label = esc_html( $this->get_replace_add_to_cart_label() );
			$button = preg_replace( '/>(.*?)<\/a>/s', '><span class="trizync-pop-cart__label">' . $label . '</span></a>', $button, 1 );
		}

		return $button;
	}

	/**
	 * Override the default product loop link opener to add data attribute.
	 *
	 * @since 1.0.0
	 */
	public function override_loop_product_link_open() {
		if ( ! $this->is_enabled() ) {
			return;
		}
		if ( ! function_exists( 'remove_action' ) || ! function_exists( 'add_action' ) ) {
			return;
		}
		remove_action( 'woocommerce_before_shop_loop_item', 'woocommerce_template_loop_product_link_open', 10 );
		add_action( 'woocommerce_before_shop_loop_item', array( $this, 'render_loop_product_link_open' ), 10 );
	}

	/**
	 * Render product loop link opener with zyncops product id attribute.
	 *
	 * @since 1.0.0
	 */
	public function render_loop_product_link_open() {
		if ( ! function_exists( 'wc_get_product' ) ) {
			return;
		}

		global $product;
		if ( ! $product instanceof WC_Product ) {
			return;
		}

		$product_id = $product->get_id();
		$link = apply_filters( 'woocommerce_loop_product_link', get_the_permalink(), $product );
		printf(
			'<a href="%1$s" class="woocommerce-LoopProduct-link woocommerce-loop-product__link" data-zyncops-post-data-id="%2$d">',
			esc_url( $link ),
			(int) $product_id
		);
	}

	/**
	 * Filter add to cart text in loops.
	 *
	 * @since 1.0.0
	 * @param string $text
	 * @return string
	 */
	public function filter_loop_add_to_cart_text( $text ) {
		if ( ! $this->is_enabled() || ! $this->is_replace_add_to_cart_enabled() ) {
			return $text;
		}
		return $this->get_replace_add_to_cart_label();
	}

	/**
	 * Filter add to cart text on single product.
	 *
	 * @since 1.0.0
	 * @param string $text
	 * @return string
	 */
	public function filter_single_add_to_cart_text( $text ) {
		if ( ! $this->is_enabled() || ! $this->is_replace_add_to_cart_enabled() ) {
			return $text;
		}
		return $this->get_replace_add_to_cart_label();
	}

	/**
	 * Render the popup shell at the footer.
	 *
	 * @since    1.0.0
	 */
	public function render_popup_shell() {
		if ( ! $this->is_enabled() ) {
			return;
		}
		$branding = $this->get_branding_settings();
		$style = sprintf(
			'--trizync-primary:%1$s;--trizync-secondary:%2$s;--trizync-tertiary:%3$s;--trizync-primary-rgb:%4$s;--trizync-secondary-rgb:%5$s;--trizync-tertiary-rgb:%6$s;',
			esc_attr( $branding['primary'] ),
			esc_attr( $branding['secondary'] ),
			esc_attr( $branding['tertiary'] ),
			esc_attr( $this->hex_to_rgb( $branding['primary'] ) ),
			esc_attr( $this->hex_to_rgb( $branding['secondary'] ) ),
			esc_attr( $this->hex_to_rgb( $branding['tertiary'] ) )
		);
		?>
		<div id="trizync-pop-cart" class="trizync-pop-cart" aria-hidden="true" style="<?php echo $style; ?>">
			<div class="trizync-pop-cart__panel" role="dialog" aria-modal="true" aria-labelledby="trizync-pop-cart-title">
				<div class="trizync-pop-cart__overlay-loading" data-trizync-pop-cart-overlay hidden>
					<span class="trizync-pop-cart__spinner" aria-hidden="true"></span>
					<span><?php esc_html_e( 'Loading checkout details…', 'trizync-pop-cart' ); ?></span>
				</div>
				<div class="trizync-pop-cart__header">
					<div>
						<p class="trizync-pop-cart__eyebrow"><?php echo esc_html( $this->get_header_eyebrow() ); ?></p>
						<h2 id="trizync-pop-cart-title" class="trizync-pop-cart__title"><?php echo esc_html( $this->get_header_title() ); ?></h2>
					</div>
					<button type="button" class="trizync-pop-cart__close" data-trizync-pop-cart-close aria-label="<?php esc_attr_e( 'Close popup', 'trizync-pop-cart' ); ?>">×</button>
				</div>
				<div class="trizync-pop-cart__body">
					<div class="trizync-pop-cart__layout">
						<div class="trizync-pop-cart__left">
							<div class="trizync-pop-cart__cart" data-trizync-pop-cart-cart hidden>
								<p class="trizync-pop-cart__section-label" data-trizync-pop-cart-cart-label><?php esc_html_e( 'Cart items', 'trizync-pop-cart' ); ?></p>
								<div class="trizync-pop-cart__cart-empty" data-trizync-pop-cart-empty>
									<p class="trizync-pop-cart__cart-empty-title"><?php esc_html_e( 'Your cart is empty', 'trizync-pop-cart' ); ?></p>
									<p class="trizync-pop-cart__cart-empty-text"><?php esc_html_e( 'Add items to your cart before checking out.', 'trizync-pop-cart' ); ?></p>
								</div>
								<ul class="trizync-pop-cart__cart-list" data-trizync-pop-cart-list></ul>
								<div class="trizync-pop-cart__variations" data-trizync-pop-cart-variations hidden>
									<p class="trizync-pop-cart__section-label"><?php esc_html_e( 'Choose options', 'trizync-pop-cart' ); ?></p>
									<div class="trizync-pop-cart__variation-list" data-trizync-pop-cart-variation-list></div>
									<p class="trizync-pop-cart__variation-error" data-trizync-pop-cart-variation-error hidden><?php esc_html_e( 'Please select product options.', 'trizync-pop-cart' ); ?></p>
								</div>
								<div class="trizync-pop-cart__coupon" data-trizync-pop-cart-coupon>
									<p class="trizync-pop-cart__section-label"><?php esc_html_e( 'Coupon', 'trizync-pop-cart' ); ?></p>
									<div class="trizync-pop-cart__coupon-form">
										<input type="text" class="trizync-pop-cart__coupon-input" placeholder="<?php esc_attr_e( 'Enter coupon code', 'trizync-pop-cart' ); ?>" data-trizync-pop-cart-coupon-input>
										<button type="button" class="trizync-pop-cart__coupon-apply" data-trizync-pop-cart-coupon-apply><?php esc_html_e( 'Apply', 'trizync-pop-cart' ); ?></button>
									</div>
									<p class="trizync-pop-cart__coupon-error" data-trizync-pop-cart-coupon-error hidden></p>
									<div class="trizync-pop-cart__coupon-list" data-trizync-pop-cart-coupon-list></div>
								</div>
								<div class="trizync-pop-cart__shipping" data-trizync-pop-cart-shipping hidden>
									<p class="trizync-pop-cart__section-label"><?php esc_html_e( 'Shipping method', 'trizync-pop-cart' ); ?></p>
									<div class="trizync-pop-cart__shipping-empty" data-trizync-pop-cart-shipping-empty hidden>
										<?php esc_html_e( 'No shipping methods available. Please add your address.', 'trizync-pop-cart' ); ?>
									</div>
									<div class="trizync-pop-cart__shipping-list" data-trizync-pop-cart-shipping-list></div>
								</div>
								<div class="trizync-pop-cart__cart-totals" data-trizync-pop-cart-totals hidden>
									<div class="trizync-pop-cart__total-row trizync-pop-cart__total-row--shipping" data-trizync-pop-cart-shipping-row hidden>
										<span><?php esc_html_e( 'Shipping', 'trizync-pop-cart' ); ?></span>
										<strong data-trizync-pop-cart-shipping-total></strong>
									</div>
									<div class="trizync-pop-cart__total-row">
										<span><?php esc_html_e( 'Subtotal', 'trizync-pop-cart' ); ?></span>
										<strong data-trizync-pop-cart-subtotal></strong>
									</div>
									<div class="trizync-pop-cart__total-row trizync-pop-cart__total-row--grand">
										<span><?php esc_html_e( 'Total', 'trizync-pop-cart' ); ?></span>
										<strong data-trizync-pop-cart-total></strong>
									</div>
								</div>
								<div class="trizync-pop-cart__payment" data-trizync-pop-cart-payment hidden>
									<p class="trizync-pop-cart__section-label"><?php esc_html_e( 'Payment method', 'trizync-pop-cart' ); ?></p>
									<div class="trizync-pop-cart__payment-empty" data-trizync-pop-cart-payment-empty hidden>
										<?php esc_html_e( 'No payment methods available.', 'trizync-pop-cart' ); ?>
									</div>
									<div class="trizync-pop-cart__payment-list" data-trizync-pop-cart-payment-list></div>
								</div>
							</div>
						</div>
					<div class="trizync-pop-cart__right">
						<div class="trizync-pop-cart__notices"></div>
							<div class="trizync-pop-cart__checkout" data-trizync-pop-cart-checkout></div>
						</div>
					</div>
				</div>
				<div class="trizync-pop-cart__footer">
					<div class="trizync-pop-cart__script-error" data-trizync-pop-cart-script-error hidden></div>
					<button type="button" class="trizync-pop-cart__cta" disabled="disabled"><?php echo esc_html( $this->get_cta_label() ); ?></button>
				</div>
			</div>
		</div>
		<?php
	}

	/**
	 * Apply checkout field filters for Pop Cart checkout requests.
	 *
	 * @since 1.0.0
	 */
	public function maybe_enable_popcart_checkout_filters() {
		if ( empty( $_REQUEST['trizync_pop_cart'] ) ) {
			return;
		}
		add_filter( 'woocommerce_checkout_fields', array( $this, 'filter_checkout_fields' ) );
		add_filter( 'woocommerce_checkout_fields', array( $this, 'maybe_remove_billing_heading' ) );
	}

	/**
	 * Check if popup checkout is enabled.
	 *
	 * @since    1.0.0
	 * @return bool
	 */
	protected function is_enabled() {
		return (bool) (int) get_option( TRIZYNC_POP_CART_OPTION_ENABLED, 1 );
	}

	/**
	 * Check if product popup button is enabled.
	 *
	 * @since 1.0.0
	 * @return bool
	 */
	protected function is_product_button_enabled() {
		return (bool) (int) get_option( TRIZYNC_POP_CART_OPTION_PRODUCT_BUTTON, 0 );
	}

	/**
	 * Check if Add to Cart buttons should be replaced.
	 *
	 * @since 1.0.0
	 * @return bool
	 */
	protected function is_replace_add_to_cart_enabled() {
		return (bool) (int) get_option( TRIZYNC_POP_CART_OPTION_REPLACE_ATC, 0 );
	}

	/**
	 * Get custom Add to Cart label.
	 *
	 * @since 1.0.0
	 * @return string
	 */
	protected function get_replace_add_to_cart_label() {
		$label = get_option( TRIZYNC_POP_CART_OPTION_REPLACE_ATC_LABEL, __( 'Checkout', 'trizync-pop-cart' ) );
		return $label ? $label : __( 'Checkout', 'trizync-pop-cart' );
	}

	/**
	 * Get product popup button label.
	 *
	 * @since 1.0.0
	 * @return string
	 */
	protected function get_product_button_label() {
		$label = get_option( TRIZYNC_POP_CART_OPTION_PRODUCT_BUTTON_LABEL, __( 'Checkout', 'trizync-pop-cart' ) );
		return $label ? $label : __( 'Checkout', 'trizync-pop-cart' );
	}

	/**
	 * Get branding settings merged with defaults.
	 *
	 * @since 1.0.0
	 * @return array
	 */
	protected function get_branding_settings() {
		$defaults = array(
			'primary'   => '#411264',
			'secondary' => '#f0a60a',
			'tertiary'  => '#ffffff',
		);

		if ( ! defined( 'TRIZYNC_POP_CART_OPTION_BRANDING' ) ) {
			return $defaults;
		}

		$raw = get_option( TRIZYNC_POP_CART_OPTION_BRANDING, wp_json_encode( $defaults ) );
		$decoded = json_decode( $raw, true );
		if ( ! is_array( $decoded ) ) {
			return $defaults;
		}

		return array_merge( $defaults, $decoded );
	}

	/**
	 * Get script hooks list.
	 *
	 * @since 1.0.0
	 * @return array
	 */
	protected function get_script_hooks() {
		return array(
			'popcart:boot',
			'popcart:open:start',
			'popcart:checkout:attempt',
			'popcart:checkout:blocked',
			'popcart:checkout:submit',
			'popcart:checkout:error',
			'popcart:checkout:success',
			'popcart:close',
			'popcart:cleanup',
			'popcart:init_checkout',
			'popcart:updated_checkout',
			'popcart:update_checkout',
			'popcart:checkout_error',
			'popcart:woocommerce_before_checkout_form',
			'popcart:woocommerce_checkout_before_customer_details',
			'popcart:woocommerce_checkout_billing',
			'popcart:woocommerce_checkout_shipping',
			'popcart:woocommerce_checkout_after_customer_details',
			'popcart:woocommerce_checkout_before_order_review',
			'popcart:woocommerce_checkout_order_review',
			'popcart:woocommerce_checkout_after_order_review',
			'popcart:woocommerce_after_checkout_form',
		);
	}

	/**
	 * Get scripts mapping merged with defaults.
	 *
	 * @since 1.0.0
	 * @return array
	 */
	protected function get_scripts_settings() {
		$defaults = array();
		foreach ( $this->get_script_hooks() as $hook ) {
			$defaults[ $hook ] = '';
		}

		if ( ! defined( 'TRIZYNC_POP_CART_OPTION_SCRIPTS' ) ) {
			return $defaults;
		}

		$raw = get_option( TRIZYNC_POP_CART_OPTION_SCRIPTS, wp_json_encode( $defaults ) );
		$decoded = json_decode( $raw, true );
		if ( ! is_array( $decoded ) ) {
			return $defaults;
		}

		return array_merge( $defaults, $decoded );
	}

	/**
	 * Convert hex color to rgb string.
	 *
	 * @since 1.0.0
	 * @param string $hex
	 * @return string
	 */
	protected function hex_to_rgb( $hex ) {
		$hex = ltrim( $hex, '#' );
		if ( strlen( $hex ) === 3 ) {
			$hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
		}
		if ( strlen( $hex ) !== 6 ) {
			return '65,18,100';
		}
		$r = hexdec( substr( $hex, 0, 2 ) );
		$g = hexdec( substr( $hex, 2, 2 ) );
		$b = hexdec( substr( $hex, 4, 2 ) );
		return $r . ',' . $g . ',' . $b;
	}

	/**
	 * Get CTA label.
	 *
	 * @since 1.0.0
	 * @return string
	 */
	protected function get_cta_label() {
		if ( ! defined( 'TRIZYNC_POP_CART_OPTION_CTA_LABEL' ) ) {
			return __( 'Proceed to checkout', 'trizync-pop-cart' );
		}

		$label = get_option( TRIZYNC_POP_CART_OPTION_CTA_LABEL, __( 'Proceed to checkout', 'trizync-pop-cart' ) );
		return $label ? $label : __( 'Proceed to checkout', 'trizync-pop-cart' );
	}

	/**
	 * Get popup header eyebrow text.
	 *
	 * @since 1.0.0
	 * @return string
	 */
	protected function get_header_eyebrow() {
		if ( ! defined( 'TRIZYNC_POP_CART_OPTION_HEADER_EYEBROW' ) ) {
			return __( 'Instant checkout', 'trizync-pop-cart' );
		}

		$value = get_option( TRIZYNC_POP_CART_OPTION_HEADER_EYEBROW, __( 'Instant checkout', 'trizync-pop-cart' ) );
		return $value ? $value : __( 'Instant checkout', 'trizync-pop-cart' );
	}

	/**
	 * Get popup header title text.
	 *
	 * @since 1.0.0
	 * @return string
	 */
	protected function get_header_title() {
		if ( ! defined( 'TRIZYNC_POP_CART_OPTION_HEADER_TITLE' ) ) {
			return __( 'Secure checkout', 'trizync-pop-cart' );
		}

		$value = get_option( TRIZYNC_POP_CART_OPTION_HEADER_TITLE, __( 'Secure checkout', 'trizync-pop-cart' ) );
		return $value ? $value : __( 'Secure checkout', 'trizync-pop-cart' );
	}

	/**
	 * Render Pop Cart custom checkout fields inside popup.
	 *
	 * @since 1.0.0
	 */
	protected function render_checkout_form() {
		if ( ! function_exists( 'WC' ) ) {
			return;
		}

		$this->ensure_cart_loaded();

		$checkout = WC()->checkout();
		if ( ! $checkout ) {
			return;
		}

		$fields = $this->get_enabled_fields_config();
		?>
		<form class="trizync-pop-cart__form" data-trizync-pop-cart-form>
			<?php $this->render_popup_hidden_fields(); ?>
			<div class="trizync-pop-cart__fields">
				<?php foreach ( $fields as $field ) : ?>
					<?php
					$key = sanitize_key( $field['key'] );
					if ( ! $key ) {
						continue;
					}
					$label = isset( $field['label'] ) ? $field['label'] : $key;
					$placeholder = isset( $field['placeholder'] ) ? $field['placeholder'] : '';
					$default_value = isset( $field['default'] ) ? $field['default'] : '';
					$required = isset( $field['rule'] ) && 'required' === $field['rule'];
					$type = isset( $field['type'] ) ? $field['type'] : 'text';
					$value = $checkout->get_value( $key );
					if ( '' === $value && '' !== $default_value ) {
						$value = $default_value;
					}
					if ( 'billing_email' === $key ) {
						$type = 'email';
					} elseif ( 'billing_phone' === $key ) {
						$type = 'tel';
					}
					?>
					<div class="trizync-pop-cart__field" data-field-key="<?php echo esc_attr( $key ); ?>">
						<label class="trizync-pop-cart__label" for="<?php echo esc_attr( $key ); ?>">
							<?php echo esc_html( $label ); ?>
							<?php if ( $required ) : ?>
								<span class="trizync-pop-cart__required">*</span>
							<?php endif; ?>
						</label>
						<?php if ( 'select' === $type ) : ?>
							<select class="trizync-pop-cart__select" name="<?php echo esc_attr( $key ); ?>" id="<?php echo esc_attr( $key ); ?>" <?php echo $required ? 'required aria-required="true"' : ''; ?>>
								<?php if ( $placeholder ) : ?>
									<option value=""><?php echo esc_html( $placeholder ); ?></option>
								<?php endif; ?>
								<?php
								$options = isset( $field['options'] ) && is_array( $field['options'] ) ? $field['options'] : array();
								foreach ( $options as $option ) :
									$option_value = (string) $option;
									?>
									<option value="<?php echo esc_attr( $option_value ); ?>" <?php selected( $value, $option_value ); ?>>
										<?php echo esc_html( $option_value ); ?>
									</option>
								<?php endforeach; ?>
							</select>
						<?php elseif ( 'textarea' === $type ) : ?>
							<textarea class="trizync-pop-cart__textarea" name="<?php echo esc_attr( $key ); ?>" id="<?php echo esc_attr( $key ); ?>" placeholder="<?php echo esc_attr( $placeholder ); ?>" <?php echo $required ? 'required aria-required="true"' : ''; ?>><?php echo esc_textarea( $value ); ?></textarea>
						<?php else : ?>
							<input class="trizync-pop-cart__input" type="<?php echo esc_attr( $type ); ?>" name="<?php echo esc_attr( $key ); ?>" id="<?php echo esc_attr( $key ); ?>" placeholder="<?php echo esc_attr( $placeholder ); ?>" value="<?php echo esc_attr( $value ); ?>" <?php echo $required ? 'required aria-required="true"' : ''; ?>>
						<?php endif; ?>
					</div>
				<?php endforeach; ?>
			</div>
		</form>
		<?php
	}

	/**
	 * Get enabled field configuration for popup rendering.
	 *
	 * @since 1.0.0
	 * @return array
	 */
	protected function get_enabled_fields_config() {
		if ( ! defined( 'TRIZYNC_POP_CART_OPTION_FIELDS' ) ) {
			return array();
		}

		$raw = get_option( TRIZYNC_POP_CART_OPTION_FIELDS );
		if ( empty( $raw ) ) {
			return array();
		}

		$config = json_decode( $raw, true );
		if ( ! is_array( $config ) ) {
			return array();
		}

		$enabled = array();
		foreach ( $config as $field ) {
			if ( empty( $field['enabled'] ) || empty( $field['key'] ) ) {
				continue;
			}
			$field['order'] = isset( $field['order'] ) ? absint( $field['order'] ) : 0;
			$enabled[] = $field;
		}

		usort(
			$enabled,
			function( $a, $b ) {
				return (int) $a['order'] <=> (int) $b['order'];
			}
		);

		return $enabled;
	}

	/**
	 * Render hidden inputs needed for checkout processing inside popup.
	 *
	 * @since 1.0.0
	 */
	public function render_popup_hidden_fields() {
		if ( ! function_exists( 'wp_nonce_field' ) ) {
			return;
		}
		wp_nonce_field( 'woocommerce-process_checkout', 'woocommerce-process-checkout-nonce' );
		echo '<input type="hidden" name="trizync_pop_cart" value="1">';
		echo '<input type="hidden" name="woocommerce_checkout_place_order" value="1" data-trizync-pop-cart-place-order>';
		echo '<input type="hidden" name="payment_method" value="" data-trizync-pop-cart-payment-input>';
		echo '<input type="hidden" name="shipping_method[0]" value="" data-trizync-pop-cart-shipping-input>';
	}

	/**
	 * Remove default billing/shipping heading for popup only.
	 *
	 * @since 1.0.0
	 * @param array $fields
	 * @return array
	 */
	public function maybe_remove_billing_heading( $fields ) {
		add_filter( 'woocommerce_checkout_fields_heading', '__return_empty_string' );
		return $fields;
	}

	/**
	 * Apply custom field configuration to checkout fields (popup only).
	 *
	 * @since 1.0.0
	 * @param array $fields
	 * @return array
	 */
	public function filter_checkout_fields( $fields ) {
		if ( ! defined( 'TRIZYNC_POP_CART_OPTION_FIELDS' ) ) {
			return $fields;
		}

		$raw = get_option( TRIZYNC_POP_CART_OPTION_FIELDS );
		if ( empty( $raw ) ) {
			return $fields;
		}

		$config = json_decode( $raw, true );
		if ( ! is_array( $config ) ) {
			return $fields;
		}

		$enabled_keys = array();
		foreach ( $config as $field ) {
			if ( empty( $field['enabled'] ) || empty( $field['key'] ) ) {
				continue;
			}
			$enabled_keys[] = sanitize_key( $field['key'] );
		}

		foreach ( $fields as $group => $group_fields ) {
			if ( ! is_array( $group_fields ) ) {
				continue;
			}
			foreach ( $group_fields as $key => &$field_data ) {
				if ( empty( $key ) ) {
					continue;
				}
				$clean_key = sanitize_key( $key );
				if ( ! in_array( $clean_key, $enabled_keys, true ) ) {
					$field_data['required'] = false;
					unset( $fields[ $group ][ $key ] );
				}
			}
			unset( $field_data );
		}

		$custom = array(
			'billing'  => array(),
			'shipping' => array(),
			'order'    => array(),
		);

		foreach ( $config as $field ) {
			if ( empty( $field['enabled'] ) || empty( $field['key'] ) ) {
				continue;
			}

			$key = sanitize_key( $field['key'] );
			$group = 'order';
			if ( 0 === strpos( $key, 'billing_' ) ) {
				$group = 'billing';
			} elseif ( 0 === strpos( $key, 'shipping_' ) ) {
				$group = 'shipping';
			}

			$required = isset( $field['rule'] ) && 'required' === $field['rule'];
			$custom_attributes = array();
			$type = isset( $field['type'] ) ? $field['type'] : 'text';

			$custom[ $group ][ $key ] = array(
				'type'              => in_array( $type, array( 'text', 'select' ), true ) ? $type : 'text',
				'label'             => isset( $field['label'] ) ? $field['label'] : '',
				'placeholder'       => isset( $field['placeholder'] ) ? $field['placeholder'] : '',
				'required'          => $required,
				'default'           => isset( $field['default'] ) ? $field['default'] : '',
				'class'             => array( 'form-row-wide' ),
				'priority'          => isset( $field['order'] ) ? absint( $field['order'] ) : 0,
				'custom_attributes' => $custom_attributes,
			);

			if ( 'select' === $type && ! empty( $field['options'] ) && is_array( $field['options'] ) ) {
				$options = array();
				foreach ( $field['options'] as $option ) {
					$slug = sanitize_title( $option );
					$options[ $slug ] = $option;
				}
				$custom[ $group ][ $key ]['options'] = $options;
			}
		}

		foreach ( $custom as $group => $group_fields ) {
			if ( ! empty( $group_fields ) ) {
				$fields[ $group ] = $group_fields;
			}
		}

		return $fields;
	}

	/**
	 * Save custom checkout field values to order meta.
	 *
	 * @since 1.0.0
	 * @param int      $order_id
	 * @param array    $data
	 */
	public function save_custom_order_meta( $order_id, $data ) {
		if ( ! defined( 'TRIZYNC_POP_CART_OPTION_FIELDS' ) ) {
			return;
		}

		$raw = get_option( TRIZYNC_POP_CART_OPTION_FIELDS );
		if ( empty( $raw ) ) {
			return;
		}

		$config = json_decode( $raw, true );
		if ( ! is_array( $config ) ) {
			return;
		}

		$default_keys = $this->get_default_field_keys();
		$order = wc_get_order( $order_id );

		foreach ( $config as $field ) {
			if ( empty( $field['enabled'] ) || empty( $field['key'] ) ) {
				continue;
			}

			$key = sanitize_key( $field['key'] );
			if ( '' === $key ) {
				continue;
			}

			if ( in_array( $key, $default_keys, true ) ) {
				continue;
			}

			if ( ! isset( $_POST[ $key ] ) ) {
				continue;
			}

			$value = wp_unslash( $_POST[ $key ] );
			if ( is_array( $value ) ) {
				$value = implode( ', ', array_map( 'sanitize_text_field', $value ) );
			} else {
				$value = sanitize_text_field( $value );
			}

			if ( '' === $value ) {
				continue;
			}

			if ( $order instanceof WC_Order ) {
				$order->update_meta_data( $key, $value );
			} else {
				update_post_meta( $order_id, $key, $value );
			}
		}

		if ( $order instanceof WC_Order ) {
			$order->save();
		}
	}

	/**
	 * Display custom order meta under billing section in admin.
	 *
	 * @since 1.0.0
	 * @param WC_Order $order
	 */
	public function render_admin_order_meta( $order ) {
		static $rendered = false;
		if ( $rendered ) {
			return;
		}

		if ( ! $order instanceof WC_Order ) {
			return;
		}

		if ( ! defined( 'TRIZYNC_POP_CART_OPTION_FIELDS' ) ) {
			return;
		}

		$raw = get_option( TRIZYNC_POP_CART_OPTION_FIELDS );
		if ( empty( $raw ) ) {
			return;
		}

		$config = json_decode( $raw, true );
		if ( ! is_array( $config ) ) {
			return;
		}

		$default_keys = $this->get_default_field_keys();
		$items = array();
		foreach ( $config as $field ) {
			if ( empty( $field['key'] ) || empty( $field['enabled'] ) ) {
				continue;
			}
			$key = sanitize_key( $field['key'] );
			if ( '' === $key ) {
				continue;
			}
			if ( in_array( $key, $default_keys, true ) ) {
				continue;
			}
			$value = $order->get_meta( $key );
			if ( '' === $value || null === $value ) {
				continue;
			}
			$label = isset( $field['label'] ) && $field['label'] ? $field['label'] : $key;
			$items[] = array(
				'label' => $label,
				'value' => $value,
			);
		}

		if ( empty( $items ) ) {
			return;
		}

		$rendered = true;
		echo '<div class="trizync-pop-cart-admin__order-meta">';
		echo '<h4>' . esc_html__( 'Popup Checkout Fields', 'trizync-pop-cart' ) . '</h4>';
		echo '<ul>';
		foreach ( $items as $item ) {
			echo '<li><strong>' . esc_html( $item['label'] ) . ':</strong> ' . esc_html( $item['value'] ) . '</li>';
		}
		echo '</ul>';
		echo '</div>';
	}

	/**
	 * Default field keys (non-removable).
	 *
	 * @since 1.0.0
	 * @return array
	 */
	protected function get_default_field_keys() {
		return array(
			'billing_first_name',
			'billing_phone',
			'billing_email',
			'billing_address_1',
			'billing_city',
			'billing_postcode',
			'billing_country',
			'billing_state',
		);
	}

	/**
	 * Trigger success hooks after checkout is processed (excluding thank you).
	 *
	 * @since 1.0.0
	 * @param int   $order_id
	 * @param array $posted_data
	 * @param WC_Order $order
	 */
	public function handle_checkout_success( $order_id, $posted_data, $order ) {
		if ( ! $order_id ) {
			return;
		}

		$order = $order instanceof WC_Order ? $order : wc_get_order( $order_id );
		if ( ! $order ) {
			return;
		}

		// Core success hooks commonly fired on successful checkout (exclude thank you).
		if ( 0 === did_action( 'woocommerce_checkout_order_created' ) ) {
			do_action( 'woocommerce_checkout_order_created', $order );
		}
		if ( 0 === did_action( 'woocommerce_payment_complete' ) ) {
			do_action( 'woocommerce_payment_complete', $order_id );
		}

		do_action( 'trizync_pop_cart_order_success', $order_id, $order );

		$this->restore_cart_snapshot();
	}

	/**
	 * Get cart quantity for a product.
	 *
	 * @since 1.0.0
	 * @param int $product_id Product ID.
	 * @return int
	 */
	protected function get_cart_quantity_for_product( $product_id ) {
		if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
			return 1;
		}

		$quantity = 0;
		foreach ( WC()->cart->get_cart() as $cart_item ) {
			if ( empty( $cart_item['product_id'] ) ) {
				continue;
			}

			if ( (int) $cart_item['product_id'] === (int) $product_id ) {
				$quantity += (int) $cart_item['quantity'];
			}
		}

		return $quantity > 0 ? $quantity : 1;
	}

	/**
	 * Build notices HTML.
	 *
	 * @since 1.0.0
	 * @return string
	 */
	protected function build_notices() {
		ob_start();
		if ( function_exists( 'wc_print_notices' ) ) {
			wc_print_notices();
		}
		return ob_get_clean();
	}

	/**
	 * Build cart payload for AJAX responses.
	 *
	 * @since 1.0.0
	 * @return array
	 */
	protected function build_cart_payload() {
		$this->ensure_cart_loaded();

		if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
			return array(
				'items'     => array(),
				'shipping'  => array(),
				'subtotal'  => '',
				'total'     => '',
				'hash'      => '',
				'itemCount' => 0,
			);
		}

		WC()->cart->calculate_totals();

		$items = array();
		foreach ( WC()->cart->get_cart() as $cart_item_key => $cart_item ) {
			if ( empty( $cart_item['data'] ) || ! $cart_item['data'] instanceof WC_Product ) {
				continue;
			}

			$product = $cart_item['data'];
			$categories = function_exists( 'wc_get_product_terms' ) ? wc_get_product_terms( $product->get_id(), 'product_cat', array( 'fields' => 'names' ) ) : array();
			if ( ! is_array( $categories ) ) {
				$categories = array();
			}
			$variants = array();
			if ( $product instanceof WC_Product_Variation ) {
				foreach ( $product->get_variation_attributes() as $attribute => $value ) {
					$label = wc_attribute_label( str_replace( 'attribute_', '', $attribute ) );
					$variants[] = array(
						'id'    => $attribute,
						'name'  => $label ? $label : $attribute,
						'value' => $value,
					);
				}
			}

			$items[] = array(
				'key'            => $cart_item_key,
				'product_id'     => $product->get_id(),
				'sku'            => $product->get_sku(),
				'name'           => $product->get_name(),
				'quantity'       => (int) $cart_item['quantity'],
				'price_raw'      => (float) $product->get_price(),
				'regular_price_raw' => (float) $product->get_regular_price(),
				'sale_price_raw' => (float) $product->get_sale_price(),
				'image'          => $product->get_image_id() ? wp_get_attachment_image_url( $product->get_image_id(), 'thumbnail' ) : '',
				'permalink'      => get_permalink( $product->get_id() ),
				'categories'     => $categories,
				'variants'       => $variants,
				'total'          => WC()->cart->get_product_subtotal( $product, (int) $cart_item['quantity'] ),
				'line_total_raw' => isset( $cart_item['line_total'] ) ? (float) $cart_item['line_total'] : 0,
			);
		}

		$shipping_payload = $this->build_shipping_payload();
		$payment_payload  = $this->build_payment_payload();
		$coupons_payload  = $this->build_coupon_payload();

		return array(
			'items'     => $items,
			'shipping'  => $shipping_payload,
			'payment'   => $payment_payload,
			'coupons'   => $coupons_payload,
			'notices'   => $this->build_notices(),
			'subtotal'  => WC()->cart->get_cart_subtotal(),
			'subtotal_raw' => (float) WC()->cart->get_subtotal(),
			'total'     => WC()->cart->get_total(),
			'total_raw' => (float) WC()->cart->get_total( 'edit' ),
			'hash'      => WC()->cart->get_cart_hash(),
			'itemCount' => WC()->cart->get_cart_contents_count(),
		);
	}

	/**
	 * Snapshot current cart to session for single product checkout.
	 *
	 * @since 1.0.0
	 */
	protected function snapshot_cart() {
		if ( ! function_exists( 'WC' ) || ! WC()->cart || ! WC()->session ) {
			return;
		}

		$existing_snapshot = WC()->session->get( 'trizync_pop_cart_snapshot' );
		if ( ! empty( $existing_snapshot ) ) {
			return;
		}

		$items = array();
		foreach ( WC()->cart->get_cart() as $cart_item ) {
			if ( empty( $cart_item['product_id'] ) ) {
				continue;
			}
			$items[] = array(
				'product_id'     => (int) $cart_item['product_id'],
				'variation_id'   => isset( $cart_item['variation_id'] ) ? (int) $cart_item['variation_id'] : 0,
				'variation'      => isset( $cart_item['variation'] ) ? $cart_item['variation'] : array(),
				'quantity'       => isset( $cart_item['quantity'] ) ? (int) $cart_item['quantity'] : 1,
				'cart_item_data' => isset( $cart_item['cart_item_data'] ) ? $cart_item['cart_item_data'] : array(),
			);
		}

		WC()->session->set( 'trizync_pop_cart_snapshot', $items );
	}

	/**
	 * Restore cart snapshot if available.
	 *
	 * @since 1.0.0
	 */
	protected function restore_cart_snapshot() {
		if ( ! function_exists( 'WC' ) || ! WC()->cart || ! WC()->session ) {
			return;
		}

		$flag = WC()->session->get( 'trizync_pop_cart_product_checkout' );
		$snapshot = WC()->session->get( 'trizync_pop_cart_snapshot' );

		if ( ! $flag || empty( $snapshot ) || ! is_array( $snapshot ) ) {
			if ( $flag ) {
				WC()->session->__unset( 'trizync_pop_cart_product_checkout' );
				WC()->session->__unset( 'trizync_pop_cart_snapshot' );
			}
			return;
		}

		WC()->cart->empty_cart( true );
		foreach ( $snapshot as $item ) {
			$product_id     = isset( $item['product_id'] ) ? (int) $item['product_id'] : 0;
			$variation_id   = isset( $item['variation_id'] ) ? (int) $item['variation_id'] : 0;
			$variation      = isset( $item['variation'] ) && is_array( $item['variation'] ) ? $item['variation'] : array();
			$quantity       = isset( $item['quantity'] ) ? (int) $item['quantity'] : 1;
			$cart_item_data = isset( $item['cart_item_data'] ) && is_array( $item['cart_item_data'] ) ? $item['cart_item_data'] : array();

			if ( $product_id ) {
				WC()->cart->add_to_cart( $product_id, max( 1, $quantity ), $variation_id, $variation, $cart_item_data );
			}
		}

		WC()->cart->calculate_totals();

		WC()->session->__unset( 'trizync_pop_cart_product_checkout' );
		WC()->session->__unset( 'trizync_pop_cart_snapshot' );
	}

	/**
	 * Trigger backend checkout/cart hooks for popup flow.
	 *
	 * @since 1.0.0
	 * @param string $context
	 */
	protected function trigger_backend_checkout_hooks( $context ) {
		if ( ! function_exists( 'do_action' ) ) {
			return;
		}

		$posted_data = '';
		if ( isset( $_POST['post_data'] ) ) {
			$posted_data = wp_unslash( $_POST['post_data'] );
		} elseif ( ! empty( $_POST ) ) {
			$posted_data = http_build_query( wp_unslash( $_POST ) );
		}

		ob_start();
		do_action( 'trizync_pop_cart_backend_event', $context );

		// Mirror WooCommerce update hooks used by plugins.
		do_action( 'woocommerce_checkout_update_order_review', $posted_data );
		do_action( 'woocommerce_checkout_update_order_review_expired' );
		do_action( 'woocommerce_cart_updated' );
		ob_end_clean();
	}

	/**
	 * Trigger checkout open hooks for popup flow.
	 *
	 * @since 1.0.0
	 */
	protected function trigger_checkout_open_hooks() {
		if ( ! function_exists( 'WC' ) ) {
			return;
		}

		$checkout = WC()->checkout();
		if ( ! $checkout ) {
			return;
		}

		ob_start();
		do_action( 'woocommerce_before_checkout_form', $checkout );
		do_action( 'woocommerce_checkout_before_customer_details' );
		do_action( 'woocommerce_checkout_billing' );
		do_action( 'woocommerce_checkout_shipping' );
		do_action( 'woocommerce_checkout_after_customer_details' );
		do_action( 'woocommerce_checkout_before_order_review' );
		do_action( 'woocommerce_checkout_order_review' );
		do_action( 'woocommerce_checkout_after_order_review' );
		do_action( 'woocommerce_after_checkout_form', $checkout );
		ob_end_clean();
	}

	/**
	 * Build payload for a single product preview (no cart mutation).
	 *
	 * @since 1.0.0
	 * @param int $product_id
	 * @param int $quantity
	 * @return array
	 */
	protected function build_product_preview_payload( $product_id, $quantity, $variation_id = 0, $attributes = array() ) {
		$this->ensure_cart_loaded();

		if ( ! function_exists( 'wc_get_product' ) ) {
			return array(
				'items'     => array(),
				'shipping'  => array(),
				'subtotal'  => '',
				'total'     => '',
				'hash'      => '',
				'itemCount' => 0,
			);
		}

		$product = wc_get_product( $product_id );
		if ( ! $product ) {
			return array(
				'items'     => array(),
				'shipping'  => array(),
				'subtotal'  => '',
				'total'     => '',
				'hash'      => '',
				'itemCount' => 0,
			);
		}

		$quantity = max( 1, (int) $quantity );
		$display_product = $product;
		if ( $variation_id ) {
			$variation = wc_get_product( $variation_id );
			if ( $variation && $variation->get_parent_id() === $product->get_id() ) {
				$display_product = $variation;
			}
		}
		$price    = (float) $display_product->get_price();
		$subtotal = $price * $quantity;

		$payment_payload = $this->build_payment_payload();
		$coupons_payload = $this->build_coupon_payload();
		$cart_shipping   = $this->build_shipping_payload();
		$use_cart_rates  = ! empty( $cart_shipping['methods'] );
		$shipping_total  = function_exists( 'WC' ) && WC()->cart ? (float) WC()->cart->get_shipping_total() : 0.0;
		$shipping_payload = array(
			'payload'   => $cart_shipping,
			'total_raw' => $shipping_total,
		);
		if ( ! $use_cart_rates ) {
			$product_shipping = $this->build_shipping_payload_for_product( $display_product, $quantity );
			if ( ! empty( $product_shipping['payload'] ) && ! empty( $product_shipping['payload']['methods'] ) ) {
				$shipping_payload = $product_shipping;
				$use_cart_rates = true;
			}
		}

		$product_type = $product->get_type();
		$product_data = array(
			'id'              => $product->get_id(),
			'type'            => $product_type,
			'name'            => $product->get_name(),
			'sku'             => $product->get_sku(),
			'price_raw'       => (float) $product->get_price(),
			'regular_price_raw' => (float) $product->get_regular_price(),
			'sale_price_raw'  => (float) $product->get_sale_price(),
			'image'           => $product->get_image_id() ? wp_get_attachment_image_url( $product->get_image_id(), 'thumbnail' ) : '',
			'permalink'       => get_permalink( $product->get_id() ),
			'attributes'      => array(),
			'variations'      => array(),
			'default_attributes' => array(),
			'selected_variation_id' => $variation_id,
			'selected_attributes' => $attributes,
		);

		if ( $product instanceof WC_Product_Variable ) {
			$cache_key = 'trizync_pop_cart_var_' . $product->get_id();
			$modified = $product->get_date_modified();
			if ( $modified ) {
				$cache_key .= '_' . $modified->getTimestamp();
			}
			$cached = get_transient( $cache_key );
			if ( is_array( $cached ) && isset( $cached['attributes'], $cached['variations'], $cached['defaults'] ) ) {
				$product_data['attributes'] = $cached['attributes'];
				$product_data['variations'] = $cached['variations'];
				$product_data['default_attributes'] = $cached['defaults'];
			} else {
				$variation_attributes = $product->get_variation_attributes();
				$attributes_list = array();
				foreach ( $variation_attributes as $attribute_name => $options ) {
					$base_name = str_replace( 'attribute_', '', $attribute_name );
					$label = wc_attribute_label( $base_name );
					$attributes_list[] = array(
						'name'    => $base_name,
						'key'     => 'attribute_' . $base_name,
						'label'   => $label ? $label : $base_name,
						'options' => array_values( $options ),
					);
				}

				$defaults = $product->get_default_attributes();
				$normalized_defaults = array();
				foreach ( $defaults as $key => $value ) {
					$base_key = str_replace( 'attribute_', '', $key );
					$normalized_defaults[ 'attribute_' . $base_key ] = $value;
				}

				$variations = array();
				foreach ( $product->get_available_variations() as $variation_data ) {
					$variation_product = wc_get_product( $variation_data['variation_id'] );
					$variation_attrs = array();
					foreach ( $variation_data['attributes'] as $attr_key => $attr_value ) {
						$key = strpos( $attr_key, 'attribute_' ) === 0 ? $attr_key : 'attribute_' . $attr_key;
						$variation_attrs[ $key ] = $attr_value;
					}
					$variations[] = array(
						'id'               => $variation_data['variation_id'],
						'sku'              => $variation_product ? $variation_product->get_sku() : '',
						'price_raw'        => isset( $variation_data['display_price'] ) ? (float) $variation_data['display_price'] : ( $variation_product ? (float) $variation_product->get_price() : 0.0 ),
						'regular_price_raw' => isset( $variation_data['display_regular_price'] ) ? (float) $variation_data['display_regular_price'] : ( $variation_product ? (float) $variation_product->get_regular_price() : 0.0 ),
						'price_html'       => isset( $variation_data['price_html'] ) ? $variation_data['price_html'] : '',
						'image'            => isset( $variation_data['image']['src'] ) ? $variation_data['image']['src'] : '',
						'is_in_stock'      => ! empty( $variation_data['is_in_stock'] ),
						'is_purchasable'   => ! empty( $variation_data['is_purchasable'] ),
						'attributes'       => $variation_attrs,
					);
				}

				$product_data['attributes'] = $attributes_list;
				$product_data['variations'] = $variations;
				$product_data['default_attributes'] = $normalized_defaults;

				set_transient(
					$cache_key,
					array(
						'attributes' => $attributes_list,
						'variations' => $variations,
						'defaults'   => $normalized_defaults,
					),
					5 * MINUTE_IN_SECONDS
				);
			}
		}

		$shipping_amount = $use_cart_rates ? (float) $shipping_payload['total_raw'] : 0.0;

		return array(
			'items'     => array(
				array(
					'key'      => 'preview',
					'product_id' => $display_product->get_id(),
					'sku'      => $display_product->get_sku(),
					'name'     => $display_product->get_name(),
					'quantity' => $quantity,
					'total'    => wc_price( $subtotal ),
					'line_total_raw' => (float) $subtotal,
					'price_raw' => (float) $display_product->get_price(),
					'regular_price_raw' => (float) $display_product->get_regular_price(),
					'sale_price_raw' => (float) $display_product->get_sale_price(),
					'image'    => $display_product->get_image_id() ? wp_get_attachment_image_url( $display_product->get_image_id(), 'thumbnail' ) : '',
					'permalink' => get_permalink( $display_product->get_id() ),
				),
			),
			'shipping'  => $use_cart_rates ? $shipping_payload['payload'] : array(),
			'payment'   => $payment_payload,
			'coupons'   => $coupons_payload,
			'notices'   => $this->build_notices(),
			'subtotal'  => wc_price( $subtotal ),
			'subtotal_raw' => (float) $subtotal,
			'total'     => wc_price( $subtotal + $shipping_amount ),
			'total_raw' => (float) ( $subtotal + $shipping_amount ),
			'hash'      => '',
			'itemCount' => $quantity,
			'product'   => $product_data,
		);
	}

	/**
	 * Build shipping payload for a single product.
	 *
	 * @since 1.0.0
	 * @param WC_Product $product
	 * @param int        $quantity
	 * @return array
	 */
	protected function build_shipping_payload_for_product( $product, $quantity ) {
		$this->ensure_cart_loaded();

		if ( ! function_exists( 'WC' ) || ! WC()->shipping() ) {
			return array(
				'payload'   => array(
					'methods' => array(),
					'chosen'  => '',
					'total'   => '',
				),
				'total_raw' => 0,
			);
		}

		$quantity       = max( 1, (int) $quantity );
		$contents_cost  = (float) $product->get_price() * $quantity;
		$customer       = WC()->customer;
		$destination    = array();

		$countries = WC()->countries;
		$base_country  = $countries ? $countries->get_base_country() : '';
		$base_state    = $countries ? $countries->get_base_state() : '';
		$base_postcode = $countries ? $countries->get_base_postcode() : '';
		$base_city     = $countries ? $countries->get_base_city() : '';
		$allowed_countries = $countries ? $countries->get_allowed_countries() : array();
		$first_allowed = ! empty( $allowed_countries ) ? array_key_first( $allowed_countries ) : '';

		if ( $customer ) {
			$destination = array(
				'country'   => $customer->get_shipping_country() ? $customer->get_shipping_country() : $customer->get_billing_country(),
				'state'     => $customer->get_shipping_state() ? $customer->get_shipping_state() : $customer->get_billing_state(),
				'postcode'  => $customer->get_shipping_postcode() ? $customer->get_shipping_postcode() : $customer->get_billing_postcode(),
				'city'      => $customer->get_shipping_city() ? $customer->get_shipping_city() : $customer->get_billing_city(),
				'address'   => $customer->get_shipping_address() ? $customer->get_shipping_address() : $customer->get_billing_address(),
				'address_2' => $customer->get_shipping_address_2() ? $customer->get_shipping_address_2() : $customer->get_billing_address_2(),
			);
		}

		if ( empty( $destination['country'] ) && $base_country ) {
			$destination['country'] = $base_country;
		}
		if ( empty( $destination['country'] ) && $first_allowed ) {
			$destination['country'] = $first_allowed;
		}
		if ( empty( $destination['state'] ) && $base_state ) {
			$destination['state'] = $base_state;
		}
		if ( empty( $destination['postcode'] ) && $base_postcode ) {
			$destination['postcode'] = $base_postcode;
		}
		if ( empty( $destination['city'] ) && $base_city ) {
			$destination['city'] = $base_city;
		}

		$package = array(
			'contents'        => array(
				'trizync_preview' => array(
					'data'              => $product,
					'quantity'          => $quantity,
					'line_total'        => $contents_cost,
					'line_tax'          => 0,
					'line_subtotal'     => $contents_cost,
					'line_subtotal_tax' => 0,
				),
			),
			'contents_cost'   => $contents_cost,
			'applied_coupons' => array(),
			'user'            => array(),
			'destination'     => $destination,
		);

		$rates = WC()->shipping()->calculate_shipping_for_package( $package );

		if ( empty( $rates ) ) {
			$cart_shipping = $this->build_shipping_payload();
			$cart_total    = WC()->cart ? WC()->cart->get_shipping_total() : 0;
			if ( ! empty( $cart_shipping['methods'] ) ) {
				return array(
					'payload'   => $cart_shipping,
					'total_raw' => (float) $cart_total,
				);
			}
			$fallback = $this->build_shipping_methods_fallback();
			return array(
				'payload'   => $fallback,
				'total_raw' => isset( $fallback['total_raw'] ) ? (float) $fallback['total_raw'] : 0,
			);
		}

		$chosen_methods = WC()->session ? WC()->session->get( 'chosen_shipping_methods' ) : array();
		$chosen_method  = is_array( $chosen_methods ) && ! empty( $chosen_methods ) ? $chosen_methods[0] : '';

		if ( ! $chosen_method || ! isset( $rates[ $chosen_method ] ) ) {
			$chosen_method = $this->get_default_shipping_method_id( $rates );
		}

		$methods = array();
		foreach ( $rates as $rate_id => $rate ) {
			if ( ! $rate instanceof WC_Shipping_Rate ) {
				continue;
			}
			$methods[] = array(
				'id'        => $rate_id,
				'label'     => $rate->get_label(),
				'price'     => wc_price( $rate->get_cost() ),
				'selected'  => $rate_id === $chosen_method,
				'method_id' => $rate->get_method_id(),
			);
		}

		$selected_rate = isset( $rates[ $chosen_method ] ) ? $rates[ $chosen_method ] : null;
		$shipping_cost = $selected_rate ? (float) $selected_rate->get_cost() : 0.0;

		return array(
			'payload'   => array(
				'methods'   => $methods,
				'chosen'    => $chosen_method,
				'total'     => wc_price( $shipping_cost ),
				'total_raw' => $shipping_cost,
			),
			'total_raw' => $shipping_cost,
		);
	}

	/**
	 * Build shipping payload and enforce default rule.
	 *
	 * @since 1.0.0
	 * @return array
	 */
	protected function build_shipping_payload() {
		$this->ensure_cart_loaded();

		if ( ! function_exists( 'WC' ) || ! WC()->cart || ! WC()->shipping() ) {
			return array(
				'methods' => array(),
				'chosen'  => '',
				'total'   => '',
			);
		}

		if ( WC()->customer && WC()->countries ) {
			$base_country  = WC()->countries->get_base_country();
			$base_state    = WC()->countries->get_base_state();
			$base_postcode = WC()->countries->get_base_postcode();
			$base_city     = WC()->countries->get_base_city();
			$allowed_countries = WC()->countries->get_allowed_countries();
			$first_allowed = ! empty( $allowed_countries ) ? array_key_first( $allowed_countries ) : '';

			if ( ! WC()->customer->get_shipping_country() && ! WC()->customer->get_billing_country() ) {
				$default_country = $base_country ? $base_country : $first_allowed;
				if ( $default_country ) {
					WC()->customer->set_billing_country( $default_country );
					WC()->customer->set_shipping_country( $default_country );
				}
			}
			if ( ! WC()->customer->get_shipping_state() && ! WC()->customer->get_billing_state() && $base_state ) {
				WC()->customer->set_billing_state( $base_state );
				WC()->customer->set_shipping_state( $base_state );
			}
			if ( ! WC()->customer->get_shipping_postcode() && ! WC()->customer->get_billing_postcode() && $base_postcode ) {
				WC()->customer->set_billing_postcode( $base_postcode );
				WC()->customer->set_shipping_postcode( $base_postcode );
			}
			if ( ! WC()->customer->get_shipping_city() && ! WC()->customer->get_billing_city() && $base_city ) {
				WC()->customer->set_billing_city( $base_city );
				WC()->customer->set_shipping_city( $base_city );
			}
		}

		WC()->cart->calculate_shipping();
		$packages = WC()->shipping()->get_packages();

		if ( empty( $packages ) ) {
			return $this->build_shipping_methods_fallback();
		}

		$package = $packages[0];
		$rates   = isset( $package['rates'] ) ? $package['rates'] : array();

		if ( empty( $rates ) ) {
			return $this->build_shipping_methods_fallback();
		}

		$chosen_methods = WC()->session ? WC()->session->get( 'chosen_shipping_methods' ) : array();
		$chosen_method  = is_array( $chosen_methods ) && ! empty( $chosen_methods ) ? $chosen_methods[0] : '';

		if ( ! $chosen_method || ! isset( $rates[ $chosen_method ] ) ) {
			$chosen_method = $this->get_default_shipping_method_id( $rates );
			if ( $chosen_method && WC()->session ) {
				WC()->session->set( 'chosen_shipping_methods', array( $chosen_method ) );
			}
		}

		$methods = array();
		foreach ( $rates as $rate_id => $rate ) {
			if ( ! $rate instanceof WC_Shipping_Rate ) {
				continue;
			}
			$methods[] = array(
				'id'        => $rate_id,
				'label'     => $rate->get_label(),
				'price'     => wc_price( $rate->get_cost() ),
				'selected'  => $rate_id === $chosen_method,
				'method_id' => $rate->get_method_id(),
			);
		}

		$shipping_total = WC()->cart->get_shipping_total();

		return array(
			'methods'   => $methods,
			'chosen'    => $chosen_method,
			'total'     => wc_price( $shipping_total ),
			'total_raw' => (float) $shipping_total,
		);
	}

	/**
	 * Fallback shipping methods when no rates are available.
	 *
	 * @since 1.0.0
	 * @return array
	 */
	protected function build_shipping_methods_fallback() {
		if ( ! function_exists( 'WC' ) || ! WC()->shipping() ) {
			return array(
				'methods' => array(),
				'chosen'  => '',
				'total'   => '',
			);
		}

		$zones = WC_Shipping_Zones::get_zones();
		$zones[] = array(
			'zone_id' => 0,
		);

		$methods = array();
		foreach ( $zones as $zone_data ) {
			$zone = new WC_Shipping_Zone( $zone_data['zone_id'] );
			foreach ( $zone->get_shipping_methods( true ) as $method ) {
				if ( ! $method || ! $method->enabled ) {
					continue;
				}
				$instance_id = $method->get_instance_id();
				$method_id = $method->get_method_id();
				$rate_id = $method_id . ':' . $instance_id;
				$cost = 0.0;
				if ( isset( $method->cost ) && '' !== $method->cost ) {
					$cost = (float) $method->cost;
				} elseif ( isset( $method->settings['cost'] ) && '' !== $method->settings['cost'] ) {
					$cost = (float) $method->settings['cost'];
				}
				$methods[ $rate_id ] = array(
					'id'        => $rate_id,
					'label'     => $method->get_title(),
					'price'     => wc_price( $cost ),
					'selected'  => false,
					'method_id' => $method_id,
					'cost_raw'  => $cost,
				);
			}
		}

		if ( empty( $methods ) ) {
			return array(
				'methods' => array(),
				'chosen'  => '',
				'total'   => '',
			);
		}

		$chosen_id = '';
		$max_cost = -1;
		foreach ( $methods as $rate_id => $method ) {
			if ( $method['cost_raw'] >= $max_cost ) {
				$max_cost = $method['cost_raw'];
				$chosen_id = $rate_id;
			}
		}

		foreach ( $methods as $rate_id => &$method ) {
			$method['selected'] = ( $rate_id === $chosen_id );
			unset( $method['cost_raw'] );
		}
		unset( $method );

		return array(
			'methods'   => array_values( $methods ),
			'chosen'    => $chosen_id,
			'total'     => $chosen_id && isset( $methods[ $chosen_id ] ) ? $methods[ $chosen_id ]['price'] : '',
			'total_raw' => $max_cost > 0 ? $max_cost : 0,
		);
	}

	/**
	 * Build coupon payload for applied coupons.
	 *
	 * @since 1.0.0
	 * @return array
	 */
	protected function build_coupon_payload() {
		if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
			return array();
		}

		$coupons = array();
		foreach ( WC()->cart->get_coupons() as $code => $coupon ) {
			$amount = WC()->cart->get_coupon_discount_amount( $code );
			$coupons[] = array(
				'code'   => $code,
				'amount' => wc_price( $amount ),
			);
		}

		return $coupons;
	}

	/**
	 * Build payment payload for available gateways.
	 *
	 * @since 1.0.0
	 * @return array
	 */
	protected function build_payment_payload() {
		if ( ! function_exists( 'WC' ) || ! WC()->payment_gateways() ) {
			return array(
				'gateways' => array(),
				'chosen'   => '',
			);
		}

		$gateways = WC()->payment_gateways()->get_available_payment_gateways();
		$chosen   = WC()->session ? WC()->session->get( 'chosen_payment_method' ) : '';

		$payload = array();
		foreach ( $gateways as $gateway_id => $gateway ) {
			if ( 'cod' !== $gateway_id ) {
				continue;
			}
			if ( ! $gateway || ! $gateway->enabled ) {
				continue;
			}
			$payload[] = array(
				'id'          => $gateway_id,
				'title'       => $gateway->get_title(),
				'description' => wp_kses_post( $gateway->get_description() ),
				'selected'    => $gateway_id === $chosen,
			);
		}

		if ( empty( $payload ) ) {
			$all_gateways = WC()->payment_gateways()->payment_gateways();
			if ( isset( $all_gateways['cod'] ) && $all_gateways['cod'] && $all_gateways['cod']->enabled ) {
				$gateway = $all_gateways['cod'];
				$payload[] = array(
					'id'          => 'cod',
					'title'       => $gateway->get_title(),
					'description' => wp_kses_post( $gateway->get_description() ),
					'selected'    => true,
				);
				$chosen = 'cod';
			}
		}

		if ( ( ! $chosen || 'cod' !== $chosen ) && ! empty( $payload ) ) {
			$chosen = $payload[0]['id'];
		}
		if ( $chosen && WC()->session ) {
			WC()->session->set( 'chosen_payment_method', $chosen );
		}

		return array(
			'gateways' => $payload,
			'chosen'   => $chosen,
		);
	}

	/**
	 * Pick default shipping method: free/local pickup else max cost.
	 *
	 * @since 1.0.0
	 * @param array $rates
	 * @return string
	 */
	protected function get_default_shipping_method_id( $rates ) {
		$max_cost = -1;
		$max_id = '';

		foreach ( $rates as $rate_id => $rate ) {
			if ( ! $rate instanceof WC_Shipping_Rate ) {
				continue;
			}
			$method_id = $rate->get_method_id();
			$cost = (float) $rate->get_cost();
			if ( $cost >= $max_cost ) {
				$max_cost = $cost;
				$max_id   = $rate_id;
			}
		}

		return $max_id;
	}

	/**
	 * Ensure WooCommerce cart/session are loaded for AJAX requests.
	 *
	 * @since 1.0.0
	 */
	protected function ensure_cart_loaded() {
		if ( ! function_exists( 'WC' ) ) {
			return;
		}

		if ( function_exists( 'wc_load_cart' ) ) {
			wc_load_cart();
		}

		if ( WC()->cart ) {
			if ( method_exists( WC()->cart, 'get_cart_from_session' ) ) {
				WC()->cart->get_cart_from_session();
			}
			WC()->cart->get_cart();
			WC()->cart->set_session();
			if ( method_exists( WC()->cart, 'maybe_set_cart_cookies' ) ) {
				WC()->cart->maybe_set_cart_cookies();
			}
		}

		if ( WC()->session && ! WC()->session->has_session() ) {
			WC()->session->set_customer_session_cookie( true );
		}
	}

	/**
	 * Warm WooCommerce session without touching cart totals.
	 *
	 * @since 1.0.0
	 */
	protected function warm_session_only() {
		if ( ! function_exists( 'WC' ) ) {
			return;
		}

		if ( function_exists( 'wc_load_cart' ) ) {
			wc_load_cart();
		}

		if ( WC()->session && ! WC()->session->has_session() ) {
			WC()->session->set_customer_session_cookie( true );
		}
	}

}
