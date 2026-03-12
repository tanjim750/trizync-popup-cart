<?php

/**
 * Fired during plugin activation
 *
 * @link       https://triizync.com
 * @since      1.0.0
 *
 * @package    Trizync_Pop_Cart
 * @subpackage Trizync_Pop_Cart/includes
 */

/**
 * Fired during plugin activation.
 *
 * This class defines all code necessary to run during the plugin's activation.
 *
 * @since      1.0.0
 * @package    Trizync_Pop_Cart
 * @subpackage Trizync_Pop_Cart/includes
 * @author     Trizync Solution <trizyncsolution@gmail.com>
 */
class Trizync_Pop_Cart_Activator {

	/**
	 * Short Description. (use period)
	 *
	 * Long Description.
	 *
	 * @since    1.0.0
	 */
	public static function activate() {
		if ( false === get_option( TRIZYNC_POP_CART_OPTION_ENABLED ) ) {
			add_option( TRIZYNC_POP_CART_OPTION_ENABLED, 1 );
		}
		if ( false === get_option( TRIZYNC_POP_CART_OPTION_SCRIPTS ) ) {
			add_option( TRIZYNC_POP_CART_OPTION_SCRIPTS, wp_json_encode( array() ) );
		}
	}

}
