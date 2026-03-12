<?php

/**
 * The plugin bootstrap file
 *
 * This file is read by WordPress to generate the plugin information in the plugin
 * admin area. This file also includes all of the dependencies used by the plugin,
 * registers the activation and deactivation functions, and defines a function
 * that starts the plugin.
 *
 * @link              https://triizync.com
 * @since             1.0.0
 * @package           Trizync_Pop_Cart
 *
 * @wordpress-plugin
 * Plugin Name:       PopCart
 * Plugin URI:        https://triizync.com
 * Description:       PopCart is a plugin that helps to configure a on page checkout system
 * Version:           1.0.0
 * Author:            Trizync Solution
 * Author URI:        https://triizync.com/
 * License:           GPL-2.0+
 * License URI:       http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       trizync-pop-cart
 * Domain Path:       /languages
 */

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Currently plugin version.
 * Start at version 1.0.0 and use SemVer - https://semver.org
 * Rename this for your plugin and update it as you release new versions.
 */
define( 'TRIZYNC_POP_CART_VERSION', '1.0.0' );
define( 'TRIZYNC_POP_CART_OPTION_ENABLED', 'trizync_pop_cart_enabled' );
define( 'TRIZYNC_POP_CART_OPTION_FIELDS', 'trizync_pop_cart_fields' );
define( 'TRIZYNC_POP_CART_OPTION_BRANDING', 'trizync_pop_cart_branding' );
define( 'TRIZYNC_POP_CART_OPTION_CTA_LABEL', 'trizync_pop_cart_cta_label' );
define( 'TRIZYNC_POP_CART_OPTION_HEADER_EYEBROW', 'trizync_pop_cart_header_eyebrow' );
define( 'TRIZYNC_POP_CART_OPTION_HEADER_TITLE', 'trizync_pop_cart_header_title' );
define( 'TRIZYNC_POP_CART_OPTION_SCRIPTS', 'trizync_pop_cart_scripts' );

/**
 * The code that runs during plugin activation.
 * This action is documented in includes/class-trizync-pop-cart-activator.php
 */
function activate_trizync_pop_cart() {
	require_once plugin_dir_path( __FILE__ ) . 'includes/class-trizync-pop-cart-activator.php';
	Trizync_Pop_Cart_Activator::activate();
}

/**
 * The code that runs during plugin deactivation.
 * This action is documented in includes/class-trizync-pop-cart-deactivator.php
 */
function deactivate_trizync_pop_cart() {
	require_once plugin_dir_path( __FILE__ ) . 'includes/class-trizync-pop-cart-deactivator.php';
	Trizync_Pop_Cart_Deactivator::deactivate();
}

register_activation_hook( __FILE__, 'activate_trizync_pop_cart' );
register_deactivation_hook( __FILE__, 'deactivate_trizync_pop_cart' );

/**
 * The core plugin class that is used to define internationalization,
 * admin-specific hooks, and public-facing site hooks.
 */
require plugin_dir_path( __FILE__ ) . 'includes/class-trizync-pop-cart.php';

/**
 * Begins execution of the plugin.
 *
 * Since everything within the plugin is registered via hooks,
 * then kicking off the plugin from this point in the file does
 * not affect the page life cycle.
 *
 * @since    1.0.0
 */
function run_trizync_pop_cart() {

	$plugin = new Trizync_Pop_Cart();
	$plugin->run();

}
run_trizync_pop_cart();
