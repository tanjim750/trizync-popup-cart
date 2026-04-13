<?php

/**
 * Nonce registry for PopCart AJAX endpoints.
 *
 * @since 1.0.0
 * @package Trizync_Pop_Cart
 */
class Trizync_Pop_Cart_Nonces {
	public const CLASSIC  = 'trizync_pop_cart_nonce';
	public const PREVIEW  = 'trizync_pop_cart_preview';
	public const CHECKOUT = 'trizync_pop_cart_checkout';

	/**
	 * Get all supported nonce names.
	 *
	 * @since 1.0.0
	 * @return array
	 */
	public static function all() {
		return array(
			'classic'  => self::CLASSIC,
			'preview'  => self::PREVIEW,
			'checkout' => self::CHECKOUT,
		);
	}
}
