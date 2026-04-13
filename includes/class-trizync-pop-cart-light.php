<?php

/**
 * Light flow helpers for PopCart.
 *
 * @since 1.0.0
 * @package Trizync_Pop_Cart
 */
class Trizync_Pop_Cart_Light extends Trizync_Pop_Cart_Public {

	/**
	 * Build a light preview payload for a product.
	 *
	 * @param int   $product_id
	 * @param int   $quantity
	 * @param int   $variation_id
	 * @param array $attributes
	 * @param array $coupon_codes
	 * @return array
	 */
	public function build_light_preview_payload( $product_id, $quantity = 1, $variation_id = 0, $attributes = array(), $coupon_codes = array() ) {
		if ( ! function_exists( 'wc_get_product' ) ) {
			return array(
				'items'     => array(),
				'shipping'  => array(),
				'subtotal'  => '',
				'subtotal_raw' => 0,
				'total'     => '',
				'total_raw' => 0,
				'itemCount' => 0,
				'estimated' => true,
			);
		}

		$product = wc_get_product( $product_id );
		if ( ! $product ) {
			return array(
				'items'     => array(),
				'shipping'  => array(),
				'subtotal'  => '',
				'subtotal_raw' => 0,
				'total'     => '',
				'total_raw' => 0,
				'itemCount' => 0,
				'estimated' => true,
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

		$line_excl = function_exists( 'wc_get_price_excluding_tax' )
			? wc_get_price_excluding_tax( $display_product, array( 'qty' => $quantity ) )
			: (float) $display_product->get_price() * $quantity;
		$line_incl = function_exists( 'wc_get_price_including_tax' )
			? wc_get_price_including_tax( $display_product, array( 'qty' => $quantity ) )
			: $line_excl;
		$tax_total_raw = max( 0, (float) $line_incl - (float) $line_excl );

		$display_subtotal = function_exists( 'wc_get_price_to_display' )
			? wc_get_price_to_display( $display_product, array( 'qty' => $quantity ) )
			: (float) $display_product->get_price() * $quantity;

		$shipping_payload = $this->build_light_shipping_payload_for_product( $display_product, $quantity );
		$shipping_total_raw = isset( $shipping_payload['total_raw'] ) ? (float) $shipping_payload['total_raw'] : 0.0;
		$shipping_tax_raw   = isset( $shipping_payload['tax_raw'] ) ? (float) $shipping_payload['tax_raw'] : 0.0;

		$coupon_result = $this->build_light_coupon_payload( $coupon_codes, $display_product, (float) $line_excl, $quantity, $shipping_total_raw, $shipping_tax_raw );
		$product_discount_raw  = isset( $coupon_result['product_discount_raw'] ) ? (float) $coupon_result['product_discount_raw'] : 0.0;
		$shipping_discount_raw = isset( $coupon_result['shipping_discount_raw'] ) ? (float) $coupon_result['shipping_discount_raw'] : 0.0;
		$shipping_tax_discount_raw = isset( $coupon_result['shipping_tax_discount_raw'] ) ? (float) $coupon_result['shipping_tax_discount_raw'] : 0.0;
		$discount_raw  = isset( $coupon_result['discount_total_raw'] ) ? (float) $coupon_result['discount_total_raw'] : 0.0;
		$coupon_errors = isset( $coupon_result['errors'] ) ? (array) $coupon_result['errors'] : array();

		$tax_total_raw = $this->adjust_tax_after_discount( $tax_total_raw, (float) $line_excl, $product_discount_raw );
		$total_raw = (float) $line_excl - $product_discount_raw + $tax_total_raw + $shipping_total_raw - $shipping_discount_raw + $shipping_tax_raw - $shipping_tax_discount_raw;

		$payment_payload = $this->build_payment_payload();
		$coupons_payload = $coupon_result['coupons'];

		$product_type = $product->get_type();
		$product_data = array(
			'id'                  => $product->get_id(),
			'type'                => $product_type,
			'name'                => $product->get_name(),
			'sku'                 => $product->get_sku(),
			'price_raw'           => (float) $product->get_price(),
			'regular_price_raw'   => (float) $product->get_regular_price(),
			'sale_price_raw'      => (float) $product->get_sale_price(),
			'image'               => $product->get_image_id() ? wp_get_attachment_image_url( $product->get_image_id(), 'thumbnail' ) : '',
			'permalink'           => get_permalink( $product->get_id() ),
			'attributes'          => array(),
			'variations'          => array(),
			'default_attributes'  => array(),
			'selected_variation_id' => $variation_id,
			'selected_attributes' => $attributes,
		);

		if ( $product instanceof WC_Product_Variable ) {
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
					'id'                => $variation_data['variation_id'],
					'sku'               => $variation_product ? $variation_product->get_sku() : '',
					'price_raw'         => isset( $variation_data['display_price'] ) ? (float) $variation_data['display_price'] : ( $variation_product ? (float) $variation_product->get_price() : 0.0 ),
					'regular_price_raw' => isset( $variation_data['display_regular_price'] ) ? (float) $variation_data['display_regular_price'] : ( $variation_product ? (float) $variation_product->get_regular_price() : 0.0 ),
					'price_html'        => isset( $variation_data['price_html'] ) ? $variation_data['price_html'] : '',
					'image'             => isset( $variation_data['image']['src'] ) ? $variation_data['image']['src'] : '',
					'is_in_stock'       => ! empty( $variation_data['is_in_stock'] ),
					'is_purchasable'    => ! empty( $variation_data['is_purchasable'] ),
					'attributes'        => $variation_attrs,
				);
			}

			$product_data['attributes'] = $attributes_list;
			$product_data['variations'] = $variations;
			$product_data['default_attributes'] = $normalized_defaults;
		}

		$line_tax_breakdown = $this->build_line_tax_breakdown( $display_product, $line_excl );

		return array(
			'items'     => array(
				array(
					'key'            => 'preview',
					'product_id'     => $display_product->get_id(),
					'sku'            => $display_product->get_sku(),
					'name'           => $display_product->get_name(),
					'quantity'       => $quantity,
					'total'          => wc_price( $line_excl ),
					'line_total_raw' => (float) $line_excl,
					'line_tax'       => $tax_total_raw ? wc_price( $tax_total_raw ) : '',
					'line_tax_raw'   => $tax_total_raw,
					'line_taxes'     => $line_tax_breakdown,
					'tax_class'      => $display_product->get_tax_class(),
					'price_raw'      => (float) $display_product->get_price(),
					'regular_price_raw' => (float) $display_product->get_regular_price(),
					'sale_price_raw' => (float) $display_product->get_sale_price(),
					'image'          => $display_product->get_image_id() ? wp_get_attachment_image_url( $display_product->get_image_id(), 'thumbnail' ) : '',
					'permalink'      => get_permalink( $display_product->get_id() ),
				),
			),
			'shipping'  => isset( $shipping_payload['payload'] ) ? $shipping_payload['payload'] : array(),
			'payment'   => $payment_payload,
			'coupons'   => $coupons_payload,
			'notices'   => $this->build_notices(),
			'subtotal'  => wc_price( $display_subtotal ),
			'subtotal_raw' => (float) $line_excl,
			'discount_total' => $discount_raw ? wc_price( $discount_raw ) : '',
			'discount_total_raw' => $discount_raw,
			'shipping_discount' => $shipping_discount_raw ? wc_price( $shipping_discount_raw ) : '',
			'shipping_discount_raw' => $shipping_discount_raw,
			'shipping_tax_discount_raw' => $shipping_tax_discount_raw,
			'tax_total' => $tax_total_raw ? wc_price( $tax_total_raw ) : '',
			'tax_total_raw' => $tax_total_raw,
			'shipping_tax_total' => $shipping_tax_raw ? wc_price( $shipping_tax_raw ) : '',
			'shipping_tax_total_raw' => $shipping_tax_raw,
			'total'     => wc_price( $total_raw ),
			'total_raw' => $total_raw,
			'hash'      => '',
			'itemCount' => $quantity,
			'product'   => $product_data,
			'errors'    => $coupon_errors,
			'estimated' => true,
		);
	}

