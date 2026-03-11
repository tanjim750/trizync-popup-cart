<?php

/**
 * The file that defines the core plugin class
 *
 * A class definition that includes attributes and functions used across both the
 * public-facing side of the site and the admin area.
 *
 * @link       https://triizync.com
 * @since      1.0.0
 *
 * @package    Trizync_Pop_Cart
 * @subpackage Trizync_Pop_Cart/includes
 */

/**
 * The core plugin class.
 *
 * This is used to define internationalization, admin-specific hooks, and
 * public-facing site hooks.
 *
 * Also maintains the unique identifier of this plugin as well as the current
 * version of the plugin.
 *
 * @since      1.0.0
 * @package    Trizync_Pop_Cart
 * @subpackage Trizync_Pop_Cart/includes
 * @author     Trizync Solution <trizyncsolution@gmail.com>
 */
class Trizync_Pop_Cart {

	/**
	 * The loader that's responsible for maintaining and registering all hooks that power
	 * the plugin.
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      Trizync_Pop_Cart_Loader    $loader    Maintains and registers all hooks for the plugin.
	 */
	protected $loader;

	/**
	 * The unique identifier of this plugin.
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      string    $plugin_name    The string used to uniquely identify this plugin.
	 */
	protected $plugin_name;

	/**
	 * The current version of the plugin.
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      string    $version    The current version of the plugin.
	 */
	protected $version;

	/**
	 * Define the core functionality of the plugin.
	 *
	 * Set the plugin name and the plugin version that can be used throughout the plugin.
	 * Load the dependencies, define the locale, and set the hooks for the admin area and
	 * the public-facing side of the site.
	 *
	 * @since    1.0.0
	 */
	public function __construct() {
		if ( defined( 'TRIZYNC_POP_CART_VERSION' ) ) {
			$this->version = TRIZYNC_POP_CART_VERSION;
		} else {
			$this->version = '1.0.0';
		}
		$this->plugin_name = 'trizync-pop-cart';

		$this->load_dependencies();
		$this->set_locale();
		$this->define_admin_hooks();
		$this->define_public_hooks();

	}

	/**
	 * Load the required dependencies for this plugin.
	 *
	 * Include the following files that make up the plugin:
	 *
	 * - Trizync_Pop_Cart_Loader. Orchestrates the hooks of the plugin.
	 * - Trizync_Pop_Cart_i18n. Defines internationalization functionality.
	 * - Trizync_Pop_Cart_Admin. Defines all hooks for the admin area.
	 * - Trizync_Pop_Cart_Public. Defines all hooks for the public side of the site.
	 *
	 * Create an instance of the loader which will be used to register the hooks
	 * with WordPress.
	 *
	 * @since    1.0.0
	 * @access   private
	 */
	private function load_dependencies() {

		/**
		 * The class responsible for orchestrating the actions and filters of the
		 * core plugin.
		 */
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'includes/class-trizync-pop-cart-loader.php';

		/**
		 * The class responsible for defining internationalization functionality
		 * of the plugin.
		 */
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'includes/class-trizync-pop-cart-i18n.php';

		/**
		 * The class responsible for defining all actions that occur in the admin area.
		 */
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'admin/class-trizync-pop-cart-admin.php';

		/**
		 * The class responsible for defining all actions that occur in the public-facing
		 * side of the site.
		 */
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'public/class-trizync-pop-cart-public.php';

		$this->loader = new Trizync_Pop_Cart_Loader();

	}

	/**
	 * Define the locale for this plugin for internationalization.
	 *
	 * Uses the Trizync_Pop_Cart_i18n class in order to set the domain and to register the hook
	 * with WordPress.
	 *
	 * @since    1.0.0
	 * @access   private
	 */
	private function set_locale() {

		$plugin_i18n = new Trizync_Pop_Cart_i18n();

		$this->loader->add_action( 'plugins_loaded', $plugin_i18n, 'load_plugin_textdomain' );

	}

	/**
	 * Register all of the hooks related to the admin area functionality
	 * of the plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 */
	private function define_admin_hooks() {

		$plugin_admin = new Trizync_Pop_Cart_Admin( $this->get_plugin_name(), $this->get_version() );

		$this->loader->add_action( 'admin_menu', $plugin_admin, 'add_settings_page' );
		$this->loader->add_action( 'admin_init', $plugin_admin, 'register_settings' );
		$this->loader->add_action( 'admin_enqueue_scripts', $plugin_admin, 'enqueue_styles' );
		$this->loader->add_action( 'admin_enqueue_scripts', $plugin_admin, 'enqueue_scripts' );

	}

