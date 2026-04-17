<?php

/**
 * The admin-specific functionality of the plugin.
 *
 * @link       https://triizync.com
 * @since      1.0.0
 *
 * @package    Trizync_Pop_Cart
 * @subpackage Trizync_Pop_Cart/admin
 */

/**
 * The admin-specific functionality of the plugin.
 *
 * Defines the plugin name, version, and two examples hooks for how to
 * enqueue the admin-specific stylesheet and JavaScript.
 *
 * @package    Trizync_Pop_Cart
 * @subpackage Trizync_Pop_Cart/admin
 * @author     Trizync Solution <trizyncsolution@gmail.com>
 */
class Trizync_Pop_Cart_Admin {

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
	 * @param      string    $plugin_name       The name of this plugin.
	 * @param      string    $version    The version of this plugin.
	 */
	public function __construct( $plugin_name, $version ) {

		$this->plugin_name = $plugin_name;
		$this->version = $version;

	}

	/**
	 * Suppress global admin notices on the Pop Cart settings page.
	 *
	 * @since    1.0.0
	 */
	public function suppress_admin_notices() {
		if ( empty( $_GET['page'] ) || 'trizync-pop-cart' !== $_GET['page'] ) {
			return;
		}

		remove_all_actions( 'admin_notices' );
		remove_all_actions( 'all_admin_notices' );
	}

	/**
	 * Register the stylesheets for the admin area.
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

		wp_enqueue_style( $this->plugin_name, plugin_dir_url( __FILE__ ) . 'css/trizync-pop-cart-admin.css', array(), $this->version, 'all' );

	}

	/**
	 * Register the JavaScript for the admin area.
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

		wp_enqueue_script( $this->plugin_name, plugin_dir_url( __FILE__ ) . 'js/trizync-pop-cart-admin.js', array( 'jquery' ), $this->version, false );

	}

	/**
	 * Register plugin settings.
	 *
	 * @since    1.0.0
	 */
	public function register_settings() {
		register_setting(
			'trizync_pop_cart_settings',
			TRIZYNC_POP_CART_OPTION_ENABLED,
			array(
				'type'              => 'boolean',
				'sanitize_callback' => 'absint',
				'default'           => 1,
			)
		);

		register_setting(
			'trizync_pop_cart_settings',
			TRIZYNC_POP_CART_OPTION_FIELDS,
			array(
				'type'              => 'string',
				'sanitize_callback' => array( $this, 'sanitize_fields' ),
				'default'           => wp_json_encode( $this->get_default_fields() ),
			)
		);

		register_setting(
			'trizync_pop_cart_settings',
			TRIZYNC_POP_CART_OPTION_BRANDING,
			array(
				'type'              => 'string',
				'sanitize_callback' => array( $this, 'sanitize_branding' ),
				'default'           => wp_json_encode( $this->get_default_branding() ),
			)
		);

		register_setting(
			'trizync_pop_cart_settings',
			TRIZYNC_POP_CART_OPTION_CTA_LABEL,
			array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'default'           => __( 'Proceed to checkout', 'trizync-pop-cart' ),
			)
		);

