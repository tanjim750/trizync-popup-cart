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

		wp_enqueue_script( $this->plugin_name, plugin_dir_url( __FILE__ ) . 'js/trizync-pop-cart-public.js', array( 'jquery' ), $this->version, true );
		wp_localize_script(
			$this->plugin_name,
			'TrizyncPopCart',
			array(
				'enabled'  => 1,
				'ajaxUrl'  => admin_url( 'admin-ajax.php' ),
				'nonce'    => wp_create_nonce( 'trizync_pop_cart_nonce' ),
				'cartHash' => function_exists( 'WC' ) && WC()->cart ? WC()->cart->get_cart_hash() : '',
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
		if ( ! $this->is_enabled() || ! function_exists( 'is_product' ) || ! is_product() ) {
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
			'<button type="button" class="trizync-pop-cart-trigger trizync-pop-cart-trigger--product" data-trizync-pop-cart-open="product" data-product-id="%d" data-product-name="%s" data-quantity="%d">%s</button>',
			(int) $product_id,
			esc_attr( $product_name ),
			(int) $quantity,
			esc_html__( 'Checkout', 'trizync-pop-cart' )
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
		if ( ! $this->is_enabled() || ! $product instanceof WC_Product ) {
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
			' data-trizync-pop-cart-open="product" data-product-id="%d" data-product-name="%s" data-quantity="%d"',
			(int) $product_id,
			esc_attr( $product_name ),
			(int) $quantity
		);

		if ( false !== strpos( $button, 'data-trizync-pop-cart-open' ) ) {
			return $button;
		}

		return preg_replace( '/<a\s/i', '<a' . $attributes . ' ', $button, 1 );
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
					<div class="trizync-pop-cart__cart" data-trizync-pop-cart-cart hidden>
						<p class="trizync-pop-cart__section-label" data-trizync-pop-cart-cart-label><?php esc_html_e( 'Cart items', 'trizync-pop-cart' ); ?></p>
						<div class="trizync-pop-cart__cart-empty" data-trizync-pop-cart-empty>
							<p class="trizync-pop-cart__cart-empty-title"><?php esc_html_e( 'Your cart is empty', 'trizync-pop-cart' ); ?></p>
							<p class="trizync-pop-cart__cart-empty-text"><?php esc_html_e( 'Add items to your cart before checking out.', 'trizync-pop-cart' ); ?></p>
						</div>
						<ul class="trizync-pop-cart__cart-list" data-trizync-pop-cart-list></ul>
						<div class="trizync-pop-cart__checkout" data-trizync-pop-cart-checkout>
							<?php $this->render_checkout_form(); ?>
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
				<div class="trizync-pop-cart__footer">
					<button type="button" class="trizync-pop-cart__cta" disabled="disabled"><?php echo esc_html( $this->get_cta_label() ); ?></button>
				</div>
			</div>
		</div>
		<?php
	}

	/**
	 * Check if popup checkout is enabled.
	 *
	 * @since    1.0.0
	 * @return bool
	 */
	private function is_enabled() {
		return (bool) (int) get_option( TRIZYNC_POP_CART_OPTION_ENABLED, 1 );
	}

	/**
	 * Get branding settings merged with defaults.
	 *
	 * @since 1.0.0
	 * @return array
	 */
	private function get_branding_settings() {
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
	 * Convert hex color to rgb string.
	 *
	 * @since 1.0.0
	 * @param string $hex
	 * @return string
	 */
	private function hex_to_rgb( $hex ) {
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
	private function get_cta_label() {
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
	private function get_header_eyebrow() {
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
	private function get_header_title() {
		if ( ! defined( 'TRIZYNC_POP_CART_OPTION_HEADER_TITLE' ) ) {
			return __( 'Secure checkout', 'trizync-pop-cart' );
		}

		$value = get_option( TRIZYNC_POP_CART_OPTION_HEADER_TITLE, __( 'Secure checkout', 'trizync-pop-cart' ) );
		return $value ? $value : __( 'Secure checkout', 'trizync-pop-cart' );
	}

	/**
	 * Render WooCommerce checkout form inside popup.
	 *
	 * @since 1.0.0
	 */
	private function render_checkout_form() {
		if ( ! function_exists( 'WC' ) ) {
			return;
		}

		$this->ensure_cart_loaded();

		if ( ! function_exists( 'wc_get_template' ) ) {
			return;
		}

		$checkout = WC()->checkout();
		if ( ! $checkout ) {
			return;
		}

		add_filter( 'woocommerce_checkout_fields', array( $this, 'maybe_remove_billing_heading' ) );
		add_filter( 'woocommerce_checkout_fields', array( $this, 'filter_checkout_fields' ) );
		add_action( 'woocommerce_checkout_before_order_review', array( $this, 'render_popup_hidden_fields' ) );

		$removed_order_review = false;
		if ( has_action( 'woocommerce_checkout_order_review', 'woocommerce_order_review' ) ) {
			remove_action( 'woocommerce_checkout_order_review', 'woocommerce_order_review', 10 );
			$removed_order_review = true;
		}
		if ( has_action( 'woocommerce_checkout_order_review', 'woocommerce_checkout_payment' ) ) {
			remove_action( 'woocommerce_checkout_order_review', 'woocommerce_checkout_payment', 20 );
			$removed_order_review = true;
		}

		wc_get_template( 'checkout/form-checkout.php', array( 'checkout' => $checkout ) );

		remove_filter( 'woocommerce_checkout_fields', array( $this, 'maybe_remove_billing_heading' ) );
		remove_filter( 'woocommerce_checkout_fields', array( $this, 'filter_checkout_fields' ) );
		remove_action( 'woocommerce_checkout_before_order_review', array( $this, 'render_popup_hidden_fields' ) );

		if ( $removed_order_review ) {
			add_action( 'woocommerce_checkout_order_review', 'woocommerce_order_review', 10 );
			add_action( 'woocommerce_checkout_order_review', 'woocommerce_checkout_payment', 20 );
		}
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

		foreach ( $config as $field ) {
			if ( empty( $field['enabled'] ) || empty( $field['key'] ) ) {
				continue;
			}

			$key = sanitize_key( $field['key'] );
			if ( '' === $key ) {
				continue;
			}

			if ( 0 === strpos( $key, 'billing_' ) || 0 === strpos( $key, 'shipping_' ) ) {
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

			update_post_meta( $order_id, $key, $value );
		}
	}

	/**
	 * Display custom order meta under billing section in admin.
	 *
	 * @since 1.0.0
	 * @param WC_Order $order
	 */
	public function render_admin_order_meta( $order ) {
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

		$items = array();
		foreach ( $config as $field ) {
			if ( empty( $field['key'] ) ) {
				continue;
			}
			$key = sanitize_key( $field['key'] );
			if ( '' === $key ) {
				continue;
			}
			if ( 0 === strpos( $key, 'billing_' ) || 0 === strpos( $key, 'shipping_' ) ) {
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
	}

	/**
	 * Get cart quantity for a product.
	 *
	 * @since 1.0.0
	 * @param int $product_id Product ID.
	 * @return int
	 */
	private function get_cart_quantity_for_product( $product_id ) {
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
	 * AJAX: Get cart data.
	 *
	 * @since 1.0.0
	 */
	public function ajax_get_cart() {
		if ( ! $this->is_enabled() ) {
			wp_send_json_error( array( 'message' => 'disabled' ), 403 );
		}

		check_ajax_referer( 'trizync_pop_cart_nonce', 'nonce' );

		$this->ensure_cart_loaded();

		$this->trigger_checkout_open_hooks();
		$this->trigger_backend_checkout_hooks( 'get_cart' );
		wp_send_json_success( $this->build_cart_payload() );
	}

	/**
	 * AJAX: Get single product preview totals/shipping.
	 *
	 * @since 1.0.0
	 */
	public function ajax_get_product_preview() {
		if ( ! $this->is_enabled() ) {
			wp_send_json_error( array( 'message' => 'disabled' ), 403 );
		}

		check_ajax_referer( 'trizync_pop_cart_nonce', 'nonce' );

		$this->ensure_cart_loaded();

		$product_id = isset( $_POST['product_id'] ) ? absint( $_POST['product_id'] ) : 0;
		$quantity   = isset( $_POST['quantity'] ) ? absint( $_POST['quantity'] ) : 1;

		if ( ! $product_id ) {
			wp_send_json_error( array( 'message' => 'missing_product' ), 400 );
		}

		$this->trigger_backend_checkout_hooks( 'get_product_preview' );
		wp_send_json_success( $this->build_product_preview_payload( $product_id, $quantity ) );
	}

	/**
	 * AJAX: Update cart item quantity.
	 *
	 * @since 1.0.0
	 */
	public function ajax_update_cart_item() {
		if ( ! $this->is_enabled() ) {
			wp_send_json_error( array( 'message' => 'disabled' ), 403 );
		}

		check_ajax_referer( 'trizync_pop_cart_nonce', 'nonce' );

		$this->ensure_cart_loaded();

		$key      = isset( $_POST['cart_item_key'] ) ? wc_clean( wp_unslash( $_POST['cart_item_key'] ) ) : '';
		$quantity = isset( $_POST['quantity'] ) ? absint( $_POST['quantity'] ) : 0;

		if ( ! $key ) {
			wp_send_json_error( array( 'message' => 'missing_key' ), 400 );
		}

		if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
			wp_send_json_error( array( 'message' => 'cart_unavailable' ), 400 );
		}

		if ( $quantity < 1 ) {
			WC()->cart->remove_cart_item( $key );
		} else {
			WC()->cart->set_quantity( $key, $quantity, true );
		}

		$this->trigger_backend_checkout_hooks( 'update_cart_item' );
		wp_send_json_success( $this->build_cart_payload() );
	}

	/**
	 * AJAX: Remove cart item.
	 *
	 * @since 1.0.0
	 */
	public function ajax_remove_cart_item() {
		if ( ! $this->is_enabled() ) {
			wp_send_json_error( array( 'message' => 'disabled' ), 403 );
		}

		check_ajax_referer( 'trizync_pop_cart_nonce', 'nonce' );

		$this->ensure_cart_loaded();

		$key = isset( $_POST['cart_item_key'] ) ? wc_clean( wp_unslash( $_POST['cart_item_key'] ) ) : '';

		if ( ! $key ) {
			wp_send_json_error( array( 'message' => 'missing_key' ), 400 );
		}

		if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
			wp_send_json_error( array( 'message' => 'cart_unavailable' ), 400 );
		}

		WC()->cart->remove_cart_item( $key );

		$this->trigger_backend_checkout_hooks( 'remove_cart_item' );
		wp_send_json_success( $this->build_cart_payload() );
	}

	/**
	 * AJAX: Set shipping method.
	 *
	 * @since 1.0.0
	 */
	public function ajax_set_shipping_method() {
		if ( ! $this->is_enabled() ) {
			wp_send_json_error( array( 'message' => 'disabled' ), 403 );
		}

		check_ajax_referer( 'trizync_pop_cart_nonce', 'nonce' );

		$this->ensure_cart_loaded();

		$method = isset( $_POST['shipping_method'] ) ? wc_clean( wp_unslash( $_POST['shipping_method'] ) ) : '';

		if ( ! $method ) {
			wp_send_json_error( array( 'message' => 'missing_method' ), 400 );
		}

		if ( ! function_exists( 'WC' ) || ! WC()->cart || ! WC()->session ) {
			wp_send_json_error( array( 'message' => 'cart_unavailable' ), 400 );
		}

		WC()->session->set( 'chosen_shipping_methods', array( $method ) );
		WC()->cart->calculate_totals();

		$this->trigger_backend_checkout_hooks( 'set_shipping_method' );
		wp_send_json_success( $this->build_cart_payload() );
	}

	/**
	 * AJAX: Set payment method.
	 *
	 * @since 1.0.0
	 */
	public function ajax_set_payment_method() {
		if ( ! $this->is_enabled() ) {
			wp_send_json_error( array( 'message' => 'disabled' ), 403 );
		}

		check_ajax_referer( 'trizync_pop_cart_nonce', 'nonce' );

		$this->ensure_cart_loaded();

		$method = isset( $_POST['payment_method'] ) ? wc_clean( wp_unslash( $_POST['payment_method'] ) ) : '';

		if ( ! $method ) {
			wp_send_json_error( array( 'message' => 'missing_method' ), 400 );
		}

		if ( ! function_exists( 'WC' ) || ! WC()->session ) {
			wp_send_json_error( array( 'message' => 'cart_unavailable' ), 400 );
		}

		WC()->session->set( 'chosen_payment_method', $method );

		$this->trigger_backend_checkout_hooks( 'set_payment_method' );
		wp_send_json_success( $this->build_cart_payload() );
	}

	/**
	 * Build cart payload for AJAX responses.
	 *
	 * @since 1.0.0
	 * @return array
	 */
	private function build_cart_payload() {
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
			$items[] = array(
				'key'      => $cart_item_key,
				'name'     => $product->get_name(),
				'quantity' => (int) $cart_item['quantity'],
				'total'    => WC()->cart->get_product_subtotal( $product, (int) $cart_item['quantity'] ),
			);
		}

		$shipping_payload = $this->build_shipping_payload();

		$payment_payload = $this->build_payment_payload();

		return array(
			'items'     => $items,
			'shipping'  => $shipping_payload,
			'payment'   => $payment_payload,
			'subtotal'  => WC()->cart->get_cart_subtotal(),
			'total'     => WC()->cart->get_total(),
			'hash'      => WC()->cart->get_cart_hash(),
			'itemCount' => WC()->cart->get_cart_contents_count(),
		);
	}

	/**
	 * Trigger backend checkout/cart hooks for popup flow.
	 *
	 * @since 1.0.0
	 * @param string $context
	 */
	private function trigger_backend_checkout_hooks( $context ) {
		if ( ! function_exists( 'do_action' ) ) {
			return;
		}

		ob_start();
		do_action( 'trizync_pop_cart_backend_event', $context );

		// Mirror WooCommerce update hooks used by plugins.
		do_action( 'woocommerce_checkout_update_order_review', array( 'trizync_pop_cart' => true, 'context' => $context ) );
		do_action( 'woocommerce_checkout_update_order_review_expired', array( 'trizync_pop_cart' => true, 'context' => $context ) );
		do_action( 'woocommerce_cart_updated' );
		ob_end_clean();
	}

	/**
	 * Trigger checkout open hooks for popup flow.
	 *
	 * @since 1.0.0
	 */
	private function trigger_checkout_open_hooks() {
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
	private function build_product_preview_payload( $product_id, $quantity ) {
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
		$price    = (float) $product->get_price();
		$subtotal = $price * $quantity;

		$payment_payload = $this->build_payment_payload();
		$cart_shipping   = $this->build_shipping_payload();
		$use_cart_rates  = ! empty( $cart_shipping['methods'] );
		$shipping_total  = function_exists( 'WC' ) && WC()->cart ? (float) WC()->cart->get_shipping_total() : 0.0;
		$shipping_payload = array(
			'payload'   => $cart_shipping,
			'total_raw' => $shipping_total,
		);

		return array(
			'items'     => array(
				array(
					'key'      => 'preview',
					'name'     => $product->get_name(),
					'quantity' => $quantity,
					'total'    => wc_price( $subtotal ),
				),
			),
			'shipping'  => $use_cart_rates ? $cart_shipping : array(),
			'payment'   => $payment_payload,
			'subtotal'  => wc_price( $subtotal ),
			'total'     => wc_price( $subtotal + ( $use_cart_rates ? $shipping_total : 0 ) ),
			'hash'      => '',
			'itemCount' => $quantity,
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
	private function build_shipping_payload_for_product( $product, $quantity ) {
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
			if ( WC()->cart ) {
				$cart_shipping = $this->build_shipping_payload();
				$cart_total    = WC()->cart->get_shipping_total();
				return array(
					'payload'   => $cart_shipping,
					'total_raw' => (float) $cart_total,
				);
			}
			return array(
				'payload'   => array(
					'methods' => array(),
					'chosen'  => '',
					'total'   => '',
				),
				'total_raw' => 0,
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
				'methods' => $methods,
				'chosen'  => $chosen_method,
				'total'   => wc_price( $shipping_cost ),
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
	private function build_shipping_payload() {
		$this->ensure_cart_loaded();

		if ( ! function_exists( 'WC' ) || ! WC()->cart || ! WC()->shipping() ) {
			return array(
				'methods' => array(),
				'chosen'  => '',
				'total'   => '',
			);
		}

		WC()->cart->calculate_shipping();
		$packages = WC()->shipping()->get_packages();

		if ( empty( $packages ) ) {
			return array(
				'methods' => array(),
				'chosen'  => '',
				'total'   => '',
			);
		}

		$package = $packages[0];
		$rates   = isset( $package['rates'] ) ? $package['rates'] : array();

		if ( empty( $rates ) ) {
			return array(
				'methods' => array(),
				'chosen'  => '',
				'total'   => '',
			);
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
			'methods' => $methods,
			'chosen'  => $chosen_method,
			'total'   => wc_price( $shipping_total ),
		);
	}

	/**
	 * Build payment payload for available gateways.
	 *
	 * @since 1.0.0
	 * @return array
	 */
	private function build_payment_payload() {
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

		if ( ! $chosen && ! empty( $payload ) ) {
			$chosen = $payload[0]['id'];
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
	private function get_default_shipping_method_id( $rates ) {
		$free = '';
		$pickup = '';
		$max_cost = -1;
		$max_id = '';

		foreach ( $rates as $rate_id => $rate ) {
			if ( ! $rate instanceof WC_Shipping_Rate ) {
				continue;
			}
			$method_id = $rate->get_method_id();
			if ( 'free_shipping' === $method_id ) {
				$free = $rate_id;
			}
			if ( 'local_pickup' === $method_id ) {
				$pickup = $rate_id;
			}

			$cost = (float) $rate->get_cost();
			if ( $cost >= $max_cost ) {
				$max_cost = $cost;
				$max_id   = $rate_id;
			}
		}

		if ( $free ) {
			return $free;
		}

		if ( $pickup ) {
			return $pickup;
		}

		return $max_id;
	}

	/**
	 * Ensure WooCommerce cart/session are loaded for AJAX requests.
	 *
	 * @since 1.0.0
	 */
	private function ensure_cart_loaded() {
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

}
