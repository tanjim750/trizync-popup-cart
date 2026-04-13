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
			$this->ensure_cart_loaded();
			$this->trigger_checkout_open_hooks();
			$this->trigger_backend_checkout_hooks( 'get_cart' );
			wp_send_json_success( $this->build_cart_payload() );
		} catch ( Throwable $e ) {
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
				wp_send_json_success( $this->light->build_light_preview_payload( $product_id, $quantity, $variation_id, $attributes, $coupons ) );
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
			wp_send_json_error( array( 'message' => 'disabled' ), 403 );
		}

		$this->require_preview_or_classic_nonce();

		try {
			$product_id = isset( $_POST['product_id'] ) ? absint( $_POST['product_id'] ) : 0;
			$quantity   = isset( $_POST['quantity'] ) ? absint( $_POST['quantity'] ) : 1;
			$variation_id = isset( $_POST['variation_id'] ) ? absint( $_POST['variation_id'] ) : 0;
			if ( ! $product_id ) {
				wp_send_json_error( array( 'message' => 'missing_product' ), 400 );
			}

			$product = wc_get_product( $product_id );
			if ( ! $product ) {
				wp_send_json_error( array( 'message' => 'missing_product' ), 400 );
			}
			$display_product = $product;
			if ( $variation_id ) {
				$variation = wc_get_product( $variation_id );
				if ( $variation && $variation->get_parent_id() === $product->get_id() ) {
					$display_product = $variation;
				}
			}

			$shipping_payload = $this->build_shipping_payload_for_product( $display_product, max( 1, (int) $quantity ) );
			if ( $this->light instanceof Trizync_Pop_Cart_Light ) {
				$shipping_payload = $this->light->build_light_shipping_payload_for_product( $display_product, max( 1, (int) $quantity ) );
			}
			wp_send_json_success(
				array(
					'shipping' => isset( $shipping_payload['payload'] ) ? $shipping_payload['payload'] : array(),
				)
			);
		} catch ( Throwable $e ) {
			$this->warm_session_only();
			wp_send_json_error( array( 'message' => 'shipping_unavailable' ), 500 );
		}
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
				$payload = $this->light->build_light_preview_payload( $product_id, $quantity, $variation_id, $attributes, $coupons );
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
		WC()->cart->add_to_cart( $product_id, max( 1, $quantity ), $variation_id, $attributes );
		WC()->cart->calculate_totals();

		if ( ! $replace_cart_only && WC()->session ) {
			WC()->session->set( 'trizync_pop_cart_product_checkout', 1 );
		}

		$this->trigger_backend_checkout_hooks( 'prepare_product_checkout_light' );
		wp_send_json_success( $this->build_cart_payload() );
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

		$fields = $this->get_enabled_fields_config();
		$countries = function_exists( 'WC' ) ? WC()->countries : null;
		$allowed_countries = $countries ? $countries->get_allowed_countries() : array();
		$base_country  = $countries ? $countries->get_base_country() : '';
		$base_state    = $countries ? $countries->get_base_state() : '';
		$base_postcode = $countries ? $countries->get_base_postcode() : '';
		$base_city     = $countries ? $countries->get_base_city() : '';
		$first_allowed = ! empty( $allowed_countries ) ? array_key_first( $allowed_countries ) : '';

		$customer = function_exists( 'WC' ) ? WC()->customer : null;

		$results = array();
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

		wp_send_json_success(
			array(
				'fields' => $results,
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
		WC()->cart->add_to_cart( $product_id, max( 1, $quantity ), $variation_id, $attributes );
		WC()->cart->calculate_totals();

		if ( ! $replace_cart_only && WC()->session ) {
			WC()->session->set( 'trizync_pop_cart_product_checkout', 1 );
		}

		$this->trigger_backend_checkout_hooks( 'prepare_product_checkout' );
		wp_send_json_success( $this->build_cart_payload() );
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