		register_setting(
			'trizync_pop_cart_settings',
			TRIZYNC_POP_CART_OPTION_HEADER_EYEBROW,
			array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'default'           => __( 'Instant checkout', 'trizync-pop-cart' ),
			)
		);

		register_setting(
			'trizync_pop_cart_settings',
			TRIZYNC_POP_CART_OPTION_HEADER_TITLE,
			array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'default'           => __( 'Secure checkout', 'trizync-pop-cart' ),
			)
		);

		register_setting(
			'trizync_pop_cart_settings',
			TRIZYNC_POP_CART_OPTION_PRODUCT_BUTTON,
			array(
				'type'              => 'boolean',
				'sanitize_callback' => 'absint',
				'default'           => 0,
			)
		);

		register_setting(
			'trizync_pop_cart_settings',
			TRIZYNC_POP_CART_OPTION_REPLACE_ATC,
			array(
				'type'              => 'boolean',
				'sanitize_callback' => 'absint',
				'default'           => 0,
			)
		);

		register_setting(
			'trizync_pop_cart_settings',
			TRIZYNC_POP_CART_OPTION_REPLACE_ATC_LABEL,
			array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'default'           => __( 'Checkout', 'trizync-pop-cart' ),
			)
		);
		register_setting(
			'trizync_pop_cart_settings',
			TRIZYNC_POP_CART_OPTION_BUTTON_SELECTORS,
			array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_textarea_field',
				'default'           => '',
			)
		);

		register_setting(
			'trizync_pop_cart_settings',
			TRIZYNC_POP_CART_OPTION_PRODUCT_BUTTON_LABEL,
			array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'default'           => __( 'Checkout', 'trizync-pop-cart' ),
			)
		);

		register_setting(
			'trizync_pop_cart_settings',
			TRIZYNC_POP_CART_OPTION_FLOW_MODE,
			array(
				'type'              => 'string',
				'sanitize_callback' => array( $this, 'sanitize_flow_mode' ),
				'default'           => 'classic',
			)
		);

		register_setting(
			'trizync_pop_cart_settings',
			TRIZYNC_POP_CART_OPTION_SCRIPTS,
			array(
				'type'              => 'string',
				'sanitize_callback' => array( $this, 'sanitize_scripts' ),
				'default'           => wp_json_encode( $this->get_default_scripts() ),
			)
		);

		register_setting(
			'trizync_pop_cart_settings',
			TRIZYNC_POP_CART_OPTION_SCRIPTS_ENABLED,
			array(
				'type'              => 'boolean',
				'sanitize_callback' => 'absint',
				'default'           => 1,
			)
		);

		add_settings_section(
			'trizync_pop_cart_main',
			__( 'General', 'trizync-pop-cart' ),
			'__return_false',
			'trizync-pop-cart'
		);

		add_settings_field(
			'trizync_pop_cart_enabled',
			__( 'Enable Pop Cart', 'trizync-pop-cart' ),
			array( $this, 'render_enabled_field' ),
			'trizync-pop-cart',
			'trizync_pop_cart_main'
		);

		if ( defined( 'TRIZYNC_POP_CART_SHOW_FLOW_MODE' ) && TRIZYNC_POP_CART_SHOW_FLOW_MODE ) {
			add_settings_field(
				'trizync_pop_cart_flow_mode',
				__( 'Checkout Flow', 'trizync-pop-cart' ),
				array( $this, 'render_flow_mode_field' ),
				'trizync-pop-cart',
				'trizync_pop_cart_main'
			);
		}

		add_settings_section(
			'trizync_pop_cart_fields',
			__( 'Checkout Fields', 'trizync-pop-cart' ),
			'__return_false',
			'trizync-pop-cart'
		);

		add_settings_field(
			'trizync_pop_cart_fields_manager',
			'',
			array( $this, 'render_fields_manager' ),
			'trizync-pop-cart',
			'trizync_pop_cart_fields'
		);

		add_settings_section(
			'trizync_pop_cart_branding',
			__( 'Branding & UI', 'trizync-pop-cart' ),
			'__return_false',
			'trizync-pop-cart'
		);

		add_settings_field(
			'trizync_pop_cart_branding_manager',
			__( 'Branding', 'trizync-pop-cart' ),
			array( $this, 'render_branding_manager' ),
			'trizync-pop-cart',
			'trizync_pop_cart_branding'
		);

		add_settings_section(
			'trizync_pop_cart_scripts',
			__( 'Custom Scripts', 'trizync-pop-cart' ),
			'__return_false',
			'trizync-pop-cart'
		);

		add_settings_section(
			'trizync_pop_cart_selectors',
			__( 'Button Selectors', 'trizync-pop-cart' ),
			'__return_false',
			'trizync-pop-cart'
		);

		add_settings_field(
			'trizync_pop_cart_scripts_manager',
			'',
			array( $this, 'render_scripts_manager' ),
			'trizync-pop-cart',
			'trizync_pop_cart_scripts'
		);

		add_settings_field(
			'trizync_pop_cart_selectors_manager',
			'',
			array( $this, 'render_selectors_manager' ),
			'trizync-pop-cart',
			'trizync_pop_cart_selectors'
		);
	}

	/**
	 * Add the settings page under Settings menu.
	 *
	 * @since    1.0.0
	 */
	public function add_settings_page() {
		add_options_page(
			__( 'Pop Cart Settings', 'trizync-pop-cart' ),
			__( 'Pop Cart', 'trizync-pop-cart' ),
			'manage_options',
			'trizync-pop-cart',
			array( $this, 'render_settings_page' )
		);
	}

	/**
	 * Render the enable/disable toggle.
	 *
	 * @since    1.0.0
	 */
	public function render_enabled_field() {
		$value = (int) get_option( TRIZYNC_POP_CART_OPTION_ENABLED, 1 );
		?>
		<label>
			<input type="checkbox" name="<?php echo esc_attr( TRIZYNC_POP_CART_OPTION_ENABLED ); ?>" value="1" <?php checked( 1, $value ); ?> />
			<?php esc_html_e( 'Enable popup checkout', 'trizync-pop-cart' ); ?>
		</label>
		<?php
	}

	/**
	 * Render the flow mode selector.
	 *
	 * @since    1.0.0
	 */
	public function render_flow_mode_field() {
		$value = get_option( TRIZYNC_POP_CART_OPTION_FLOW_MODE, 'classic' );
		?>
		<label class="trizync-pop-cart-fields__label" for="trizync-pop-cart-flow-mode">
			<?php esc_html_e( 'Select checkout flow', 'trizync-pop-cart' ); ?>
		</label>
		<select id="trizync-pop-cart-flow-mode" class="trizync-pop-cart-fields__select" name="<?php echo esc_attr( TRIZYNC_POP_CART_OPTION_FLOW_MODE ); ?>">
			<option value="classic" <?php selected( 'classic', $value ); ?>><?php esc_html_e( 'Classic (Cart-based)', 'trizync-pop-cart' ); ?></option>
			<option value="light" <?php selected( 'light', $value ); ?>><?php esc_html_e( 'Light (Product preview)', 'trizync-pop-cart' ); ?></option>
		</select>
		<?php
	}

	/**
	 * Sanitize flow mode.
	 *
	 * @since    1.0.0
	 * @param string $value
	 * @return string
	 */
	public function sanitize_flow_mode( $value ) {
		$value = is_string( $value ) ? strtolower( trim( $value ) ) : 'classic';
		return in_array( $value, array( 'classic', 'light' ), true ) ? $value : 'classic';
	}

	/**
	 * Render the settings page.
	 *
	 * @since    1.0.0
	 */
	public function render_settings_page() {
		?>
		<div class="wrap trizync-pop-cart-admin">
			<?php
			ob_start();
			settings_errors();
			ob_end_clean();
			?>
			<form method="post" action="options.php" class="trizync-pop-cart-admin__form">
				<?php
				settings_fields( 'trizync_pop_cart_settings' );
				?>
				<div class="trizync-pop-cart-admin__hero">
				<div class="trizync-pop-cart-admin__hero-content">
					<div class="trizync-pop-cart-admin__brand">
						<img class="trizync-pop-cart-admin__logo" src="<?php echo esc_url( plugin_dir_url( __FILE__ ) . '../public/images/trizync-logo.png' ); ?>" alt="<?php esc_attr_e( 'Trizync', 'trizync-pop-cart' ); ?>">
						<div class="trizync-pop-cart-admin__brand-text">
							<p class="trizync-pop-cart-admin__eyebrow"><?php esc_html_e( 'Popup Checkout', 'trizync-pop-cart' ); ?></p>
							<h1 class="trizync-pop-cart-admin__title"><?php esc_html_e( 'Pop Cart Settings', 'trizync-pop-cart' ); ?></h1>
						</div>
					</div>
					<p class="trizync-pop-cart-admin__subtitle"><?php esc_html_e( 'Design your checkout flow, customize fields, and keep it lightning fast.', 'trizync-pop-cart' ); ?></p>
				</div>
				<div class="trizync-pop-cart-admin__status">
					<select id="trizync-pop-cart-status" class="trizync-pop-cart-admin__status-select" name="<?php echo esc_attr( TRIZYNC_POP_CART_OPTION_ENABLED ); ?>">
						<option value="1" <?php selected( 1, (int) get_option( TRIZYNC_POP_CART_OPTION_ENABLED, 1 ) ); ?>><?php esc_html_e( 'Active', 'trizync-pop-cart' ); ?></option>
						<option value="0" <?php selected( 0, (int) get_option( TRIZYNC_POP_CART_OPTION_ENABLED, 1 ) ); ?>><?php esc_html_e( 'Disabled', 'trizync-pop-cart' ); ?></option>
					</select>
					<?php submit_button( __( 'Save Settings', 'trizync-pop-cart' ), 'primary trizync-pop-cart-admin__pill', 'submit', false, array( 'class' => 'trizync-pop-cart-admin__save' ) ); ?>
				</div>
			</div>
			<div class="trizync-pop-cart-admin__marketing">
				<p class="trizync-pop-cart-admin__marketing-text">
					<?php esc_html_e( 'বাংলাদেশি মার্কেটের জন্য দ্রুত কনভার্সন‑ফোকাসড WooCommerce সেটআপ, কাস্টমাইজেশন বা অপ্টিমাইজেশন দরকার?', 'trizync-pop-cart' ); ?>
					<?php esc_html_e( 'ZyncOps আপনার স্টোর দ্রুত লঞ্চ, অপ্টিমাইজ ও স্কেল করতে সাহায্য করবে।', 'trizync-pop-cart' ); ?>
				</p>
				<div class="trizync-pop-cart-admin__marketing-cta">
					<span><?php esc_html_e( 'যোগাযোগ: 01873316706', 'trizync-pop-cart' ); ?></span>
					<a href="<?php echo esc_url( ZYNCOPS_PLUGIN_URL ); ?>" target="_blank" rel="noopener noreferrer">
						<?php esc_html_e( 'ZyncOps ভিজিট করুন', 'trizync-pop-cart' ); ?>
					</a>
				</div>
			</div>
				<div class="trizync-pop-cart-admin__grid">
					<div class="trizync-pop-cart-admin__card">
						<h2 class="trizync-pop-cart-admin__card-title"><?php esc_html_e( 'General', 'trizync-pop-cart' ); ?></h2>
						<?php if ( defined( 'TRIZYNC_POP_CART_SHOW_FLOW_MODE' ) && TRIZYNC_POP_CART_SHOW_FLOW_MODE ) : ?>
							<div class="trizync-pop-cart-branding__cta">
								<label class="trizync-pop-cart-fields__label" for="trizync-pop-cart-flow-mode">
									<?php esc_html_e( 'Checkout flow', 'trizync-pop-cart' ); ?>
								</label>
								<select id="trizync-pop-cart-flow-mode" class="trizync-pop-cart-fields__select" name="<?php echo esc_attr( TRIZYNC_POP_CART_OPTION_FLOW_MODE ); ?>">
									<option value="classic" <?php selected( 'classic', get_option( TRIZYNC_POP_CART_OPTION_FLOW_MODE, 'classic' ) ); ?>><?php esc_html_e( 'Classic (Cart-based)', 'trizync-pop-cart' ); ?></option>
									<option value="light" <?php selected( 'light', get_option( TRIZYNC_POP_CART_OPTION_FLOW_MODE, 'classic' ) ); ?>><?php esc_html_e( 'Light (Product preview)', 'trizync-pop-cart' ); ?></option>
								</select>
							</div>
						<?php endif; ?>
						<div class="trizync-pop-cart-branding__cta">
							<label class="trizync-pop-cart-fields__toggle-inline">
								<span class="trizync-pop-cart-fields__toggle-label"><?php esc_html_e( 'Replace Add to Cart buttons', 'trizync-pop-cart' ); ?></span>
								<span class="trizync-pop-cart-fields__switch">
									<input type="hidden" name="<?php echo esc_attr( TRIZYNC_POP_CART_OPTION_REPLACE_ATC ); ?>" value="0">
									<input type="checkbox" name="<?php echo esc_attr( TRIZYNC_POP_CART_OPTION_REPLACE_ATC ); ?>" value="1" <?php checked( 1, (int) get_option( TRIZYNC_POP_CART_OPTION_REPLACE_ATC, 0 ) ); ?>>
									<span class="trizync-pop-cart-fields__slider"></span>
								</span>
							</label>
						</div>
						<div class="trizync-pop-cart-branding__cta">
							<label class="trizync-pop-cart-fields__label"><?php esc_html_e( 'Add to Cart label', 'trizync-pop-cart' ); ?></label>
							<input type="text" class="trizync-pop-cart-fields__input" name="<?php echo esc_attr( TRIZYNC_POP_CART_OPTION_REPLACE_ATC_LABEL ); ?>" value="<?php echo esc_attr( get_option( TRIZYNC_POP_CART_OPTION_REPLACE_ATC_LABEL, __( 'Checkout', 'trizync-pop-cart' ) ) ); ?>">
						</div>
						<div class="trizync-pop-cart-branding__cta">
							<label class="trizync-pop-cart-fields__toggle-inline">
								<span class="trizync-pop-cart-fields__toggle-label"><?php esc_html_e( 'Show product popup button', 'trizync-pop-cart' ); ?></span>
								<span class="trizync-pop-cart-fields__switch">
									<input type="hidden" name="<?php echo esc_attr( TRIZYNC_POP_CART_OPTION_PRODUCT_BUTTON ); ?>" value="0">
									<input type="checkbox" name="<?php echo esc_attr( TRIZYNC_POP_CART_OPTION_PRODUCT_BUTTON ); ?>" value="1" <?php checked( 1, (int) get_option( TRIZYNC_POP_CART_OPTION_PRODUCT_BUTTON, 0 ) ); ?>>
									<span class="trizync-pop-cart-fields__slider"></span>
								</span>
							</label>
						</div>
						<div class="trizync-pop-cart-branding__cta">
							<label class="trizync-pop-cart-fields__label"><?php esc_html_e( 'Product button label', 'trizync-pop-cart' ); ?></label>
							<input type="text" class="trizync-pop-cart-fields__input" name="<?php echo esc_attr( TRIZYNC_POP_CART_OPTION_PRODUCT_BUTTON_LABEL ); ?>" value="<?php echo esc_attr( get_option( TRIZYNC_POP_CART_OPTION_PRODUCT_BUTTON_LABEL, __( 'Checkout', 'trizync-pop-cart' ) ) ); ?>">
						</div>
						<div class="trizync-pop-cart-branding__cta">
							<label class="trizync-pop-cart-fields__label"><?php esc_html_e( 'Header eyebrow', 'trizync-pop-cart' ); ?></label>
							<input type="text" class="trizync-pop-cart-fields__input" name="<?php echo esc_attr( TRIZYNC_POP_CART_OPTION_HEADER_EYEBROW ); ?>" value="<?php echo esc_attr( get_option( TRIZYNC_POP_CART_OPTION_HEADER_EYEBROW, __( 'Instant checkout', 'trizync-pop-cart' ) ) ); ?>">
						</div>
						<div class="trizync-pop-cart-branding__cta">
							<label class="trizync-pop-cart-fields__label"><?php esc_html_e( 'Header title', 'trizync-pop-cart' ); ?></label>
							<input type="text" class="trizync-pop-cart-fields__input" name="<?php echo esc_attr( TRIZYNC_POP_CART_OPTION_HEADER_TITLE ); ?>" value="<?php echo esc_attr( get_option( TRIZYNC_POP_CART_OPTION_HEADER_TITLE, __( 'Secure checkout', 'trizync-pop-cart' ) ) ); ?>">
						</div>
						<?php
						do_settings_fields( 'trizync-pop-cart', 'trizync_pop_cart_branding' );
						?>
					</div>
					<div class="trizync-pop-cart-admin__card trizync-pop-cart-admin__card--fields">
						<?php
						do_settings_fields( 'trizync-pop-cart', 'trizync_pop_cart_fields' );
						?>
					</div>
					<div class="trizync-pop-cart-admin__card trizync-pop-cart-admin__card--selectors">
						<?php
						do_settings_fields( 'trizync-pop-cart', 'trizync_pop_cart_selectors' );
						?>
					</div>
					<div class="trizync-pop-cart-admin__card trizync-pop-cart-admin__card--scripts">
						<?php
						do_settings_fields( 'trizync-pop-cart', 'trizync_pop_cart_scripts' );
						?>
					</div>
				</div>
			</form>
		</div>
		<?php
	}

	/**
	 * Render field manager UI.
	 *
	 * @since 1.0.0
	 */
	public function render_fields_manager() {
		$raw    = get_option( TRIZYNC_POP_CART_OPTION_FIELDS, wp_json_encode( $this->get_default_fields() ) );
		$fields = json_decode( $raw, true );
		if ( ! is_array( $fields ) ) {
			$fields = $this->get_default_fields();
		}
		?>
		<div class="trizync-pop-cart-fields" data-fields-manager data-default-keys="<?php echo esc_attr( wp_json_encode( wp_list_pluck( $this->get_default_fields(), 'key' ) ) ); ?>">
			<input type="hidden" name="<?php echo esc_attr( TRIZYNC_POP_CART_OPTION_FIELDS ); ?>" value="<?php echo esc_attr( wp_json_encode( $fields ) ); ?>" data-fields-value>
			<div class="trizync-pop-cart-fields__toolbar">
				<div>
					<p class="trizync-pop-cart-fields__title"><?php esc_html_e( 'Checkout Fields', 'trizync-pop-cart' ); ?></p>
					<p class="trizync-pop-cart-fields__subtitle"><?php esc_html_e( 'Control which fields appear in the popup checkout.', 'trizync-pop-cart' ); ?></p>
				</div>
			</div>
			<div class="trizync-pop-cart-fields__layout">
				<div class="trizync-pop-cart-admin__card trizync-pop-cart-fields__pane" data-fields-setup>
					<div class="trizync-pop-cart-fields__pane-head">
						<p class="trizync-pop-cart-fields__pane-title"><?php esc_html_e( 'Field Setup', 'trizync-pop-cart' ); ?></p>
						<label class="trizync-pop-cart-fields__toggle-inline">
							<span class="trizync-pop-cart-fields__toggle-label"><?php esc_html_e( 'Enabled', 'trizync-pop-cart' ); ?></span>
							<span class="trizync-pop-cart-fields__switch">
								<input type="checkbox" data-selected-enabled>
								<span class="trizync-pop-cart-fields__slider"></span>
							</span>
						</label>
					</div>
					<div class="trizync-pop-cart-fields__editor" data-fields-editor></div>
					<div class="trizync-pop-cart-fields__footer">
						<button type="button" class="button trizync-pop-cart-admin__pill" data-remove-selected><?php esc_html_e( 'Remove Field', 'trizync-pop-cart' ); ?></button>
						<button type="button" class="button button-primary trizync-pop-cart-admin__pill" data-add-field><?php esc_html_e( 'Add Field', 'trizync-pop-cart' ); ?></button>
					</div>
				</div>
				<div class="trizync-pop-cart-admin__card trizync-pop-cart-fields__pane trizync-pop-cart-fields__pane--preview" data-fields-preview-card>
					<p class="trizync-pop-cart-fields__pane-title"><?php esc_html_e( 'Field Preview', 'trizync-pop-cart' ); ?></p>
					<div class="trizync-pop-cart-fields__preview" data-fields-preview></div>
				</div>
			</div>
		</div>
		<?php
	}

	/**
	 * Render branding manager UI.
	 *
	 * @since 1.0.0
	 */
	public function render_branding_manager() {
		$branding = $this->get_branding_settings();
		$cta_label = get_option( TRIZYNC_POP_CART_OPTION_CTA_LABEL, __( 'Proceed to checkout', 'trizync-pop-cart' ) );
		?>
		<div class="trizync-pop-cart-branding">
			<input type="hidden" name="<?php echo esc_attr( TRIZYNC_POP_CART_OPTION_BRANDING ); ?>" value="<?php echo esc_attr( wp_json_encode( $branding ) ); ?>" data-branding-value>
			<div class="trizync-pop-cart-branding__grid">
				<div>
					<label class="trizync-pop-cart-fields__label"><?php esc_html_e( 'Primary', 'trizync-pop-cart' ); ?></label>
					<input type="color" class="trizync-pop-cart-branding__color" data-branding="primary" value="<?php echo esc_attr( $branding['primary'] ); ?>">
				</div>
				<div>
					<label class="trizync-pop-cart-fields__label"><?php esc_html_e( 'Secondary', 'trizync-pop-cart' ); ?></label>
					<input type="color" class="trizync-pop-cart-branding__color" data-branding="secondary" value="<?php echo esc_attr( $branding['secondary'] ); ?>">
				</div>
				<div>
					<label class="trizync-pop-cart-fields__label"><?php esc_html_e( 'Tertiary', 'trizync-pop-cart' ); ?></label>
					<input type="color" class="trizync-pop-cart-branding__color" data-branding="tertiary" value="<?php echo esc_attr( $branding['tertiary'] ); ?>">
				</div>
			</div>
			<div class="trizync-pop-cart-branding__cta">
				<label class="trizync-pop-cart-fields__label"><?php esc_html_e( 'CTA Label', 'trizync-pop-cart' ); ?></label>
				<input type="text" class="trizync-pop-cart-fields__input" name="<?php echo esc_attr( TRIZYNC_POP_CART_OPTION_CTA_LABEL ); ?>" value="<?php echo esc_attr( $cta_label ); ?>">
			</div>
			<div class="trizync-pop-cart-branding__preview" data-branding-preview>
				<div class="trizync-pop-cart-branding__preview-card">
					<p class="trizync-pop-cart-branding__preview-label"><?php esc_html_e( 'Preview', 'trizync-pop-cart' ); ?></p>
					<div class="trizync-pop-cart-branding__preview-header">
						<div>
							<p class="trizync-pop-cart-branding__preview-eyebrow" data-preview-eyebrow><?php echo esc_html( get_option( TRIZYNC_POP_CART_OPTION_HEADER_EYEBROW, __( 'Instant checkout', 'trizync-pop-cart' ) ) ); ?></p>
							<p class="trizync-pop-cart-branding__preview-title" data-preview-title><?php echo esc_html( get_option( TRIZYNC_POP_CART_OPTION_HEADER_TITLE, __( 'Secure checkout', 'trizync-pop-cart' ) ) ); ?></p>
						</div>
						<span class="trizync-pop-cart-branding__preview-dot"></span>
					</div>
					<button type="button" class="trizync-pop-cart-branding__preview-cta"><?php echo esc_html( $cta_label ); ?></button>
				</div>
			</div>
		</div>
		<?php
	}

	/**
	 * Render selectors manager UI.
	 *
	 * @since 1.0.0
	 */
	public function render_selectors_manager() {
		?>
		<h2 class="trizync-pop-cart-admin__card-title"><?php esc_html_e( 'Button Selectors', 'trizync-pop-cart' ); ?></h2>
		<p class="trizync-pop-cart-fields__subtitle"><?php esc_html_e( 'Add custom CSS selectors for buttons that should open Pop Cart.', 'trizync-pop-cart' ); ?></p>
		<div class="trizync-pop-cart-branding__cta">
			<label class="trizync-pop-cart-fields__label"><?php esc_html_e( 'Custom button selectors', 'trizync-pop-cart' ); ?></label>
			<textarea class="trizync-pop-cart-fields__textarea" rows="4" name="<?php echo esc_attr( TRIZYNC_POP_CART_OPTION_BUTTON_SELECTORS ); ?>" placeholder="<?php echo esc_attr__( '.buy-now-button, .order-now, .custom-checkout', 'trizync-pop-cart' ); ?>" data-popcart-selector-input><?php echo esc_textarea( get_option( TRIZYNC_POP_CART_OPTION_BUTTON_SELECTORS, '' ) ); ?></textarea>
			<p class="trizync-pop-cart-fields__hint"><?php esc_html_e( 'Comma-separated CSS selectors. These will trigger Pop Cart when clicked.', 'trizync-pop-cart' ); ?></p>
			<p class="trizync-pop-cart-fields__hint"><?php esc_html_e( 'Examples: class selectors (.buy-now-button), id selectors (#buy-now), attribute selectors ([data-buy-now]).', 'trizync-pop-cart' ); ?></p>
			<p class="trizync-pop-cart-fields__error" data-popcart-selector-error hidden></p>
		</div>
		<div class="trizync-pop-cart-scripts__actions">
			<?php submit_button( __( 'Save Settings', 'trizync-pop-cart' ), 'primary trizync-pop-cart-admin__pill', 'submit', false ); ?>
		</div>
		<?php
	}

	/**
	 * Render custom scripts manager UI.
	 *
	 * @since 1.0.0
	 */
	public function render_scripts_manager() {
		$raw = get_option( TRIZYNC_POP_CART_OPTION_SCRIPTS, wp_json_encode( $this->get_default_scripts() ) );
		$scripts = json_decode( $raw, true );
		if ( ! is_array( $scripts ) ) {
			$scripts = $this->get_default_scripts();
		}
		$enabled = (int) get_option( TRIZYNC_POP_CART_OPTION_SCRIPTS_ENABLED, 1 );
		$hooks = $this->get_script_hooks();
		?>
		<div class="trizync-pop-cart-scripts" data-script-manager data-hooks="<?php echo esc_attr( wp_json_encode( $hooks ) ); ?>">
			<input type="hidden" name="<?php echo esc_attr( TRIZYNC_POP_CART_OPTION_SCRIPTS ); ?>" value="<?php echo esc_attr( wp_json_encode( $scripts ) ); ?>" data-scripts-value>
			<div class="trizync-pop-cart-scripts__head">
				<div>
					<h2 class="trizync-pop-cart-admin__card-title"><?php esc_html_e( 'Custom Scripts', 'trizync-pop-cart' ); ?></h2>
					<p class="trizync-pop-cart-admin__card-subtitle"><?php esc_html_e( 'Run custom JavaScript at specific PopCart lifecycle steps.', 'trizync-pop-cart' ); ?></p>
				</div>
				<div class="trizync-pop-cart-scripts__controls">
					<div class="trizync-pop-cart-scripts__hook">
						<label class="trizync-pop-cart-fields__label" for="trizync-pop-cart-script-hook"><?php esc_html_e( 'Hook', 'trizync-pop-cart' ); ?></label>
						<select id="trizync-pop-cart-script-hook" class="trizync-pop-cart-fields__select" data-scripts-hook></select>
					</div>
					<div class="trizync-pop-cart-scripts__toggle">
						<input type="hidden" name="<?php echo esc_attr( TRIZYNC_POP_CART_OPTION_SCRIPTS_ENABLED ); ?>" value="0">
						<label class="trizync-pop-cart-fields__toggle-inline">
							<span class="trizync-pop-cart-fields__toggle-label"><?php esc_html_e( 'Enabled', 'trizync-pop-cart' ); ?></span>
							<span class="trizync-pop-cart-fields__switch">
								<input type="checkbox" name="<?php echo esc_attr( TRIZYNC_POP_CART_OPTION_SCRIPTS_ENABLED ); ?>" value="1" <?php checked( 1, $enabled ); ?>>
								<span class="trizync-pop-cart-fields__slider"></span>
							</span>
						</label>
					</div>
				</div>
			</div>
			<div class="trizync-pop-cart-scripts__body">
				<label class="trizync-pop-cart-fields__label" for="trizync-pop-cart-script-code"><?php esc_html_e( 'Script', 'trizync-pop-cart' ); ?></label>
				<textarea id="trizync-pop-cart-script-code" class="trizync-pop-cart-fields__textarea trizync-pop-cart-scripts__textarea" rows="8" placeholder="<?php echo esc_attr__( 'Use `data` and `context` for payload. Example: if (data.action === \"popcart:checkout:submit\") { console.log(data.cart); }', 'trizync-pop-cart' ); ?>" data-scripts-code></textarea>
				<p class="trizync-pop-cart-scripts__note"><?php esc_html_e( 'Scripts run only inside the popup. Syntax errors will block saving.', 'trizync-pop-cart' ); ?></p>
				<p class="trizync-pop-cart-scripts__error" data-scripts-error hidden></p>
				<div class="trizync-pop-cart-scripts__actions">
					<?php submit_button( __( 'Save Scripts', 'trizync-pop-cart' ), 'primary trizync-pop-cart-admin__pill', 'submit', false ); ?>
				</div>
			</div>
		</div>
		<?php
	}

	/**
	 * Sanitize fields JSON.
	 *
	 * @since 1.0.0
	 * @param string $value
	 * @return string
	 */
	public function sanitize_fields( $value ) {
		$decoded = json_decode( $value, true );
		if ( ! is_array( $decoded ) ) {
			return wp_json_encode( $this->get_default_fields() );
		}

		$defaults = $this->get_default_fields();
		$default_keys = array();
		foreach ( $defaults as $default_field ) {
			$default_keys[ $default_field['key'] ] = $default_field;
		}

		$clean = array();
		foreach ( $decoded as $field ) {
			if ( ! is_array( $field ) ) {
				continue;
			}
			$key = isset( $field['key'] ) ? sanitize_key( $field['key'] ) : '';
			if ( '' === $key ) {
				continue;
			}
			$is_default = isset( $default_keys[ $key ] );
			$clean[] = array(
				'key'         => $key,
				'label'       => isset( $field['label'] ) ? sanitize_text_field( $field['label'] ) : '',
				'placeholder' => isset( $field['placeholder'] ) ? sanitize_text_field( $field['placeholder'] ) : '',
				'default'     => isset( $field['default'] ) ? sanitize_text_field( $field['default'] ) : '',
				'type'        => isset( $field['type'] ) ? sanitize_key( $field['type'] ) : 'text',
				'options'     => isset( $field['options'] ) && is_array( $field['options'] ) ? array_map( 'sanitize_text_field', $field['options'] ) : array(),
				'rule'        => isset( $field['rule'] ) ? sanitize_key( $field['rule'] ) : 'required',
				'enabled'     => $is_default ? ( ! empty( $field['enabled'] ) ? 1 : 0 ) : ( ! empty( $field['enabled'] ) ? 1 : 0 ),
				'order'       => isset( $field['order'] ) ? absint( $field['order'] ) : 0,
			);
		}

		foreach ( $default_keys as $key => $default_field ) {
			$found = false;
			foreach ( $clean as $field ) {
				if ( $field['key'] === $key ) {
					$found = true;
					break;
				}
			}
			if ( ! $found ) {
				$clean[] = $default_field;
			}
		}

		return wp_json_encode( $clean );
	}

	/**
	 * Sanitize branding settings.
	 *
	 * @since 1.0.0
	 * @param string $value
	 * @return string
	 */
	public function sanitize_branding( $value ) {
		$decoded = json_decode( $value, true );
		if ( ! is_array( $decoded ) ) {
			return wp_json_encode( $this->get_default_branding() );
		}

		$clean = array(
			'primary'   => isset( $decoded['primary'] ) ? sanitize_hex_color( $decoded['primary'] ) : '',
			'secondary' => isset( $decoded['secondary'] ) ? sanitize_hex_color( $decoded['secondary'] ) : '',
			'tertiary'  => isset( $decoded['tertiary'] ) ? sanitize_hex_color( $decoded['tertiary'] ) : '',
		);

		foreach ( $clean as $key => $value ) {
			if ( empty( $value ) ) {
				$defaults = $this->get_default_branding();
				$clean[ $key ] = $defaults[ $key ];
			}
		}

		return wp_json_encode( $clean );
	}

	/**
	 * Sanitize custom scripts JSON.
	 *
	 * @since 1.0.0
	 * @param string $value
	 * @return string
	 */
	public function sanitize_scripts( $value ) {
		if ( empty( $value ) ) {
			return wp_json_encode( $this->get_default_scripts() );
		}

		$decoded = json_decode( $value, true );
		if ( ! is_array( $decoded ) ) {
			return wp_json_encode( $this->get_default_scripts() );
		}

		$hooks = $this->get_script_hooks();
		$clean = array();
		foreach ( $hooks as $hook ) {
			if ( isset( $decoded[ $hook ] ) && is_string( $decoded[ $hook ] ) ) {
				$clean[ $hook ] = wp_unslash( $decoded[ $hook ] );
			} else {
				$clean[ $hook ] = '';
			}
		}

		return wp_json_encode( $clean );
	}

	/**
	 * Default field definitions.
	 *
	 * @since 1.0.0
	 * @return array
	 */
	private function get_default_fields() {
		return array(
			array(
				'key'         => 'billing_first_name',
				'label'       => __( 'Full Name', 'trizync-pop-cart' ),
				'placeholder' => __( 'Your full name', 'trizync-pop-cart' ),
				'default'     => '',
				'type'        => 'text',
				'options'     => array(),
				'rule'        => 'required',
				'enabled'     => 1,
				'order'       => 1,
			),
			array(
				'key'         => 'billing_phone',
				'label'       => __( 'Phone', 'trizync-pop-cart' ),
				'placeholder' => __( 'Phone number', 'trizync-pop-cart' ),
				'default'     => '',
				'type'        => 'text',
				'options'     => array(),
				'rule'        => 'required',
				'enabled'     => 1,
				'order'       => 2,
			),
			array(
				'key'         => 'billing_email',
				'label'       => __( 'Email', 'trizync-pop-cart' ),
				'placeholder' => __( 'Email address', 'trizync-pop-cart' ),
				'default'     => '',
				'type'        => 'text',
				'options'     => array(),
				'rule'        => 'required',
				'enabled'     => 1,
				'order'       => 3,
			),
			array(
				'key'         => 'billing_address_1',
				'label'       => __( 'Address', 'trizync-pop-cart' ),
				'placeholder' => __( 'Street address', 'trizync-pop-cart' ),
				'default'     => '',
				'type'        => 'text',
				'options'     => array(),
				'rule'        => 'required',
				'enabled'     => 1,
				'order'       => 4,
			),
			array(
				'key'         => 'billing_city',
				'label'       => __( 'City', 'trizync-pop-cart' ),
				'placeholder' => __( 'City', 'trizync-pop-cart' ),
				'default'     => '',
				'type'        => 'text',
				'options'     => array(),
				'rule'        => 'required',
				'enabled'     => 0,
				'order'       => 5,
			),
			array(
				'key'         => 'billing_postcode',
				'label'       => __( 'Postcode', 'trizync-pop-cart' ),
				'placeholder' => __( 'Postcode', 'trizync-pop-cart' ),
				'default'     => '',
				'type'        => 'text',
				'options'     => array(),
				'rule'        => 'required',
				'enabled'     => 0,
				'order'       => 6,
			),
			array(
				'key'         => 'billing_country',
				'label'       => __( 'Country', 'trizync-pop-cart' ),
				'placeholder' => __( 'Country', 'trizync-pop-cart' ),
				'default'     => '',
				'type'        => 'text',
				'options'     => array(),
				'rule'        => 'required',
				'enabled'     => 0,
				'order'       => 7,
			),
			array(
				'key'         => 'billing_state',
				'label'       => __( 'State', 'trizync-pop-cart' ),
				'placeholder' => __( 'State', 'trizync-pop-cart' ),
				'default'     => '',
				'type'        => 'text',
				'options'     => array(),
				'rule'        => 'required',
				'enabled'     => 0,
				'order'       => 8,
			),
		);
	}

	/**
	 * Default branding values.
	 *
	 * @since 1.0.0
	 * @return array
	 */
	private function get_default_branding() {
		return array(
			'primary'   => '#411264',
			'secondary' => '#f0a60a',
			'tertiary'  => '#ffffff',
		);
	}

	/**
	 * Default scripts mapping.
	 *
	 * @since 1.0.0
	 * @return array
	 */
	private function get_default_scripts() {
		$hooks = $this->get_script_hooks();
		$defaults = array();
		foreach ( $hooks as $hook ) {
			$defaults[ $hook ] = '';
		}
		return $defaults;
	}

	/**
	 * Script hook list.
	 *
	 * @since 1.0.0
	 * @return array
	 */
	private function get_script_hooks() {
		return array(
			'popcart:boot',
			'popcart:open:start',
			'popcart:added_to_cart',
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
	 * Get branding settings merged with defaults.
	 *
	 * @since 1.0.0
	 * @return array
	 */
	private function get_branding_settings() {
		$raw = get_option( TRIZYNC_POP_CART_OPTION_BRANDING, wp_json_encode( $this->get_default_branding() ) );
		$decoded = json_decode( $raw, true );
		if ( ! is_array( $decoded ) ) {
			return $this->get_default_branding();
		}

		return array_merge( $this->get_default_branding(), $decoded );
	}

}
