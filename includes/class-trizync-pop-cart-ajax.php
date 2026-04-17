<?php

/**
 * AJAX handlers for PopCart.
 *
 * @since 1.0.0
 * @package Trizync_Pop_Cart
 */
class Trizync_Pop_Cart_Ajax extends Trizync_Pop_Cart_Public {

	/**
	 * Light flow helper instance.
	 *
	 * @var Trizync_Pop_Cart_Light|null
	 */
	protected $light;

	/**
	 * Attach the light flow helper.
	 *
	 * @param Trizync_Pop_Cart_Light $light
	 * @return void
	 */
	public function set_light( $light ) {
		$this->light = $light;
	}

	/**
	 * Verify a nonce against multiple actions.
	 *
	 * @param array  $actions Allowed nonce actions.
	 * @param string $field   Request field name.
	 * @return bool
	 */
	protected function verify_any_nonce( $actions, $field = 'nonce' ) {
		if ( ! isset( $_POST[ $field ] ) ) {
			return false;
		}

		$nonce = wp_unslash( $_POST[ $field ] );
		foreach ( (array) $actions as $action ) {
			if ( wp_verify_nonce( $nonce, $action ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Ensure a request includes a valid read-only nonce.
	 *
	 * @return void
	 */
	protected function require_preview_or_classic_nonce() {
		if ( ! $this->verify_any_nonce( array( Trizync_Pop_Cart_Nonces::CLASSIC, Trizync_Pop_Cart_Nonces::PREVIEW ) ) ) {
			wp_send_json_error( array( 'message' => 'bad_nonce' ), 403 );
		}
	}

	/**
	 * Ensure a request includes a valid write nonce.
	 *
	 * @return void
	 */
	protected function require_checkout_or_classic_nonce() {
		if ( ! $this->verify_any_nonce( array( Trizync_Pop_Cart_Nonces::CLASSIC, Trizync_Pop_Cart_Nonces::CHECKOUT ) ) ) {
			wp_send_json_error( array( 'message' => 'bad_nonce' ), 403 );
		}
	}

	/**
	 * Normalize coupon codes from request payload.
	 *
	 * @return array
	 */
	protected function extract_coupon_codes() {
		$codes = array();
		if ( isset( $_POST['coupon'] ) ) {
			$codes[] = wp_unslash( $_POST['coupon'] );
		}
		if ( isset( $_POST['coupons'] ) ) {
			$raw = wp_unslash( $_POST['coupons'] );
			if ( is_array( $raw ) ) {
				$codes = array_merge( $codes, $raw );
			} elseif ( is_string( $raw ) ) {
				$decoded = json_decode( $raw, true );
				if ( is_array( $decoded ) ) {
					$codes = array_merge( $codes, $decoded );
				} else {
					$codes = array_merge( $codes, preg_split( '/\\s*,\\s*/', $raw ) );
				}
			}
		}

		$normalized = array();
		foreach ( $codes as $code ) {
			$code = wc_clean( $code );
			if ( $code ) {
				$normalized[] = $code;
			}
		}

		return array_values( array_unique( $normalized ) );
	}

	/**
	 * Fire PopCart + Woo "added to cart" style hooks for custom endpoints.
	 *
	 * In Woo core, these hooks fire from WC_AJAX::add_to_cart(). Our custom
	 * endpoints add to cart without going through that controller, so we
	 * emit them manually for compatibility (fragments, analytics, 3rd parties).
	 *
	 * @param array  $payload Cart payload returned to the frontend.
	 * @param int    $product_id Product id.
	 * @param int    $quantity Quantity added.
	 * @param int    $variation_id Variation id (optional).
	 * @param string $cart_item_key Cart item key (optional).
	 * @return void
	 */
	protected function fire_added_to_cart_hooks( $payload, $product_id, $quantity, $variation_id = 0, $cart_item_key = '' ) {
		$product_id   = absint( $product_id );
		$quantity     = max( 1, absint( $quantity ) );
		$variation_id = absint( $variation_id );

		/**
		 * Plugin-level hook (PHP-side) so themes/plugins can react server-side.
		 *
		 * @param array  $payload
		 * @param int    $product_id
		 * @param int    $quantity
		 * @param int    $variation_id
		 * @param string $cart_item_key
		 */
		do_action( 'trizync_pop_cart_added_to_cart', $payload, $product_id, $quantity, $variation_id, (string) $cart_item_key );

		/**
		 * Woo compatibility hook used by many extensions.
		 *
		 * @param int $product_id
		 */
		if ( function_exists( 'do_action' ) ) {
			do_action( 'woocommerce_ajax_added_to_cart', $product_id );
		}
	}

	/**
	 * Build PopCart enabled fields metadata (keys + required list).
	 *
	 * @since 1.0.0
	 * @return array
	 */
	protected function get_popcart_enabled_fields_meta() {
		$fields = method_exists( $this, 'get_enabled_fields_config' ) ? $this->get_enabled_fields_config() : array();
		$countries = function_exists( 'WC' ) ? WC()->countries : null;
		$allowed_countries = $countries ? $countries->get_allowed_countries() : array();
		$base_country  = $countries ? $countries->get_base_country() : '';
		$base_state    = $countries ? $countries->get_base_state() : '';
		$base_postcode = $countries ? $countries->get_base_postcode() : '';
		$base_city     = $countries ? $countries->get_base_city() : '';
		$first_allowed = ! empty( $allowed_countries ) ? array_key_first( $allowed_countries ) : '';

		$customer = function_exists( 'WC' ) ? WC()->customer : null;

		$results = array();
		$enabled_keys = array();
		$required_keys = array();

		foreach ( $fields as $field ) {
			$key = isset( $field['key'] ) ? (string) $field['key'] : '';
			if ( '' === $key ) {
				continue;
			}
			$label = isset( $field['label'] ) ? (string) $field['label'] : $key;
			$type = isset( $field['type'] ) ? (string) $field['type'] : 'text';
			$rule = isset( $field['rule'] ) ? (string) $field['rule'] : '';
			$required = ( 'required' === $rule ) || ! empty( $field['required'] );
			$default = isset( $field['default'] ) ? $field['default'] : '';

			$enabled_keys[] = sanitize_key( $key );
			if ( $required ) {
				$required_keys[ sanitize_key( $key ) ] = $label;
			}

			if ( $customer ) {
				$getter = 'get_' . $key;
				if ( is_callable( array( $customer, $getter ) ) ) {
					$value = $customer->$getter();
					if ( '' !== $value && null !== $value ) {
						$default = $value;
					}
				}
			}

			if ( '' === $default ) {
				if ( 'billing_country' === $key || 'shipping_country' === $key ) {
					$default = $base_country ? $base_country : $first_allowed;
				} elseif ( 'billing_state' === $key || 'shipping_state' === $key ) {
					$default = $base_state;
				} elseif ( 'billing_postcode' === $key || 'shipping_postcode' === $key ) {
					$default = $base_postcode;
				} elseif ( 'billing_city' === $key || 'shipping_city' === $key ) {
					$default = $base_city;
				}
			}

			$options = array();
			if ( 'billing_country' === $key || 'shipping_country' === $key ) {
				foreach ( $allowed_countries as $code => $name ) {
					$options[] = array(
						'value' => $code,
						'label' => $name,
					);
				}
			} elseif ( 'billing_state' === $key || 'shipping_state' === $key ) {
				$country_key = ( 'billing_state' === $key ) ? 'billing_country' : 'shipping_country';
				$country_value = '';
				if ( $customer ) {
					$country_getter = 'get_' . $country_key;
					if ( is_callable( array( $customer, $country_getter ) ) ) {
						$country_value = $customer->$country_getter();
					}
				}
				if ( ! $country_value ) {
					$country_value = $base_country ? $base_country : $first_allowed;
				}
				$states = $countries && $country_value ? $countries->get_states( $country_value ) : array();
				if ( is_array( $states ) ) {
					foreach ( $states as $code => $name ) {
						$options[] = array(
							'value' => $code,
							'label' => $name,
						);
					}
				}
			} elseif ( isset( $field['options'] ) && is_array( $field['options'] ) ) {
				foreach ( $field['options'] as $option ) {
					$option_value = (string) $option;
					$options[] = array(
						'value' => $option_value,
						'label' => $option_value,
					);
				}
			}

			$results[] = array(
				'key'      => $key,
				'label'    => $label,
				'type'     => $type,
				'required' => (bool) $required,
				'default'  => $default,
				'options'  => $options,
			);
		}

		return array(
			'fields'        => $results,
			'enabled_keys'  => array_values( array_unique( $enabled_keys ) ),
			'required_keys' => $required_keys,
		);
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

		$this->require_preview_or_classic_nonce();

		$ping = ! empty( $_POST['ping'] );
		if ( $ping ) {
			$this->warm_session_only();
			wp_send_json_success(
				array(
					'items'     => array(),
					'shipping'  => array(),
					'payment'   => array(),
					'coupons'   => array(),
					'notices'   => '',
					'subtotal'  => '',
					'subtotal_raw' => 0,
					'total'     => '',
					'total_raw' => 0,
					'hash'      => '',
					'itemCount' => 0,
				)
			);
		}

		try {
			$this->warm_session_only();
			$this->ensure_cart_loaded();
			$this->trigger_checkout_open_hooks();
			$this->trigger_backend_checkout_hooks( 'get_cart' );
			wp_send_json_success( $this->build_cart_payload() );
		} catch ( Throwable $e ) {
			$this->warm_session_only();
			wp_send_json_error( array( 'message' => 'cart_unavailable' ), 500 );
		}
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

		$this->require_preview_or_classic_nonce();

		try {
			$this->ensure_cart_loaded();

			$product_id = isset( $_POST['product_id'] ) ? absint( $_POST['product_id'] ) : 0;
			$quantity   = isset( $_POST['quantity'] ) ? absint( $_POST['quantity'] ) : 1;
			$variation_id = isset( $_POST['variation_id'] ) ? absint( $_POST['variation_id'] ) : 0;
			$variation_id = isset( $_POST['variation_id'] ) ? absint( $_POST['variation_id'] ) : 0;
			$attributes_raw = isset( $_POST['attributes'] ) ? wp_unslash( $_POST['attributes'] ) : '';
			$replace_cart_only = ! empty( $_POST['replace_cart_only'] );
			$attributes = array();
			if ( $attributes_raw ) {
				$decoded = json_decode( $attributes_raw, true );
				if ( is_array( $decoded ) ) {
					$attributes = $decoded;
				}
			}

			if ( ! $product_id ) {
				wp_send_json_error( array( 'message' => 'missing_product' ), 400 );
			}

			$this->trigger_backend_checkout_hooks( 'get_product_preview' );
			if ( $this->light instanceof Trizync_Pop_Cart_Light ) {
				$coupons = $this->extract_coupon_codes();
				wp_send_json_success( $this->light->build_light_preview_payload_consistent( $product_id, $quantity, $variation_id, $attributes, $coupons ) );
			}
			wp_send_json_success( $this->build_product_preview_payload( $product_id, $quantity, $variation_id, $attributes ) );
		} catch ( Throwable $e ) {
			$this->warm_session_only();
			wp_send_json_error( array( 'message' => 'preview_unavailable' ), 500 );
		}
	}

	/**
	 * AJAX: Get available shipping methods for light flow preview.
	 *
	 * @since 1.0.0
	 */
	public function ajax_get_shipping_methods_light() {
		if ( ! $this->is_enabled() ) {
			wp_send_json_error( [ 'message' => 'disabled' ], 403 );
			return;
		}

		$this->require_preview_or_classic_nonce();

		try {
			$shipping = $this->build_shipping_methods_fallback();

			$shipping['zones'] = $shipping['zones'] ?? [];

			foreach ( $shipping['methods'] as &$method ) {
				$method['tax_total_raw'] = $method['tax_total_raw'] ?? 0.0;
				$method['tax_total']     = $method['tax_total']     ?? '';
				$method['taxes']         = $method['taxes']         ?? [];
			}
			unset( $method );

			wp_send_json_success( [ 'shipping' => $shipping ] );

		} catch ( Throwable $e ) {
			error_log( 'ajax_get_shipping_methods_light failed: ' . $e->getMessage() );
			wp_send_json_success( [
				'shipping' => [
					'methods' => [],
					'zones'   => [],
					'chosen'  => '',
					'total'   => '',
				],
			] );
		}
	}

	/**
	 * AJAX: Get applied shipping methods based on customer data (light flow).
	 *
	 * @since 1.0.0
	 */
	public function ajax_get_shipping_methods_applied_light() {
		if ( ! $this->is_enabled() ) {
			wp_send_json_error( [ 'message' => 'disabled' ], 403 );
			return;
		}

		$this->require_preview_or_classic_nonce();

		try {
			$product_id   = isset( $_POST['product_id'] ) ? absint( $_POST['product_id'] ) : 0;
			$quantity     = isset( $_POST['quantity'] ) ? absint( $_POST['quantity'] ) : 1;
			$variation_id = isset( $_POST['variation_id'] ) ? absint( $_POST['variation_id'] ) : 0;
			$customer_raw = isset( $_POST['customer'] ) ? wp_unslash( $_POST['customer'] ) : '';
			$customer     = [];
			if ( $customer_raw ) {
				$decoded = json_decode( $customer_raw, true );
				if ( is_array( $decoded ) ) {
					$customer = $decoded;
				}
			}

			if ( ! $product_id ) {
				wp_send_json_error( [ 'message' => 'missing_product' ], 400 );
				return;
			}

			$product = wc_get_product( $product_id );
			if ( ! $product ) {
				wp_send_json_error( [ 'message' => 'missing_product' ], 400 );
				return;
			}

			$display_product = $product;
			if ( $variation_id ) {
				$variation = wc_get_product( $variation_id );
				if ( $variation && $variation->get_parent_id() === $product->get_id() ) {
					$display_product = $variation;
				}
			}

			$shipping = $this->calculate_shipping_for_customer_light( $display_product, max( 1, (int) $quantity ), $customer );

			wp_send_json_success( [ 'shipping' => $shipping ] );
		} catch ( Throwable $e ) {
			error_log( 'ajax_get_shipping_methods_applied_light failed: ' . $e->getMessage() );
			wp_send_json_success( [
				'shipping' => [
					'methods' => [],
					'zones'   => [],
					'chosen'  => '',
					'total'   => '',
					'total_raw' => 0,
				],
			] );
		}
	}

	/**
	 * Calculate shipping methods for a customer destination without cart/session.
	 *
	 * @param WC_Product $product
	 * @param int        $quantity
	 * @param array      $customer
	 * @return array
	 */
	private function calculate_shipping_for_customer_light( $product, $quantity, $customer ) {
		if ( ! function_exists( 'WC' ) || ! WC()->shipping() ) {
			return $this->empty_shipping_payload();
		}

		if ( ! class_exists( 'WC_Shipping_Zones' ) || ! class_exists( 'WC_Shipping_Zone' ) ) {
			if ( defined( 'WC_ABSPATH' ) ) {
				$zones_path = WC_ABSPATH . 'includes/class-wc-shipping-zones.php';
				$zone_path  = WC_ABSPATH . 'includes/class-wc-shipping-zone.php';
				if ( file_exists( $zones_path ) ) {
					require_once $zones_path;
				}
				if ( file_exists( $zone_path ) ) {
					require_once $zone_path;
				}
			}
		}

		WC()->shipping()->init();
		if ( method_exists( WC()->shipping(), 'load_shipping_methods' ) ) {
			WC()->shipping()->load_shipping_methods();
		}

		$customer = is_array( $customer ) ? $customer : [];

		$get_val = function( $key, $fallback_key = '' ) use ( $customer ) {
			if ( isset( $customer[ $key ] ) && '' !== $customer[ $key ] ) {
				return $customer[ $key ];
			}
			if ( $fallback_key && isset( $customer[ $fallback_key ] ) && '' !== $customer[ $fallback_key ] ) {
				return $customer[ $fallback_key ];
			}
			return '';
		};

		$destination = [
			'country'   => $get_val( 'shipping_country', 'billing_country' ),
			'state'     => $get_val( 'shipping_state', 'billing_state' ),
			'postcode'  => $get_val( 'shipping_postcode', 'billing_postcode' ),
			'city'      => $get_val( 'shipping_city', 'billing_city' ),
			'address'   => $get_val( 'shipping_address_1', 'billing_address_1' ),
			'address_2' => $get_val( 'shipping_address_2', 'billing_address_2' ),
		];

		$contents_cost = (float) $product->get_price() * $quantity;
		$package = [
			'contents'        => [
				'trizync_preview' => [
					'data'              => $product,
					'quantity'          => $quantity,
					'line_total'        => $contents_cost,
					'line_tax'          => 0,
					'line_subtotal'     => $contents_cost,
					'line_subtotal_tax' => 0,
				],
			],
			'contents_cost'   => $contents_cost,
			'applied_coupons' => [],
			'user'            => [],
			'destination'     => $destination,
		];

		$rates = WC()->shipping()->calculate_shipping_for_package( $package );
		if ( empty( $rates ) ) {
			return $this->build_shipping_methods_fallback();
		}

		$methods = [];
		foreach ( $rates as $rate_id => $rate ) {
			if ( ! $rate instanceof WC_Shipping_Rate ) {
				continue;
			}
			$methods[] = [
				'id'        => $rate_id,
				'label'     => $rate->get_label(),
				'price'     => wc_price( $rate->get_cost() ),
				'selected'  => false,
				'method_id' => $rate->get_method_id(),
				'tax_total' => '',
				'tax_total_raw' => 0,
				'taxes'     => [],
			];
		}

		if ( empty( $methods ) ) {
			return $this->build_shipping_methods_fallback();
		}

		$chosen_id = $methods[0]['id'];
		foreach ( $methods as &$method ) {
			$method['selected'] = ( $method['id'] === $chosen_id );
		}
		unset( $method );

		$total_raw = 0.0;
		foreach ( $methods as $method ) {
			if ( $method['selected'] ) {
				$total_raw = (float) $method['tax_total_raw'];
				break;
			}
		}

		return [
			'methods'   => $methods,
			'chosen'    => $chosen_id,
			'total'     => $methods[0]['price'] ?? '',
			'total_raw' => $total_raw,
		];
	}

public function ajax_debug_shipping_zones() {
    if ( ! current_user_can( 'manage_woocommerce' ) ) {
        wp_send_json_error( 'unauthorized', 403 );
        return;
    }

    $debug = [];

    try {
        WC()->shipping()->load_shipping_methods();
    } catch ( Throwable $e ) {
        $debug['load_error'] = $e->getMessage();
    }

    $raw_zones = WC_Shipping_Zones::get_zones();
    $zone_ids  = array_merge( [ 0 ], array_column( $raw_zones, 'zone_id' ) );

    foreach ( $zone_ids as $zone_id ) {
        try {
            $zone    = new WC_Shipping_Zone( $zone_id );
            $methods = $zone->get_shipping_methods( false );

            $zone_debug = [
                'id'           => $zone->get_id(),
                'name'         => $zone->get_zone_name(),
                'method_count' => count( $methods ),
                'methods'      => [],
            ];

            foreach ( $methods as $m ) {
                $zone_debug['methods'][] = [
                    'instance_id' => $m->get_instance_id(),
                    'method_id'   => $m->id,           // ✅ ->id not get_method_id()
                    'title'       => $m->get_title(),
                    'enabled'     => $m->enabled,
                    'is_enabled'  => $m->is_enabled(),
                    'cost'        => $m->get_option( 'cost' ),
                ];
            }

            $debug['zones'][] = $zone_debug;

        } catch ( Throwable $e ) {
            $debug['zones'][] = [
                'zone_id' => $zone_id,
                'error'   => $e->getMessage(),
            ];
        }
    }

    wp_send_json_success( $debug );
}

	/**
	 * AJAX: Calculate subtotal/total for light flow preview.
	 *
	 * @since 1.0.0
	 */
	public function ajax_calc_subtotal_light() {
		if ( ! $this->is_enabled() ) {
			wp_send_json_error( array( 'message' => 'disabled' ), 403 );
		}

		$this->require_preview_or_classic_nonce();

		try {
			$product_id = isset( $_POST['product_id'] ) ? absint( $_POST['product_id'] ) : 0;
			$quantity   = isset( $_POST['quantity'] ) ? absint( $_POST['quantity'] ) : 1;
			$variation_id = isset( $_POST['variation_id'] ) ? absint( $_POST['variation_id'] ) : 0;
			$attributes_raw = isset( $_POST['attributes'] ) ? wp_unslash( $_POST['attributes'] ) : '';
			$attributes = array();
			if ( $attributes_raw ) {
				$decoded = json_decode( $attributes_raw, true );
				if ( is_array( $decoded ) ) {
					$attributes = $decoded;
				}
			}

			if ( ! $product_id ) {
				wp_send_json_error( array( 'message' => 'missing_product' ), 400 );
			}

			$payload = $this->build_product_preview_payload( $product_id, $quantity, $variation_id, $attributes );
			if ( $this->light instanceof Trizync_Pop_Cart_Light ) {
				$coupons = $this->extract_coupon_codes();
				$payload = $this->light->build_light_preview_payload_consistent( $product_id, $quantity, $variation_id, $attributes, $coupons );
			}
			wp_send_json_success(
				array(
					'subtotal'        => $payload['subtotal'] ?? '',
					'subtotal_raw'    => $payload['subtotal_raw'] ?? 0,
					'discount_total'  => $payload['discount_total'] ?? '',
					'discount_total_raw' => $payload['discount_total_raw'] ?? 0,
					'tax_total'       => $payload['tax_total'] ?? '',
					'tax_total_raw'   => $payload['tax_total_raw'] ?? 0,
					'shipping_tax_total' => $payload['shipping_tax_total'] ?? '',
					'shipping_tax_total_raw' => $payload['shipping_tax_total_raw'] ?? 0,
					'total'           => $payload['total'] ?? '',
					'total_raw'       => $payload['total_raw'] ?? 0,
					'shipping'        => $payload['shipping'] ?? array(),
					'coupons'         => $payload['coupons'] ?? array(),
					'errors'          => $payload['errors'] ?? array(),
				)
			);
		} catch ( Throwable $e ) {
			$this->warm_session_only();
			wp_send_json_error( array( 'message' => 'subtotal_unavailable' ), 500 );
		}
	}

	/**
	 * AJAX: Preview coupon impact for light flow.
	 *
	 * @since 1.0.0
	 */
	public function ajax_preview_coupon_light() {
		if ( ! $this->is_enabled() ) {
			wp_send_json_error( array( 'message' => 'disabled' ), 403 );
		}

		$this->require_preview_or_classic_nonce();

		try {
			$product_id = isset( $_POST['product_id'] ) ? absint( $_POST['product_id'] ) : 0;
			$quantity   = isset( $_POST['quantity'] ) ? absint( $_POST['quantity'] ) : 1;
			$variation_id = isset( $_POST['variation_id'] ) ? absint( $_POST['variation_id'] ) : 0;
			$attributes_raw = isset( $_POST['attributes'] ) ? wp_unslash( $_POST['attributes'] ) : '';
			$attributes = array();
			if ( $attributes_raw ) {
				$decoded = json_decode( $attributes_raw, true );
				if ( is_array( $decoded ) ) {
					$attributes = $decoded;
				}
			}

			if ( ! $product_id ) {
				wp_send_json_error( array( 'message' => 'missing_product' ), 400 );
			}

			$payload = $this->build_product_preview_payload( $product_id, $quantity, $variation_id, $attributes );
			if ( $this->light instanceof Trizync_Pop_Cart_Light ) {
				$coupons = $this->extract_coupon_codes();
				$payload = $this->light->build_light_preview_payload( $product_id, $quantity, $variation_id, $attributes, $coupons );
			}

			wp_send_json_success(
				array(
					'coupons'             => $payload['coupons'] ?? array(),
					'errors'              => $payload['errors'] ?? array(),
					'discount_total'      => $payload['discount_total'] ?? '',
					'discount_total_raw'  => $payload['discount_total_raw'] ?? 0,
					'shipping_discount'   => $payload['shipping_discount'] ?? '',
					'shipping_discount_raw' => $payload['shipping_discount_raw'] ?? 0,
					'total'               => $payload['total'] ?? '',
					'total_raw'           => $payload['total_raw'] ?? 0,
					'subtotal'            => $payload['subtotal'] ?? '',
					'subtotal_raw'        => $payload['subtotal_raw'] ?? 0,
					'tax_total'           => $payload['tax_total'] ?? '',
					'tax_total_raw'       => $payload['tax_total_raw'] ?? 0,
					'shipping_tax_total'  => $payload['shipping_tax_total'] ?? '',
					'shipping_tax_total_raw' => $payload['shipping_tax_total_raw'] ?? 0,
				)
			);
		} catch ( Throwable $e ) {
			$this->warm_session_only();
			wp_send_json_error( array( 'message' => 'coupon_preview_unavailable' ), 500 );
		}
	}

	/**
	 * AJAX: Prepare single product checkout (light flow).
	 *
	 * @since 1.0.0
	 */
	public function ajax_light_prepare_checkout() {
		if ( ! $this->is_enabled() ) {
			wp_send_json_error( array( 'message' => 'disabled' ), 403 );
		}

		$this->require_checkout_or_classic_nonce();

		$this->ensure_cart_loaded();

		$product_id = isset( $_POST['product_id'] ) ? absint( $_POST['product_id'] ) : 0;
		$quantity   = isset( $_POST['quantity'] ) ? absint( $_POST['quantity'] ) : 1;
		$variation_id = isset( $_POST['variation_id'] ) ? absint( $_POST['variation_id'] ) : 0;
		$attributes_raw = isset( $_POST['attributes'] ) ? wp_unslash( $_POST['attributes'] ) : '';
		$replace_cart_only = ! empty( $_POST['replace_cart_only'] );
		$attributes = array();
		if ( $attributes_raw ) {
			$decoded = json_decode( $attributes_raw, true );
			if ( is_array( $decoded ) ) {
				$attributes = $decoded;
			}
		}

		if ( ! $product_id ) {
			wp_send_json_error( array( 'message' => 'missing_product' ), 400 );
		}

		if ( ! function_exists( 'WC' ) || ! WC()->cart || ! WC()->session ) {
			wp_send_json_error( array( 'message' => 'cart_unavailable' ), 400 );
		}

		$product = wc_get_product( $product_id );
		if ( $product instanceof WC_Product_Variable && ! $variation_id ) {
			wp_send_json_error( array( 'message' => 'missing_variation' ), 400 );
		}

		if ( $replace_cart_only && WC()->session ) {
			WC()->session->__unset( 'trizync_pop_cart_product_checkout' );
			WC()->session->__unset( 'trizync_pop_cart_snapshot' );
		} else {
			$this->snapshot_cart();
		}
		WC()->cart->empty_cart( true );
		$added_key = WC()->cart->add_to_cart( $product_id, max( 1, $quantity ), $variation_id, $attributes );
		if ( ! $added_key ) {
			wp_send_json_error(
				array(
					'message'    => 'cart_update_failed_add_to_cart',
					'product_id' => $product_id,
					'notices'    => $this->get_wc_notices(),
				),
				400
			);
			return;
		}
		WC()->cart->calculate_totals();

		if ( ! $replace_cart_only && WC()->session ) {
			WC()->session->set( 'trizync_pop_cart_product_checkout', 1 );
		}

		$this->trigger_backend_checkout_hooks( 'prepare_product_checkout_light' );
		$payload = $this->build_cart_payload();
		$this->fire_added_to_cart_hooks( $payload, $product_id, $quantity, $variation_id, (string) $added_key );
		wp_send_json_success( $payload );
	}

	/**
	 * AJAX: Create order via WooCommerce checkout (PopCart flow).
	 *
	 * @since 1.0.0
	 */
	public function ajax_create_order() {
		if ( ! $this->is_enabled() ) {
			wp_send_json_error( array( 'message' => 'disabled' ), 403 );
			return;
		}

		$this->require_checkout_or_classic_nonce();

		$_POST['trizync_pop_cart']    = 1;
		$_REQUEST['trizync_pop_cart'] = 1;
		if ( method_exists( $this, 'maybe_enable_popcart_checkout_filters' ) ) {
			$this->maybe_enable_popcart_checkout_filters();
		}

		// ── PopCart field rules (enabled + required) ───────────────────────────
		$fields_meta   = $this->get_popcart_enabled_fields_meta();
		$enabled_keys  = isset( $fields_meta['enabled_keys'] ) ? (array) $fields_meta['enabled_keys'] : array();
		$required_keys = isset( $fields_meta['required_keys'] ) ? (array) $fields_meta['required_keys'] : array();

		add_filter(
			'woocommerce_checkout_fields',
			function( $fields ) use ( $enabled_keys, $required_keys ) {
				// If PopCart field config isn't available, don't override Woo defaults.
				if ( empty( $enabled_keys ) ) {
					return $fields;
				}
				foreach ( $fields as $group => $group_fields ) {
					if ( ! is_array( $group_fields ) ) {
						continue;
					}
					foreach ( $group_fields as $key => $field_data ) {
						$clean_key = sanitize_key( $key );
						if ( ! in_array( $clean_key, $enabled_keys, true ) ) {
							$fields[ $group ][ $key ]['required'] = false;
							continue;
						}
						// PopCart config is the source of truth for required/optional.
						$fields[ $group ][ $key ]['required'] = isset( $required_keys[ $clean_key ] );
					}
				}
				return $fields;
			},
			999
		);

		add_action(
			'woocommerce_after_checkout_validation',
			function( $data, $errors ) use ( $enabled_keys, $required_keys ) {
				// If PopCart field config isn't available, don't suppress Woo validation.
				if ( empty( $enabled_keys ) ) {
					return;
				}

				// Remove WC required-field errors for fields that aren't enabled in PopCart.
				foreach ( (array) $errors->get_error_codes() as $code ) {
					$field_key = sanitize_key( $code );
					if ( 0 === strpos( $field_key, 'required_' ) ) {
						$field_key = sanitize_key( substr( $field_key, 9 ) );
					}
					if ( $field_key && ! in_array( $field_key, $enabled_keys, true ) ) {
						$errors->remove( $code );
					}
				}

				// Enforce PopCart-required fields only.
				foreach ( $required_keys as $key => $label ) {
					$value = '';
					if ( isset( $_POST[ $key ] ) ) {
						$value = wp_unslash( $_POST[ $key ] );
					} elseif ( isset( $data[ $key ] ) ) {
						$value = $data[ $key ];
					}
					if ( is_array( $value ) ) {
						$value = implode( '', $value );
					}
					if ( '' === trim( (string) $value ) ) {
						$errors->add(
							'required_' . $key,
							sprintf( __( '%s is a required field.', 'trizync-pop-cart' ), $label )
						);
					}
				}
			},
			999,
			2
		);

		$this->ensure_cart_loaded();
		if ( ! function_exists( 'WC' ) || ! WC()->cart || ! WC()->session || ! WC()->customer ) {
			wp_send_json_error( array( 'message' => 'cart_unavailable' ), 400 );
			return;
		}

		// ── Parse payload ──────────────────────────────────────────────────────
		$product_id   = isset( $_POST['product_id'] ) ? absint( $_POST['product_id'] ) : 0;
		$quantity     = isset( $_POST['quantity'] ) ? absint( $_POST['quantity'] ) : 1;
		$variation_id = isset( $_POST['variation_id'] ) ? absint( $_POST['variation_id'] ) : 0;

		$attributes = array();
		if ( ! empty( $_POST['attributes'] ) ) {
			$decoded = json_decode( wp_unslash( $_POST['attributes'] ), true );
			if ( is_array( $decoded ) ) {
				$attributes = $decoded;
			}
		}

		if ( ! $product_id ) {
			wp_send_json_error( array( 'message' => 'missing_product' ), 400 );
			return;
		}
		$product = wc_get_product( $product_id );
		if ( ! $product ) {
			wp_send_json_error( array( 'message' => 'product_not_found', 'product_id' => $product_id ), 404 );
			return;
		}
		if ( $product instanceof WC_Product_Variable ) {
			if ( ! $variation_id ) {
				wp_send_json_error( array( 'message' => 'missing_variation' ), 400 );
				return;
			}
			$variation = wc_get_product( $variation_id );
			if ( ! $variation || (int) $variation->get_parent_id() !== (int) $product_id ) {
				wp_send_json_error( array( 'message' => 'invalid_variation', 'variation_id' => $variation_id ), 400 );
				return;
			}
		}

		$quantity = max( 1, (int) $quantity );

		$shipping_method = isset( $_POST['shipping_method'] ) ? wc_clean( wp_unslash( $_POST['shipping_method'] ) ) : '';
		$payment_method  = isset( $_POST['payment_method'] ) ? wc_clean( wp_unslash( $_POST['payment_method'] ) ) : '';

		$customer_data = array();
		if ( isset( $_POST['customer'] ) ) {
			$customer_raw = wp_unslash( $_POST['customer'] );
			$decoded      = is_string( $customer_raw ) ? json_decode( $customer_raw, true ) : $customer_raw;
			if ( is_array( $decoded ) ) {
				$customer_data = $decoded;
			}
		}

		$coupons = $this->extract_coupon_codes();

			// ── Decide if it's safe to mutate cart/session ─────────────────────────
			$safe_to_mutate = false;
			if ( WC()->cart->is_empty() ) {
				$safe_to_mutate = true;
			} else {
				// Prefer explicit PopCart flags, but also allow mutation for single-item carts.
				if ( WC()->session ) {
					$flag     = WC()->session->get( 'trizync_pop_cart_product_checkout' );
					$snapshot = WC()->session->get( 'trizync_pop_cart_snapshot' );
					$safe_to_mutate = (bool) ( $flag || ! empty( $snapshot ) );
				}
				if ( ! $safe_to_mutate ) {
					$cart_items = WC()->cart->get_cart();
					if ( is_array( $cart_items ) && 1 === count( $cart_items ) ) {
						$safe_to_mutate = true;
					}
				}
			}

		// ── Helper: cart summary (for clear mismatch errors) ───────────────────
		$cart_summary = function() {
			$items = array();
			if ( function_exists( 'WC' ) && WC()->cart ) {
				foreach ( WC()->cart->get_cart() as $key => $item ) {
					$items[] = array(
						'key'          => (string) $key,
						'product_id'   => isset( $item['product_id'] ) ? (int) $item['product_id'] : 0,
						'variation_id' => isset( $item['variation_id'] ) ? (int) $item['variation_id'] : 0,
						'quantity'     => isset( $item['quantity'] ) ? (int) $item['quantity'] : 0,
					);
				}
			}
			return $items;
		};

		// ── Helper: match target cart item ─────────────────────────────────────
		$matches_target = function( $cart_item ) use ( $product_id, $variation_id, $attributes ) {
			$item_product_id   = isset( $cart_item['product_id'] ) ? (int) $cart_item['product_id'] : 0;
			$item_variation_id = isset( $cart_item['variation_id'] ) ? (int) $cart_item['variation_id'] : 0;

			if ( $item_product_id !== (int) $product_id ) {
				return false;
			}

			if ( (int) $variation_id !== (int) $item_variation_id ) {
				return false;
			}

			// Best-effort attribute match for variations.
			if ( $variation_id && ! empty( $attributes ) ) {
				$item_attrs = isset( $cart_item['variation'] ) && is_array( $cart_item['variation'] ) ? $cart_item['variation'] : array();
				foreach ( $attributes as $k => $v ) {
					if ( '' === (string) $v ) {
						continue;
					}
					$key = (string) $k;
					$val = (string) $v;
					if ( 0 !== strpos( $key, 'attribute_' ) ) {
						$key_alt = 'attribute_' . $key;
					} else {
						$key_alt = $key;
					}
					$item_val = '';
					if ( isset( $item_attrs[ $key ] ) ) {
						$item_val = (string) $item_attrs[ $key ];
					} elseif ( isset( $item_attrs[ $key_alt ] ) ) {
						$item_val = (string) $item_attrs[ $key_alt ];
					}
					if ( '' !== $item_val && $item_val !== $val ) {
						return false;
					}
				}
			}

			return true;
		};

		$target_key = '';
		foreach ( WC()->cart->get_cart() as $key => $item ) {
			if ( $matches_target( $item ) ) {
				$target_key = (string) $key;
				break;
			}
		}

			// ── Heal cart/session to match payload (payload is source of truth) ────
			if ( ! $safe_to_mutate ) {
				// If we can't safely modify the cart, require it to already match.
				if ( '' === $target_key ) {
					wp_send_json_error(
					array(
						'message'        => 'cart_payload_mismatch_not_safe',
						'payload'        => array(
							'product_id'   => $product_id,
							'variation_id' => $variation_id,
							'quantity'     => $quantity,
						),
						'cart'           => $cart_summary(),
						'applied_coupons' => WC()->cart->get_applied_coupons(),
					),
					400
				);
					return;
				}

				$cart_items = WC()->cart->get_cart();
				if ( is_array( $cart_items ) && 1 !== count( $cart_items ) ) {
					wp_send_json_error(
						array(
							'message' => 'cart_payload_mismatch_not_safe_multi_item',
							'payload' => array(
								'product_id'   => $product_id,
								'variation_id' => $variation_id,
								'quantity'     => $quantity,
							),
							'cart'    => $cart_summary(),
						),
						400
					);
					return;
				}

				$current_qty = isset( $cart_items[ $target_key ]['quantity'] ) ? (int) $cart_items[ $target_key ]['quantity'] : 0;
				if ( $current_qty && $current_qty !== $quantity ) {
					wp_send_json_error(
						array(
							'message'   => 'cart_payload_mismatch_not_safe_quantity',
							'requested' => $quantity,
							'current'   => $current_qty,
						),
						400
					);
					return;
				}

				$applied = array_values( array_unique( array_filter( array_map( 'wc_clean', (array) WC()->cart->get_applied_coupons() ) ) ) );
				$want    = array_values( array_unique( array_filter( array_map( 'wc_clean', (array) $coupons ) ) ) );
				sort( $applied );
				sort( $want );
				if ( $applied !== $want ) {
					wp_send_json_error(
						array(
							'message'        => 'cart_payload_mismatch_not_safe_coupons',
							'requested'      => $want,
							'applied_coupons' => $applied,
						),
						400
					);
					return;
				}
			} else {
			// Snapshot original cart (once) so we can restore after successful checkout.
			$this->snapshot_cart();
			WC()->session->set( 'trizync_pop_cart_product_checkout', 1 );

			// Remove any non-target items to align with payload truth.
			foreach ( WC()->cart->get_cart() as $key => $item ) {
				if ( '' !== $target_key && (string) $key === (string) $target_key ) {
					continue;
				}
				WC()->cart->remove_cart_item( (string) $key );
			}

			// If target item didn't exist, add it now.
			if ( '' === $target_key ) {
				$added_key = WC()->cart->add_to_cart( $product_id, $quantity, $variation_id, $attributes );
				if ( ! $added_key ) {
					wp_send_json_error(
						array(
							'message'    => 'cart_update_failed_add_to_cart',
							'product_id' => $product_id,
							'notices'    => $this->get_wc_notices(),
						),
						400
					);
					return;
				}
				$target_key = (string) $added_key;
			}

			// Sync quantity.
			$current_qty = isset( WC()->cart->get_cart()[ $target_key ]['quantity'] ) ? (int) WC()->cart->get_cart()[ $target_key ]['quantity'] : 0;
			if ( $current_qty && $current_qty !== $quantity ) {
				$ok = WC()->cart->set_quantity( $target_key, $quantity, true );
				if ( false === $ok ) {
					wp_send_json_error(
						array(
							'message'   => 'cart_update_failed_quantity',
							'requested' => $quantity,
							'current'   => $current_qty,
						),
						400
					);
					return;
				}
			}

			// Sync coupons (payload truth).
			$applied = array_map( 'wc_clean', (array) WC()->cart->get_applied_coupons() );
			$want    = array_map( 'wc_clean', (array) $coupons );

			foreach ( $want as $code ) {
				if ( '' === $code ) {
					continue;
				}
				if ( in_array( $code, $applied, true ) ) {
					continue;
				}
				WC()->cart->apply_coupon( $code );
			}
			// Remove any cart coupons not present in payload.
			foreach ( (array) WC()->cart->get_applied_coupons() as $code ) {
				$code = wc_clean( $code );
				if ( '' === $code ) {
					continue;
				}
				if ( ! in_array( $code, $want, true ) ) {
					WC()->cart->remove_coupon( $code );
				}
			}

			// Sync chosen shipping/payment into session.
			if ( $shipping_method ) {
				WC()->session->set( 'chosen_shipping_methods', array( $shipping_method ) );
			}
			if ( $payment_method ) {
				WC()->session->set( 'chosen_payment_method', $payment_method );
			}

			// Update WC customer (billing/shipping only).
			foreach ( (array) $customer_data as $key => $value ) {
				$clean_key = sanitize_key( (string) $key );
				if ( 0 !== strpos( $clean_key, 'billing_' ) && 0 !== strpos( $clean_key, 'shipping_' ) ) {
					continue;
				}
				if ( null === $value ) {
					continue;
				}
				$setter = 'set_' . $clean_key;
				if ( is_callable( array( WC()->customer, $setter ) ) ) {
					WC()->customer->$setter( wc_clean( $value ) );
				}
			}
			WC()->customer->save();
			WC()->session->set_customer_session_cookie( true );

			WC()->cart->calculate_totals();
		}

		if ( WC()->cart->is_empty() ) {
			wp_send_json_error( array( 'message' => 'cart_empty' ), 400 );
			return;
		}

		// ── Validate shipping availability ─────────────────────────────────────
		$available_rates = array();
		if ( WC()->shipping() ) {
			WC()->shipping()->init();
			$packages = WC()->cart->get_shipping_packages();
			if ( is_array( $packages ) ) {
				foreach ( $packages as $package ) {
					$result = WC()->shipping()->calculate_shipping_for_package( $package );
					foreach ( $result['rates'] ?? array() as $rate_id => $rate ) {
						$available_rates[ $rate_id ] = $rate->get_label();
					}
				}
			}
		}

		if ( ! empty( $available_rates ) ) {
			if ( $shipping_method && ! isset( $available_rates[ $shipping_method ] ) ) {
				wp_send_json_error(
					array(
						'message'           => 'shipping_method_unavailable',
						'requested_method'  => $shipping_method,
						'available_methods' => array_keys( $available_rates ),
					),
					400
				);
				return;
			}
			if ( ! $shipping_method ) {
				$shipping_method = (string) array_key_first( $available_rates );
				WC()->session->set( 'chosen_shipping_methods', array( $shipping_method ) );
			}
		} elseif ( $shipping_method ) {
			wp_send_json_error(
				array(
					'message'          => 'no_shipping_rates_available',
					'requested_method' => $shipping_method,
				),
				400
			);
			return;
		}

		// ── Validate payment method ────────────────────────────────────────────
		if ( WC()->payment_gateways() ) {
			$gateways = WC()->payment_gateways()->get_available_payment_gateways();
			if ( empty( $gateways ) ) {
				wp_send_json_error( array( 'message' => 'no_payment_gateways_available' ), 400 );
				return;
			}
			if ( $payment_method && ( ! isset( $gateways[ $payment_method ] ) || ! $gateways[ $payment_method ]->is_available() ) ) {
				wp_send_json_error(
					array(
						'message'           => 'payment_method_unavailable',
						'requested_method'  => $payment_method,
						'available_methods' => array_keys( $gateways ),
					),
					400
				);
				return;
			}
			if ( ! $payment_method ) {
				$payment_method = (string) array_key_first( $gateways );
				WC()->session->set( 'chosen_payment_method', $payment_method );
			}
		}

		// ── Merge posted values into checkout POST ─────────────────────────────
		$_POST['payment_method'] = $payment_method;
		$_POST['shipping_method'] = $shipping_method ? array( $shipping_method ) : array();

		if ( ! isset( $_POST['woocommerce-process-checkout-nonce'] ) ) {
			$_POST['woocommerce-process-checkout-nonce'] = wp_create_nonce( 'woocommerce-process_checkout' );
		}
		if ( ! isset( $_POST['_wp_http_referer'] ) ) {
			$_POST['_wp_http_referer'] = wc_get_checkout_url();
		}

		// Bring billing/shipping and popcart_* fields into $_POST for Woo checkout processing.
		foreach ( (array) $customer_data as $key => $value ) {
			$clean_key = sanitize_key( (string) $key );
			if ( '' === $clean_key ) {
				continue;
			}
			if ( 0 !== strpos( $clean_key, 'billing_' ) && 0 !== strpos( $clean_key, 'shipping_' ) && 0 !== strpos( $clean_key, 'popcart_' ) ) {
				continue;
			}
			if ( null === $value ) {
				continue;
			}
			$_POST[ $clean_key ] = $value;
		}

		// Persist popcart_* fields into order meta during checkout.
		add_action(
			'woocommerce_checkout_create_order',
			function( $order, $data ) {
				if ( empty( $_REQUEST['trizync_pop_cart'] ) || ! $order instanceof WC_Order ) {
					return;
				}
				foreach ( (array) $_POST as $key => $value ) {
					$key = sanitize_key( (string) $key );
					if ( 0 !== strpos( $key, 'popcart_' ) ) {
						continue;
					}
					if ( is_array( $value ) ) {
						$clean = array_map( 'sanitize_text_field', wp_unslash( $value ) );
						$value = wp_json_encode( $clean );
					} else {
						$value = sanitize_text_field( wp_unslash( (string) $value ) );
					}
					if ( '' === $value ) {
						continue;
					}
					$order->update_meta_data( $key, $value );
				}
			},
			10,
			2
		);

		// ── Capture WC errors/notices during checkout ──────────────────────────
		$wc_errors = array();
		if ( WC()->session ) {
			WC()->session->set( 'trizync_pop_cart_last_checkout_errors', array() );
			WC()->session->set( 'trizync_pop_cart_last_checkout_errors_ts', time() );
		}
		add_filter(
			'woocommerce_add_error',
			function( $error ) use ( &$wc_errors ) {
				$clean = wp_strip_all_tags( (string) $error );
				if ( '' !== $clean ) {
					$wc_errors[] = $clean;
					if ( function_exists( 'WC' ) && WC()->session ) {
						$existing = WC()->session->get( 'trizync_pop_cart_last_checkout_errors' );
						if ( ! is_array( $existing ) ) {
							$existing = array();
						}
						$existing[] = $clean;
						$existing = array_values( array_unique( $existing ) );
						WC()->session->set( 'trizync_pop_cart_last_checkout_errors', $existing );
						WC()->session->set( 'trizync_pop_cart_last_checkout_errors_ts', time() );
					}
				}
				return $error;
			}
		);

		// ── Fire Woo checkout ──────────────────────────────────────────────────
		ob_start();
		if ( class_exists( 'WC_AJAX' ) ) {
			WC_AJAX::checkout();
		}
		$raw_output = ob_get_clean();

		$decoded = json_decode( $raw_output, true );
		if ( is_array( $decoded ) ) {
			if ( isset( $decoded['result'] ) && 'failure' === $decoded['result'] ) {
				wp_send_json_error(
					array(
						'message'     => 'checkout_failed',
						'wc_response' => $decoded,
						'wc_errors'   => $wc_errors,
						'notices'     => $this->get_wc_notices(),
					),
					400
				);
				return;
			}
			// Success — forward WC's response as-is.
			echo $raw_output;
			exit;
		}

		wp_send_json_error(
			array(
				'message'   => 'checkout_failed',
				'wc_errors' => $wc_errors,
				'notices'   => $this->get_wc_notices(),
				'raw'       => $raw_output,
			),
			500
		);
	}

		/**
		 * AJAX (Test): Create order from the CURRENT cart/session only.
		 *
		 * This endpoint is for debugging checkout behavior without PopCart cart preprocessing.
		 * It does not rebuild the cart, apply coupons, or update totals. It only:
		 * - applies PopCart required/optional field rules
		 * - merges customer + popcart_* fields into $_POST
		 * - runs WC_AJAX::checkout() on the current cart/session
		 *
		 * @since 1.0.0
		 */
public function ajax_create_order_test() {
    if ( ! $this->is_enabled() ) {
        wp_send_json_error( array( 'message' => 'disabled' ), 403 );
    }

    $this->require_checkout_or_classic_nonce();

    if ( ! function_exists( 'WC' ) || ! WC()->cart || WC()->cart->is_empty() ) {
        wp_send_json_error( array( 'message' => 'empty_cart' ), 400 );
    }

    $fields_meta   = $this->get_popcart_enabled_fields_meta();
    $enabled_keys  = isset( $fields_meta['enabled_keys'] ) ? array_map( 'sanitize_key', (array) $fields_meta['enabled_keys'] ) : array();
    $required_keys = isset( $fields_meta['required_keys'] ) ? array_map( 'sanitize_key', (array) $fields_meta['required_keys'] ) : array();

    add_filter(
        'woocommerce_checkout_fields',
        function( $fields ) use ( $required_keys ) {
            foreach ( $fields as $group => $group_fields ) {
                if ( ! is_array( $group_fields ) ) {
                    continue;
                }

                foreach ( $group_fields as $key => $field_data ) {
                    $fields[ $group ][ $key ]['required'] = in_array( sanitize_key( $key ), $required_keys, true );
                }
            }

            return $fields;
        },
        999
    );

    $wcc = function_exists( 'WC' ) && WC()->countries ? WC()->countries : null;

    $fallbacks = array(
        'billing_first_name' => 'Customer',
        'billing_last_name'  => '',
        'billing_email'      => wp_get_current_user()->user_email ?: 'guest@example.com',
        'billing_phone'      => '',
        'billing_address_1'  => 'N/A',
        'billing_city'       => $wcc ? $wcc->get_base_city()     : 'N/A',
        'billing_postcode'   => $wcc ? $wcc->get_base_postcode() : '0000',
        'billing_state'      => $wcc ? $wcc->get_base_state()    : '',
        'billing_country'    => $wcc ? $wcc->get_base_country()  : 'BD',
    );

    foreach ( $fallbacks as $field => $fallback ) {
        if ( empty( $_POST[ $field ] ) ) {
            $_POST[ $field ] = $fallback;
        }
    }

    if ( ! isset( $_POST['terms'] ) ) {
        $_POST['terms'] = 'on';
    }

    if ( ! isset( $_POST['_wp_http_referer'] ) ) {
        $_POST['_wp_http_referer'] = wc_get_checkout_url();
    }

    // Best: frontend theke valid Woo nonce ashbe
    if ( empty( $_POST['woocommerce-process-checkout-nonce'] ) ) {
        wp_send_json_error( array( 'message' => 'missing_woo_nonce' ), 400 );
    }

    ob_start();
    WC_AJAX::checkout();
    $raw = ob_get_clean();

    $decoded = json_decode( $raw, true );

    if ( is_array( $decoded ) ) {
        if ( isset( $decoded['result'] ) && 'success' === $decoded['result'] ) {
            wp_send_json_success( array(
                'message' => 'order_created',
                'wc'      => $decoded,
            ) );
        }

        wp_send_json_error( array(
            'message' => 'checkout_failed',
            'wc'      => $decoded,
            'notices' => wc_get_notices(),
        ), 400 );
    }

    wp_send_json_error( array(
        'message' => 'invalid_response',
        'raw'     => $raw,
        'notices' => wc_get_notices(),
    ), 500 );
}

/**
 * Collect current WC notices as plain strings.
 */
private function get_wc_notices(): array {
    $notices = array();
    foreach ( wc_get_notices() as $type => $type_notices ) {
        foreach ( $type_notices as $notice ) {
            $notices[] = array(
                'type'    => $type,
                'message' => wp_strip_all_tags(
                    is_array( $notice ) ? ( $notice['notice'] ?? '' ) : $notice
                ),
            );
        }
    }
    return $notices;
}

	/**
	 * AJAX: Warm WooCommerce session for light flow.
	 *
	 * @since 1.0.0
	 */
	public function ajax_light_warm() {
		if ( ! $this->is_enabled() ) {
			wp_send_json_error( array( 'message' => 'disabled' ), 403 );
		}

		$this->require_preview_or_classic_nonce();

		$this->warm_session_only();
		wp_send_json_success( array( 'warmed' => true ) );
	}

	/**
	 * AJAX: Get enabled PopCart fields with defaults.
	 *
	 * @since 1.0.0
	 */
	public function ajax_get_enabled_fields() {
		if ( ! $this->is_enabled() ) {
			wp_send_json_error( array( 'message' => 'disabled' ), 403 );
		}

		$this->require_preview_or_classic_nonce();

		$meta = $this->get_popcart_enabled_fields_meta();
		$results = isset( $meta['fields'] ) ? $meta['fields'] : array();
		$enabled_keys = isset( $meta['enabled_keys'] ) ? $meta['enabled_keys'] : array();
		$required_keys = isset( $meta['required_keys'] ) ? $meta['required_keys'] : array();

		wp_send_json_success(
			array(
				'fields' => $results,
				'enabled_keys' => $enabled_keys,
				'required_keys' => $required_keys,
				'meta'   => array(
					'source'    => 'popcart',
					'timestamp' => gmdate( 'c' ),
				),
			)
		);
	}

	/**
	 * AJAX: Get saved customer info from session/cookie.
	 *
	 * @since 1.0.0
	 */
	public function ajax_get_customer() {
		if ( ! $this->is_enabled() ) {
			wp_send_json_error( array( 'message' => 'disabled' ), 403 );
		}

		$this->require_preview_or_classic_nonce();

		if ( ! function_exists( 'WC' ) || ! WC()->customer ) {
			wp_send_json_error( array( 'message' => 'customer_unavailable' ), 400 );
		}

		$customer = WC()->customer;

		$billing = array(
			'first_name' => $customer->get_billing_first_name(),
			'last_name'  => $customer->get_billing_last_name(),
			'phone'      => $customer->get_billing_phone(),
			'email'      => $customer->get_billing_email(),
			'address_1'  => $customer->get_billing_address(),
			'address_2'  => $customer->get_billing_address_2(),
			'city'       => $customer->get_billing_city(),
			'state'      => $customer->get_billing_state(),
			'postcode'   => $customer->get_billing_postcode(),
			'country'    => $customer->get_billing_country(),
		);

		$shipping = array(
			'first_name' => $customer->get_shipping_first_name(),
			'last_name'  => $customer->get_shipping_last_name(),
			'phone'      => '',
			'address_1'  => $customer->get_shipping_address(),
			'address_2'  => $customer->get_shipping_address_2(),
			'city'       => $customer->get_shipping_city(),
			'state'      => $customer->get_shipping_state(),
			'postcode'   => $customer->get_shipping_postcode(),
			'country'    => $customer->get_shipping_country(),
		);

		wp_send_json_success(
			array(
				'billing' => $billing,
				'shipping' => $shipping,
				'meta' => array(
					'source'      => 'wc_customer',
					'timestamp'   => gmdate( 'c' ),
					'has_session' => WC()->session ? WC()->session->has_session() : false,
				),
			)
		);
	}

	/**
	 * AJAX: Get WooCommerce notices for popup.
	 *
	 * @since 1.0.0
	 */
	public function ajax_get_notices() {
		if ( ! $this->is_enabled() ) {
			wp_send_json_error( array( 'message' => 'disabled' ), 403 );
		}

		$this->require_preview_or_classic_nonce();

		ob_start();
		if ( function_exists( 'wc_print_notices' ) ) {
			wc_print_notices();
		}
		$notices = ob_get_clean();

		wp_send_json_success(
			array(
				'notices' => $notices,
			)
		);
	}

	/**
	 * AJAX: Get checkout form HTML for popup.
	 *
	 * @since 1.0.0
	 */
	public function ajax_get_checkout_form() {
		if ( ! $this->is_enabled() ) {
			wp_send_json_error( array( 'message' => 'disabled' ), 403 );
		}

		$this->require_preview_or_classic_nonce();

		ob_start();
		$this->render_checkout_form();
		$form_html = ob_get_clean();

		wp_send_json_success(
			array(
				'form' => $form_html,
			)
		);
	}

	/**
	 * AJAX: Get WooCommerce checkout nonce.
	 *
	 * @since 1.0.0
	 */
	public function ajax_get_wc_checkout_nonce() {
		if ( ! $this->is_enabled() ) {
			wp_send_json_error( array( 'message' => 'disabled' ), 403 );
		}

		$this->require_preview_or_classic_nonce();

		wp_send_json_success(
			array(
				'woocommerce-process-checkout-nonce' => wp_create_nonce( 'woocommerce-process_checkout' ),
			)
		);
	}

	/**
	 * AJAX: Apply coupon code.
	 *
	 * @since 1.0.0
	 */
	public function ajax_apply_coupon() {
		if ( ! $this->is_enabled() ) {
			wp_send_json_error( array( 'message' => 'disabled' ), 403 );
		}

		$this->require_checkout_or_classic_nonce();

		$this->ensure_cart_loaded();

		$code = isset( $_POST['code'] ) ? wc_clean( wp_unslash( $_POST['code'] ) ) : '';
		if ( ! $code ) {
			wp_send_json_error( array( 'message' => __( 'Please enter a coupon code.', 'trizync-pop-cart' ) ), 400 );
		}

		if ( ! WC()->cart ) {
			wp_send_json_error( array( 'message' => 'cart_unavailable' ), 400 );
		}

		$applied = WC()->cart->apply_coupon( $code );
		WC()->cart->calculate_totals();

		if ( ! $applied ) {
			$message = __( 'Coupon could not be applied.', 'trizync-pop-cart' );
			if ( function_exists( 'wc_get_notices' ) ) {
				$notices = wc_get_notices( 'error' );
				if ( ! empty( $notices ) && isset( $notices[0]['notice'] ) ) {
					$message = wp_strip_all_tags( $notices[0]['notice'] );
				}
			}
			wp_send_json_error( array( 'message' => $message ), 400 );
		}

		wp_send_json_success( $this->build_cart_payload() );
	}

	/**
	 * AJAX: Remove coupon code.
	 *
	 * @since 1.0.0
	 */
	public function ajax_remove_coupon() {
		if ( ! $this->is_enabled() ) {
			wp_send_json_error( array( 'message' => 'disabled' ), 403 );
		}

		$this->require_checkout_or_classic_nonce();

		$this->ensure_cart_loaded();

		$code = isset( $_POST['code'] ) ? wc_clean( wp_unslash( $_POST['code'] ) ) : '';
		if ( ! $code || ! WC()->cart ) {
			wp_send_json_error( array( 'message' => 'missing_coupon' ), 400 );
		}

		WC()->cart->remove_coupon( $code );
		WC()->cart->calculate_totals();

		wp_send_json_success( $this->build_cart_payload() );
	}

	/**
	 * AJAX: Update customer address data.
	 *
	 * @since 1.0.0
	 */
	public function ajax_update_customer() {
		if ( ! $this->is_enabled() ) {
			wp_send_json_error( array( 'message' => 'disabled' ), 403 );
		}

		$this->require_checkout_or_classic_nonce();

		$this->ensure_cart_loaded();

		if ( ! function_exists( 'WC' ) || ! WC()->customer ) {
			wp_send_json_error( array( 'message' => 'customer_unavailable' ), 400 );
		}

		$data = isset( $_POST['data'] ) ? wp_unslash( $_POST['data'] ) : array();
		if ( ! is_array( $data ) ) {
			$data = array();
		}

		$customer = WC()->customer;
		foreach ( $data as $key => $value ) {
			$clean_key = sanitize_key( $key );
			if ( strpos( $clean_key, 'billing_' ) !== 0 && strpos( $clean_key, 'shipping_' ) !== 0 ) {
				continue;
			}
			if ( '' === $value || null === $value ) {
				continue;
			}
			$setter = 'set_' . $clean_key;
			if ( is_callable( array( $customer, $setter ) ) ) {
				$customer->$setter( wc_clean( $value ) );
			}
		}

		$customer->save();
		if ( WC()->session ) {
			WC()->session->set_customer_session_cookie( true );
		}
		if ( WC()->cart ) {
			WC()->cart->calculate_totals();
		}

		wp_send_json_success( $this->build_cart_payload() );
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

		check_ajax_referer( Trizync_Pop_Cart_Nonces::CLASSIC, 'nonce' );

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

		check_ajax_referer( Trizync_Pop_Cart_Nonces::CLASSIC, 'nonce' );

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

		$this->require_checkout_or_classic_nonce();

		$this->ensure_cart_loaded();

		$method = isset( $_POST['shipping_method'] ) ? wc_clean( wp_unslash( $_POST['shipping_method'] ) ) : '';

		if ( ! $method ) {
			wp_send_json_error( array( 'message' => 'missing_method' ), 400 );
		}

		if ( ! function_exists( 'WC' ) || ! WC()->cart || ! WC()->session ) {
			wp_send_json_error( array( 'message' => 'cart_unavailable' ), 400 );
		}

		$available = array();
		if ( WC()->shipping() ) {
			WC()->shipping()->init();
			$packages = WC()->cart->get_shipping_packages();
			if ( is_array( $packages ) ) {
				// Ensure rates are calculated on packages.
				WC()->shipping()->calculate_shipping( $packages );
				foreach ( $packages as $package ) {
					$rates = array();
					if ( isset( $package['rates'] ) && is_array( $package['rates'] ) ) {
						$rates = $package['rates'];
					} else {
						$calculated = WC()->shipping()->calculate_shipping_for_package( $package );
						if ( is_array( $calculated ) ) {
							$rates = isset( $calculated['rates'] ) && is_array( $calculated['rates'] )
								? $calculated['rates']
								: $calculated;
						}
					}
					if ( ! empty( $rates ) && is_array( $rates ) ) {
						foreach ( $rates as $rate_id => $rate ) {
							$available[ $rate_id ] = true;
						}
					}
				}
			}
		}
		if ( ! empty( $available ) && empty( $available[ $method ] ) ) {
			wp_send_json_error(
				array(
					'message' => 'shipping_method_unavailable',
					'available_methods' => array_keys( $available ),
				),
				400
			);
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

		$this->require_checkout_or_classic_nonce();

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
	 * AJAX: Prepare single product checkout (replace cart).
	 *
	 * @since 1.0.0
	 */
	public function ajax_prepare_product_checkout() {
		if ( ! $this->is_enabled() ) {
			wp_send_json_error( array( 'message' => 'disabled' ), 403 );
		}

		check_ajax_referer( Trizync_Pop_Cart_Nonces::CLASSIC, 'nonce' );

		$this->ensure_cart_loaded();

		$product_id = isset( $_POST['product_id'] ) ? absint( $_POST['product_id'] ) : 0;
		$quantity   = isset( $_POST['quantity'] ) ? absint( $_POST['quantity'] ) : 1;
		$variation_id = isset( $_POST['variation_id'] ) ? absint( $_POST['variation_id'] ) : 0;
		$attributes_raw = isset( $_POST['attributes'] ) ? wp_unslash( $_POST['attributes'] ) : '';
		$replace_cart_only = ! empty( $_POST['replace_cart_only'] );
		$attributes = array();
		if ( $attributes_raw ) {
			$decoded = json_decode( $attributes_raw, true );
			if ( is_array( $decoded ) ) {
				$attributes = $decoded;
			}
		}
		
		if ( ! $product_id ) {
			wp_send_json_error( array( 'message' => 'missing_product' ), 400 );
		}

		if ( ! function_exists( 'WC' ) || ! WC()->cart || ! WC()->session ) {
			wp_send_json_error( array( 'message' => 'cart_unavailable' ), 400 );
		}

		$product = wc_get_product( $product_id );
		if ( $product instanceof WC_Product_Variable && ! $variation_id ) {
			wp_send_json_error( array( 'message' => 'missing_variation' ), 400 );
		}

		if ( $replace_cart_only && WC()->session ) {
			WC()->session->__unset( 'trizync_pop_cart_product_checkout' );
			WC()->session->__unset( 'trizync_pop_cart_snapshot' );
		} else {
			$this->snapshot_cart();
		}
		WC()->cart->empty_cart( true );
		$added_key = WC()->cart->add_to_cart( $product_id, max( 1, $quantity ), $variation_id, $attributes );
		if ( ! $added_key ) {
			wp_send_json_error(
				array(
					'message'    => 'cart_update_failed_add_to_cart',
					'product_id' => $product_id,
					'notices'    => $this->get_wc_notices(),
				),
				400
			);
			return;
		}
		WC()->cart->calculate_totals();

		if ( ! $replace_cart_only && WC()->session ) {
			WC()->session->set( 'trizync_pop_cart_product_checkout', 1 );
		}

		$this->trigger_backend_checkout_hooks( 'prepare_product_checkout' );
		$payload = $this->build_cart_payload();
		$this->fire_added_to_cart_hooks( $payload, $product_id, $quantity, $variation_id, (string) $added_key );
		wp_send_json_success( $payload );
	}

	/**
	 * AJAX: Restore cart after single product checkout flow.
	 *
	 * @since 1.0.0
	 */
	public function ajax_restore_cart() {
		if ( ! $this->is_enabled() ) {
			wp_send_json_error( array( 'message' => 'disabled' ), 403 );
		}

		check_ajax_referer( Trizync_Pop_Cart_Nonces::CLASSIC, 'nonce' );

		$this->ensure_cart_loaded();

		$this->restore_cart_snapshot();

		$this->trigger_backend_checkout_hooks( 'restore_cart' );
		wp_send_json_success( $this->build_cart_payload() );
	}
}