	/**
	 * Register all of the hooks related to the public-facing functionality
	 * of the plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 */
	private function define_public_hooks() {

		$plugin_public = new Trizync_Pop_Cart_Public( $this->get_plugin_name(), $this->get_version() );

		$this->loader->add_action( 'init', $plugin_public, 'register_shortcodes' );
		$this->loader->add_action( 'wp_ajax_trizync_pop_cart_get_cart', $plugin_public, 'ajax_get_cart' );
		$this->loader->add_action( 'wp_ajax_nopriv_trizync_pop_cart_get_cart', $plugin_public, 'ajax_get_cart' );
		$this->loader->add_action( 'wp_ajax_trizync_pop_cart_get_product_preview', $plugin_public, 'ajax_get_product_preview' );
		$this->loader->add_action( 'wp_ajax_nopriv_trizync_pop_cart_get_product_preview', $plugin_public, 'ajax_get_product_preview' );
		$this->loader->add_action( 'wp_ajax_trizync_pop_cart_update_cart_item', $plugin_public, 'ajax_update_cart_item' );
		$this->loader->add_action( 'wp_ajax_nopriv_trizync_pop_cart_update_cart_item', $plugin_public, 'ajax_update_cart_item' );
		$this->loader->add_action( 'wp_ajax_trizync_pop_cart_remove_cart_item', $plugin_public, 'ajax_remove_cart_item' );
		$this->loader->add_action( 'wp_ajax_nopriv_trizync_pop_cart_remove_cart_item', $plugin_public, 'ajax_remove_cart_item' );
		$this->loader->add_action( 'wp_ajax_trizync_pop_cart_set_shipping_method', $plugin_public, 'ajax_set_shipping_method' );
		$this->loader->add_action( 'wp_ajax_nopriv_trizync_pop_cart_set_shipping_method', $plugin_public, 'ajax_set_shipping_method' );
		$this->loader->add_action( 'wp_ajax_trizync_pop_cart_set_payment_method', $plugin_public, 'ajax_set_payment_method' );
		$this->loader->add_action( 'wp_ajax_nopriv_trizync_pop_cart_set_payment_method', $plugin_public, 'ajax_set_payment_method' );
		$this->loader->add_action( 'wp_footer', $plugin_public, 'render_popup_shell' );
		$this->loader->add_action( 'woocommerce_after_add_to_cart_button', $plugin_public, 'render_product_checkout_button' );
		$this->loader->add_action( 'woocommerce_checkout_update_order_meta', $plugin_public, 'save_custom_order_meta', 10, 2 );
		$this->loader->add_action( 'woocommerce_admin_order_data_after_billing_address', $plugin_public, 'render_admin_order_meta' );
		$this->loader->add_action( 'woocommerce_order_data_after_billing_address', $plugin_public, 'render_admin_order_meta' );
		$this->loader->add_action( 'woocommerce_checkout_order_processed', $plugin_public, 'handle_checkout_success', 10, 3 );
		$this->loader->add_action( 'wp_ajax_trizync_pop_cart_prepare_product_checkout', $plugin_public, 'ajax_prepare_product_checkout' );
		$this->loader->add_action( 'wp_ajax_nopriv_trizync_pop_cart_prepare_product_checkout', $plugin_public, 'ajax_prepare_product_checkout' );
		$this->loader->add_action( 'wp_ajax_trizync_pop_cart_restore_cart', $plugin_public, 'ajax_restore_cart' );
		$this->loader->add_action( 'wp_ajax_nopriv_trizync_pop_cart_restore_cart', $plugin_public, 'ajax_restore_cart' );
		$this->loader->add_action( 'wp_ajax_trizync_pop_cart_get_notices', $plugin_public, 'ajax_get_notices' );
		$this->loader->add_action( 'wp_ajax_nopriv_trizync_pop_cart_get_notices', $plugin_public, 'ajax_get_notices' );
		$this->loader->add_action( 'wp_ajax_trizync_pop_cart_get_checkout_form', $plugin_public, 'ajax_get_checkout_form' );
		$this->loader->add_action( 'wp_ajax_nopriv_trizync_pop_cart_get_checkout_form', $plugin_public, 'ajax_get_checkout_form' );
		$this->loader->add_action( 'wp_ajax_trizync_pop_cart_get_notices', $plugin_public, 'ajax_get_notices' );
		$this->loader->add_action( 'wp_ajax_nopriv_trizync_pop_cart_get_notices', $plugin_public, 'ajax_get_notices' );
		$this->loader->add_action( 'wp_ajax_trizync_pop_cart_get_checkout_form', $plugin_public, 'ajax_get_checkout_form' );
		$this->loader->add_action( 'wp_ajax_nopriv_trizync_pop_cart_get_checkout_form', $plugin_public, 'ajax_get_checkout_form' );
		$this->loader->add_filter( 'woocommerce_loop_add_to_cart_link', $plugin_public, 'decorate_loop_add_to_cart_link', 10, 2 );
		$this->loader->add_action( 'wp_enqueue_scripts', $plugin_public, 'enqueue_styles' );
		$this->loader->add_action( 'wp_enqueue_scripts', $plugin_public, 'enqueue_scripts' );

	}

	/**
	 * Run the loader to execute all of the hooks with WordPress.
	 *
	 * @since    1.0.0
	 */
	public function run() {
		$this->loader->run();
	}

	/**
	 * The name of the plugin used to uniquely identify it within the context of
	 * WordPress and to define internationalization functionality.
	 *
	 * @since     1.0.0
	 * @return    string    The name of the plugin.
	 */
	public function get_plugin_name() {
		return $this->plugin_name;
	}

	/**
	 * The reference to the class that orchestrates the hooks with the plugin.
	 *
	 * @since     1.0.0
	 * @return    Trizync_Pop_Cart_Loader    Orchestrates the hooks of the plugin.
	 */
	public function get_loader() {
		return $this->loader;
	}

	/**
	 * Retrieve the version number of the plugin.
	 *
	 * @since     1.0.0
	 * @return    string    The version number of the plugin.
	 */
	public function get_version() {
		return $this->version;
	}

}