	/**
	 * Build shipping payload for light preview (no cart dependency).
	 *
	 * @param WC_Product $product
	 * @param int        $quantity
	 * @return array
	 */
	public function build_light_shipping_payload_for_product( $product, $quantity ) {
		if ( ! function_exists( 'WC' ) || ! WC()->shipping() ) {
			$fallback = $this->build_shipping_methods_fallback();
			if ( ! empty( $fallback['methods'] ) ) {
				foreach ( $fallback['methods'] as &$method ) {
					if ( ! isset( $method['tax_total_raw'] ) ) {
						$method['tax_total_raw'] = 0.0;
					}
					if ( ! isset( $method['tax_total'] ) ) {
						$method['tax_total'] = '';
					}
					if ( ! isset( $method['taxes'] ) ) {
						$method['taxes'] = array();
					}
				}
				unset( $method );
			}
			return array(
				'payload'   => $fallback,
				'total_raw' => isset( $fallback['total_raw'] ) ? (float) $fallback['total_raw'] : 0,
			);
		}

		WC()->shipping()->init();

		$quantity      = max( 1, (int) $quantity );
		$contents_cost = (float) $product->get_price() * $quantity;
		$destination   = array();

		$countries = WC()->countries;
		$base_country  = $countries ? $countries->get_base_country() : '';
		$base_state    = $countries ? $countries->get_base_state() : '';
		$base_postcode = $countries ? $countries->get_base_postcode() : '';
		$base_city     = $countries ? $countries->get_base_city() : '';
		$allowed_countries = $countries ? $countries->get_allowed_countries() : array();
		$first_allowed = ! empty( $allowed_countries ) ? array_key_first( $allowed_countries ) : '';

		if ( WC()->customer ) {
			$destination = array(
				'country'   => WC()->customer->get_shipping_country() ? WC()->customer->get_shipping_country() : WC()->customer->get_billing_country(),
				'state'     => WC()->customer->get_shipping_state() ? WC()->customer->get_shipping_state() : WC()->customer->get_billing_state(),
				'postcode'  => WC()->customer->get_shipping_postcode() ? WC()->customer->get_shipping_postcode() : WC()->customer->get_billing_postcode(),
				'city'      => WC()->customer->get_shipping_city() ? WC()->customer->get_shipping_city() : WC()->customer->get_billing_city(),
				'address'   => WC()->customer->get_shipping_address() ? WC()->customer->get_shipping_address() : WC()->customer->get_billing_address(),
				'address_2' => WC()->customer->get_shipping_address_2() ? WC()->customer->get_shipping_address_2() : WC()->customer->get_billing_address_2(),
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
			$fallback = $this->build_shipping_methods_fallback();
			if ( ! empty( $fallback['methods'] ) ) {
				foreach ( $fallback['methods'] as &$method ) {
					if ( ! isset( $method['tax_total_raw'] ) ) {
						$method['tax_total_raw'] = 0.0;
					}
					if ( ! isset( $method['tax_total'] ) ) {
						$method['tax_total'] = '';
					}
					if ( ! isset( $method['taxes'] ) ) {
						$method['taxes'] = array();
					}
				}
				unset( $method );
			}
			return array(
				'payload'   => $fallback,
				'total_raw' => isset( $fallback['total_raw'] ) ? (float) $fallback['total_raw'] : 0,
				'tax_raw'   => isset( $fallback['tax_total_raw'] ) ? (float) $fallback['tax_total_raw'] : 0,
			);
		}

		$chosen_method = $this->get_default_shipping_method_id( $rates );

		$methods = array();
		foreach ( $rates as $rate_id => $rate ) {
			if ( ! $rate instanceof WC_Shipping_Rate ) {
				continue;
			}
			$rate_taxes = array();
			$rate_tax_total = 0.0;
			if ( method_exists( $rate, 'get_taxes' ) ) {
				$taxes = $rate->get_taxes();
				if ( is_array( $taxes ) ) {
					foreach ( $taxes as $tax_id => $amount ) {
						$amount = (float) $amount;
						if ( $amount <= 0 ) {
							continue;
						}
						$rate_tax_total += $amount;
						$rate_taxes[] = array(
							'id'     => (string) $tax_id,
							'amount' => wc_price( $amount ),
							'amount_raw' => $amount,
						);
					}
				}
			}
			$methods[] = array(
				'id'        => $rate_id,
				'label'     => $rate->get_label(),
				'price'     => wc_price( $rate->get_cost() ),
				'selected'  => $rate_id === $chosen_method,
				'method_id' => $rate->get_method_id(),
				'tax_total' => $rate_tax_total ? wc_price( $rate_tax_total ) : '',
				'tax_total_raw' => $rate_tax_total,
				'taxes'     => $rate_taxes,
			);
		}

		$selected_rate = isset( $rates[ $chosen_method ] ) ? $rates[ $chosen_method ] : null;
		$shipping_cost = $selected_rate ? (float) $selected_rate->get_cost() : 0.0;
		$shipping_tax = 0.0;
		if ( $selected_rate && method_exists( $selected_rate, 'get_taxes' ) ) {
			$taxes = $selected_rate->get_taxes();
			if ( is_array( $taxes ) ) {
				$shipping_tax = (float) array_sum( $taxes );
			}
		}

		return array(
			'payload'   => array(
				'methods'   => $methods,
				'chosen'    => $chosen_method,
				'total'     => wc_price( $shipping_cost ),
				'total_raw' => $shipping_cost,
				'tax_total' => $shipping_tax ? wc_price( $shipping_tax ) : '',
				'tax_total_raw' => $shipping_tax,
			),
			'total_raw' => $shipping_cost,
			'tax_raw'   => $shipping_tax,
		);
	}

	/**
	 * Build coupon payload and discount for light preview.
	 *
	 * @param array      $coupon_codes
	 * @param WC_Product $product
	 * @param float      $line_subtotal
	 * @param int        $quantity
	 * @return array
	 */
	protected function build_light_coupon_payload( $coupon_codes, $product, $line_subtotal, $quantity, $shipping_total = 0.0, $shipping_tax = 0.0 ) {
		$codes = array();
		foreach ( (array) $coupon_codes as $code ) {
			$code = wc_clean( $code );
			if ( $code ) {
				$codes[] = $code;
			}
		}
		$codes = array_unique( $codes );
		if ( empty( $codes ) ) {
			return array(
				'coupons' => array(),
				'discount_total_raw' => 0,
				'errors' => array(),
			);
		}

		$discount_total = 0.0;
		$product_discount_total = 0.0;
		$shipping_discount_total = 0.0;
		$shipping_tax_discount_total = 0.0;
		$coupons_payload = array();
		$errors_payload = array();
		$product_id = $product ? $product->get_id() : 0;
		$parent_id  = $product && method_exists( $product, 'get_parent_id' ) ? (int) $product->get_parent_id() : 0;
		$category_ids = $product ? $product->get_category_ids() : array();

		foreach ( $codes as $code ) {
			try {
				$coupon = new WC_Coupon( $code );
			} catch ( Throwable $e ) {
				continue;
			}

			if ( ! $coupon || ! $coupon->get_code() ) {
				$errors_payload[] = array(
					'code'    => $code,
					'id'      => 'invalid_coupon',
					'message' => __( 'Coupon is not valid.', 'trizync-pop-cart' ),
				);
				continue;
			}

			$item_key = 'trizync_preview';
			$item = array(
				'key'           => $item_key,
				'product_id'    => $product_id,
				'variation_id'  => $parent_id ? $product_id : 0,
				'quantity'      => $quantity,
				'data'          => $product,
				'line_subtotal' => (float) $line_subtotal,
				'line_total'    => (float) $line_subtotal,
				'line_subtotal_tax' => 0,
				'line_tax'      => 0,
				'variation'     => array(),
			);

			$product_discount = null;
			if ( class_exists( 'WC_Discounts' ) ) {
				$discounts = new WC_Discounts();
				if ( method_exists( $discounts, 'set_items' ) ) {
					$discounts->set_items( array( $item_key => $item ) );
				}
				if ( method_exists( $discounts, 'is_coupon_valid' ) && ! $discounts->is_coupon_valid( $coupon ) ) {
					$errors_payload[] = array(
						'code'    => $coupon->get_code(),
						'id'      => 'coupon_not_applicable',
						'message' => __( 'Coupon is not applicable.', 'trizync-pop-cart' ),
					);
					continue;
				}
				if ( method_exists( $discounts, 'apply_coupon' ) ) {
					$discounts->apply_coupon( $coupon );
				}
				if ( method_exists( $discounts, 'get_discounts_by_coupon' ) ) {
					$by_coupon = $discounts->get_discounts_by_coupon( $coupon->get_code() );
					if ( is_array( $by_coupon ) ) {
						if ( isset( $by_coupon[ $item_key ] ) ) {
							$discount_line = $by_coupon[ $item_key ];
							$product_discount = is_array( $discount_line ) ? array_sum( $discount_line ) : (float) $discount_line;
						} elseif ( isset( $by_coupon['total'] ) ) {
							$product_discount = (float) $by_coupon['total'];
						}
					} elseif ( is_numeric( $by_coupon ) ) {
						$product_discount = (float) $by_coupon;
					}
				} elseif ( method_exists( $discounts, 'get_discounts' ) ) {
					$all_discounts = $discounts->get_discounts();
					if ( is_array( $all_discounts ) && isset( $all_discounts[ $item_key ] ) ) {
						$discount_line = $all_discounts[ $item_key ];
						$product_discount = is_array( $discount_line ) ? array_sum( $discount_line ) : (float) $discount_line;
					}
				}
			}

			$expires = $coupon->get_date_expires();
			if ( $expires && $expires->getTimestamp() < time() ) {
				$errors_payload[] = array(
					'code'    => $coupon->get_code(),
					'id'      => 'coupon_expired',
					'message' => __( 'Coupon has expired.', 'trizync-pop-cart' ),
				);
				continue;
			}

			$product_ids = $coupon->get_product_ids();
			$excluded_product_ids = $coupon->get_excluded_product_ids();
			if ( ! empty( $product_ids ) && ! in_array( $product_id, $product_ids, true ) && ( ! $parent_id || ! in_array( $parent_id, $product_ids, true ) ) ) {
				$errors_payload[] = array(
					'code'    => $coupon->get_code(),
					'id'      => 'coupon_not_applicable_product',
					'message' => __( 'Coupon is not applicable to this product.', 'trizync-pop-cart' ),
				);
				continue;
			}
			if ( ! empty( $excluded_product_ids ) && ( in_array( $product_id, $excluded_product_ids, true ) || ( $parent_id && in_array( $parent_id, $excluded_product_ids, true ) ) ) ) {
				$errors_payload[] = array(
					'code'    => $coupon->get_code(),
					'id'      => 'coupon_excluded_product',
					'message' => __( 'Coupon is not applicable to this product.', 'trizync-pop-cart' ),
				);
				continue;
			}

			$include_categories = $coupon->get_product_categories();
			$exclude_categories = $coupon->get_excluded_product_categories();
			if ( ! empty( $include_categories ) && empty( array_intersect( $include_categories, $category_ids ) ) ) {
				$errors_payload[] = array(
					'code'    => $coupon->get_code(),
					'id'      => 'coupon_category_not_applicable',
					'message' => __( 'Coupon is not applicable to this product.', 'trizync-pop-cart' ),
				);
				continue;
			}
			if ( ! empty( $exclude_categories ) && ! empty( array_intersect( $exclude_categories, $category_ids ) ) ) {
				$errors_payload[] = array(
					'code'    => $coupon->get_code(),
					'id'      => 'coupon_category_excluded',
					'message' => __( 'Coupon is not applicable to this product.', 'trizync-pop-cart' ),
				);
				continue;
			}

			$minimum = (float) $coupon->get_minimum_amount();
			$maximum = (float) $coupon->get_maximum_amount();
			if ( $minimum && $line_subtotal < $minimum ) {
				$errors_payload[] = array(
					'code'    => $coupon->get_code(),
					'id'      => 'coupon_minimum_spend',
					'message' => __( 'Coupon does not meet minimum spend.', 'trizync-pop-cart' ),
				);
				continue;
			}
			if ( $maximum && $line_subtotal > $maximum ) {
				$errors_payload[] = array(
					'code'    => $coupon->get_code(),
					'id'      => 'coupon_maximum_spend',
					'message' => __( 'Coupon exceeds maximum spend.', 'trizync-pop-cart' ),
				);
				continue;
			}

			$discount = is_null( $product_discount ) ? 0.0 : (float) $product_discount;
			$shipping_discount = 0.0;
			$shipping_tax_discount = 0.0;
			$amount   = (float) $coupon->get_amount();
			$type     = $coupon->get_discount_type();
			$apply_to_shipping = method_exists( $coupon, 'get_apply_to_shipping' ) ? (bool) $coupon->get_apply_to_shipping() : false;
			$free_shipping = method_exists( $coupon, 'get_free_shipping' ) ? (bool) $coupon->get_free_shipping() : false;
			if ( is_null( $product_discount ) ) {
				if ( 'percent' === $type ) {
					$discount = $line_subtotal * ( $amount / 100 );
					if ( $apply_to_shipping && $shipping_total > 0 ) {
						$shipping_discount = $shipping_total * ( $amount / 100 );
					}
				} elseif ( 'fixed_product' === $type ) {
					$discount = $amount * $quantity;
				} elseif ( 'fixed_cart' === $type ) {
					$base_total = $line_subtotal + ( $apply_to_shipping ? (float) $shipping_total : 0.0 );
					$discount = min( $amount, $base_total );
					if ( $apply_to_shipping && $base_total > 0 ) {
						$shipping_discount = $discount * ( (float) $shipping_total / $base_total );
						$discount = $discount - $shipping_discount;
					}
				}
			}

			if ( $apply_to_shipping && $shipping_total > 0 && $shipping_discount <= 0 ) {
				if ( 'percent' === $type ) {
					$shipping_discount = $shipping_total * ( $amount / 100 );
				} elseif ( 'fixed_cart' === $type ) {
					$remaining = max( 0.0, $amount - $discount );
					$shipping_discount = min( (float) $shipping_total, $remaining );
				}
			}

			if ( $free_shipping && $shipping_total > 0 ) {
				$shipping_discount = max( $shipping_discount, (float) $shipping_total );
			}

			if ( $discount <= 0 && $shipping_discount <= 0 ) {
				$errors_payload[] = array(
					'code'    => $coupon->get_code(),
					'id'      => 'coupon_not_applied',
					'message' => __( 'Coupon could not be applied.', 'trizync-pop-cart' ),
				);
				continue;
			}

			$discount = min( $line_subtotal, $discount );
			$shipping_discount = min( (float) $shipping_total, $shipping_discount );
			if ( $shipping_total > 0 && $shipping_tax > 0 && $shipping_discount > 0 ) {
				$shipping_tax_discount = $shipping_tax * ( $shipping_discount / $shipping_total );
			}

			$discount_total += ( $discount + $shipping_discount );
			$product_discount_total += $discount;
			$shipping_discount_total += $shipping_discount;
			$shipping_tax_discount_total += $shipping_tax_discount;
			$coupons_payload[] = array(
				'code'   => $coupon->get_code(),
				'amount' => wc_price( $discount + $shipping_discount ),
				'amount_raw' => (float) ( $discount + $shipping_discount ),
			);
		}

		$discount_total = min( (float) ( $line_subtotal + $shipping_total ), $discount_total );
		$product_discount_total = min( (float) $line_subtotal, $product_discount_total );
		$shipping_discount_total = min( (float) $shipping_total, $shipping_discount_total );

		return array(
			'coupons' => $coupons_payload,
			'discount_total_raw' => (float) $discount_total,
			'product_discount_raw' => (float) $product_discount_total,
			'shipping_discount_raw' => (float) $shipping_discount_total,
			'shipping_tax_discount_raw' => (float) $shipping_tax_discount_total,
			'errors' => $errors_payload,
		);
	}

	/**
	 * Build a tax breakdown for a single line.
	 *
	 * @param WC_Product $product
	 * @param float      $line_subtotal
	 * @return array
	 */
	protected function build_line_tax_breakdown( $product, $line_subtotal ) {
		if ( ! function_exists( 'WC_Tax' ) || ! $product || ! wc_tax_enabled() ) {
			return array();
		}

		$tax_class = $product->get_tax_class();
		$rates = WC_Tax::get_rates( $tax_class );
		if ( empty( $rates ) ) {
			return array();
		}

		$taxes = WC_Tax::calc_tax( $line_subtotal, $rates, false );
		$breakdown = array();
		foreach ( $taxes as $tax_id => $amount ) {
			$amount = (float) $amount;
			if ( $amount <= 0 ) {
				continue;
			}
			$breakdown[] = array(
				'id'        => (string) $tax_id,
				'amount'    => wc_price( $amount ),
				'amount_raw' => $amount,
			);
		}

		return $breakdown;
	}

	/**
	 * Adjust tax amount after discounts.
	 *
	 * @param float $tax_total
	 * @param float $line_subtotal
	 * @param float $discount
	 * @return float
	 */
	protected function adjust_tax_after_discount( $tax_total, $line_subtotal, $discount ) {
		$line_subtotal = max( 0.0, (float) $line_subtotal );
		$discount = max( 0.0, (float) $discount );
		if ( $line_subtotal <= 0 || $discount <= 0 ) {
			return (float) $tax_total;
		}
		$ratio = max( 0.0, ( $line_subtotal - $discount ) / $line_subtotal );
		return (float) $tax_total * $ratio;
	}
}
