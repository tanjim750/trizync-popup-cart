(function( $ ) {
	'use strict';

	var fieldsState = [];
	var selectedKey = '';

	function parseFields( raw ) {
		try {
			var parsed = JSON.parse( raw );
			return Array.isArray( parsed ) ? parsed : [];
		} catch ( e ) {
			return [];
		}
	}

	function slugify( value ) {
		return value
			.toString()
			.toLowerCase()
			.replace( /[^a-z0-9]+/g, '_' )
			.replace( /^_+|_+$/g, '' );
	}

	function ensureUniqueKey( base ) {
		var key = base;
		var index = 1;
		while ( fieldsState.some( function( field ) { return field.key === key; } ) ) {
			key = base + '_' + index;
			index += 1;
		}
		return key;
	}

	function syncFields( $manager ) {
		var $hidden = $manager.find( '[data-fields-value]' );
		var payload = fieldsState.map( function( field ) {
			return {
				key: field.key,
				label: field.label,
				placeholder: field.placeholder,
				default: field.default,
				type: field.type,
				options: field.options,
				rule: field.rule,
				enabled: field.enabled,
				order: field.order
			};
		} );
		$hidden.val( JSON.stringify( payload ) );
	}

	function renderSetupCard( field, isDefault ) {
		var typeOptions = [
			{ value: 'text', label: 'Text' },
			{ value: 'select', label: 'Select' }
		];
		var typeSelect = typeOptions
			.map( function( option ) {
				return '<option value="' + option.value + '"' + ( option.value === field.type ? ' selected' : '' ) + '>' + option.label + '</option>';
			} )
			.join( '' );
		var optionsValue = ( field.options || [] ).join( '\n' );

		return (
			'<div class="trizync-pop-cart-fields__editor-card" data-field-row data-key="' + field.key + '">' +
				'<div class="trizync-pop-cart-fields__card-head">' +
					'<div>' +
						'<label class="trizync-pop-cart-fields__label">Label</label>' +
						'<input type="text" class="trizync-pop-cart-fields__input" data-field="label" value="' + field.label + '">' +
					'</div>' +
					'<div>' +
						'<label class="trizync-pop-cart-fields__label">Type</label>' +
						'<select class="trizync-pop-cart-fields__select" data-field="type">' + typeSelect + '</select>' +
					'</div>' +
				'</div>' +
				'<div class="trizync-pop-cart-fields__grid">' +
					'<div>' +
						'<label class="trizync-pop-cart-fields__label">Placeholder</label>' +
						'<input type="text" class="trizync-pop-cart-fields__input" data-field="placeholder" value="' + field.placeholder + '">' +
					'</div>' +
					'<div>' +
						'<label class="trizync-pop-cart-fields__label">Default</label>' +
						'<input type="text" class="trizync-pop-cart-fields__input" data-field="default" value="' + field.default + '">' +
					'</div>' +
					'<div class="trizync-pop-cart-fields__options"' + ( field.type === 'select' ? '' : ' style="display:none"' ) + '>' +
						'<label class="trizync-pop-cart-fields__label">Options</label>' +
						'<textarea class="trizync-pop-cart-fields__textarea" data-field="options" rows="4" placeholder="Example:\nSmall\nMedium\nLarge">' + optionsValue + '</textarea>' +
					'</div>' +
				'</div>' +
			'</div>'
		);
	}

	function renderPreviewItem( field, isSelected ) {
		var disabledClass = field.enabled ? '' : ' is-disabled';
		var selectedClass = isSelected ? ' is-selected' : '';
		return (
			'<div class="trizync-pop-cart-fields__preview-item' + disabledClass + selectedClass + '" data-preview-row data-key="' + field.key + '">' +
				'<div>' +
					'<div class="trizync-pop-cart-fields__preview-label">' + ( field.label || 'Untitled field' ) + '</div>' +
					'<div class="trizync-pop-cart-fields__preview-key">' + field.key + '</div>' +
				'</div>' +
				'<div class="trizync-pop-cart-fields__preview-actions">' +
					'<button type="button" class="button" data-move="up">↑</button>' +
					'<button type="button" class="button" data-move="down">↓</button>' +
				'</div>' +
			'</div>'
		);
	}

	function renderAll( $manager, defaults ) {
		var $editor = $manager.find( '[data-fields-editor]' );
		var $preview = $manager.find( '[data-fields-preview]' );
		var $toggle = $manager.find( '[data-selected-enabled]' );
		var $remove = $manager.find( '[data-remove-selected]' );
		$editor.empty();
		$preview.empty();

		fieldsState.sort( function( a, b ) {
			return a.order - b.order;
		} );

		if ( ! selectedKey && fieldsState.length ) {
			selectedKey = fieldsState[0].key;
		}

		var selectedField = null;

		fieldsState.forEach( function( field ) {
			var isDefault = defaults.indexOf( field.key ) !== -1;
			var isSelected = field.key === selectedKey;
			if ( isSelected ) {
				selectedField = field;
				$editor.append( renderSetupCard( field, isDefault ) );
			}
			$preview.append( renderPreviewItem( field, isSelected ) );
		} );

		if ( $toggle.length ) {
			if ( selectedField ) {
				$toggle.prop( 'checked', !! selectedField.enabled );
				$toggle.prop( 'disabled', false );
			} else {
				$toggle.prop( 'checked', false );
				$toggle.prop( 'disabled', true );
			}
		}

		if ( $remove.length ) {
			if ( selectedField && defaults.indexOf( selectedField.key ) === -1 ) {
				$remove.prop( 'disabled', false );
			} else {
				$remove.prop( 'disabled', true );
			}
		}

		syncFields( $manager );
	}

	$( function() {
		var $manager = $( '[data-fields-manager]' );
		if ( ! $manager.length ) {
			return;
		}

		var defaults = parseFields( $manager.attr( 'data-default-keys' ) );
		var initial = parseFields( $manager.find( '[data-fields-value]' ).val() );
		fieldsState = initial.map( function( field, index ) {
			return $.extend( {
				label: '',
				key: '',
				placeholder: '',
				default: '',
				type: 'text',
				options: [],
				rule: 'required',
				enabled: 0,
				order: index + 1,
				autoKey: false
			}, field );
		} );

		if ( fieldsState.length ) {
			selectedKey = fieldsState[0].key;
		}
		renderAll( $manager, defaults );

		$manager.on( 'click', '[data-add-field]', function() {
			var base = 'popcart_field';
			var key = ensureUniqueKey( base );
			var newField = {
				label: '',
				key: key,
				placeholder: '',
				default: '',
				type: 'text',
				options: [],
				rule: 'required',
				enabled: 1,
				order: fieldsState.length + 1,
				autoKey: true
			};
			fieldsState.push( newField );
			selectedKey = newField.key;
			renderAll( $manager, defaults );
		} );

		$manager.on( 'click', '[data-remove-selected]', function() {
			if ( ! selectedKey ) {
				return;
			}
			var key = selectedKey;
			fieldsState = fieldsState.filter( function( field ) {
				return field.key !== key;
			} );
			if ( selectedKey === key ) {
				selectedKey = fieldsState.length ? fieldsState[0].key : '';
			}
			renderAll( $manager, defaults );
		} );

		$manager.on( 'click', '[data-move]', function( event ) {
			event.stopPropagation();
			var direction = $( this ).data( 'move' );
			var key = $( this ).closest( '[data-preview-row]' ).data( 'key' );
			var index = fieldsState.findIndex( function( field ) { return field.key === key; } );
			if ( index === -1 ) {
				return;
			}
			if ( direction === 'up' && index > 0 ) {
				var tempUp = fieldsState[ index - 1 ];
				fieldsState[ index - 1 ] = fieldsState[ index ];
				fieldsState[ index ] = tempUp;
			}
			if ( direction === 'down' && index < fieldsState.length - 1 ) {
				var tempDown = fieldsState[ index + 1 ];
				fieldsState[ index + 1 ] = fieldsState[ index ];
				fieldsState[ index ] = tempDown;
			}
			fieldsState.forEach( function( field, idx ) {
				field.order = idx + 1;
			} );
			renderAll( $manager, defaults );
		} );

		$manager.on( 'click', '[data-preview-row]', function() {
			var key = $( this ).data( 'key' );
			if ( key ) {
				selectedKey = key;
				renderAll( $manager, defaults );
			}
		} );

		$manager.on( 'change', '[data-selected-enabled]', function() {
			if ( ! selectedKey ) {
				return;
			}
			var field = fieldsState.find( function( item ) { return item.key === selectedKey; } );
			if ( ! field ) {
				return;
			}
			field.enabled = $( this ).is( ':checked' ) ? 1 : 0;
			renderAll( $manager, defaults );
		} );

		$manager.on( 'change input', '[data-field]', function() {
			var $row = $( this ).closest( '[data-field-row]' );
			var key = $row.data( 'key' );
			var field = fieldsState.find( function( item ) { return item.key === key; } );
			if ( ! field ) {
				return;
			}

			field.label = $row.find( '[data-field="label"]' ).val() || '';
			field.placeholder = $row.find( '[data-field="placeholder"]' ).val() || '';
			field.default = $row.find( '[data-field="default"]' ).val() || '';
			field.type = $row.find( '[data-field="type"]' ).val() || 'text';
			if ( field.autoKey && field.label ) {
				var slug = slugify( field.label );
				if ( slug ) {
					var nextKey = ensureUniqueKey( 'popcart_' + slug );
					field.key = nextKey;
					field.autoKey = false;
					selectedKey = field.key;
				}
			}

			var optionsText = $row.find( '[data-field="options"]' ).val() || '';
			field.options = optionsText
				.split( '\n' )
				.map( function( line ) { return line.trim(); } )
				.filter( function( line ) { return line.length; } );

			renderAll( $manager, defaults );
		} );
	} );

	$( function() {
		var $branding = $( '[data-branding-preview]' );
		if ( ! $branding.length ) {
			return;
		}
		var $hidden = $( '[data-branding-value]' );
		var $inputs = $( '[data-branding]' );
		var $previewEyebrow = $( '[data-preview-eyebrow]' );
		var $previewTitle = $( '[data-preview-title]' );
		var $previewCta = $branding.find( '.trizync-pop-cart-branding__preview-cta' );
		var $eyebrowInput = $( 'input[name="trizync_pop_cart_header_eyebrow"]' );
		var $titleInput = $( 'input[name="trizync_pop_cart_header_title"]' );
		var $ctaInput = $( 'input[name="trizync_pop_cart_cta_label"]' );

		function getBrandingState() {
			var state = {};
			$inputs.each( function() {
				var key = $( this ).data( 'branding' );
				state[ key ] = $( this ).val();
			} );
			return state;
		}

		function applyBranding( state ) {
			if ( ! $branding.length ) {
				return;
			}
			$branding.css( {
				'--trizync-primary': state.primary || '#411264',
				'--trizync-secondary': state.secondary || '#f0a60a',
				'--trizync-tertiary': state.tertiary || '#ffffff'
			} );
			if ( $hidden.length ) {
				$hidden.val( JSON.stringify( state ) );
			}
		}

		applyBranding( getBrandingState() );

		$inputs.on( 'input change', function() {
			applyBranding( getBrandingState() );
		} );

		function updatePreviewText() {
			if ( $previewEyebrow.length && $eyebrowInput.length ) {
				$previewEyebrow.text( $eyebrowInput.val() || $previewEyebrow.text() );
			}
			if ( $previewTitle.length && $titleInput.length ) {
				$previewTitle.text( $titleInput.val() || $previewTitle.text() );
			}
			if ( $previewCta.length && $ctaInput.length ) {
				$previewCta.text( $ctaInput.val() || $previewCta.text() );
			}
		}

		updatePreviewText();

		$eyebrowInput.on( 'input', updatePreviewText );
		$titleInput.on( 'input', updatePreviewText );
		$ctaInput.on( 'input', updatePreviewText );
	} );

	$( function() {
		var $manager = $( '[data-script-manager]' );
		if ( ! $manager.length ) {
			return;
		}

		function parseJson( value, fallback ) {
			try {
				var parsed = JSON.parse( value );
				if ( parsed && typeof parsed === 'object' ) {
					return parsed;
				}
			} catch ( e ) {
				return fallback;
			}
			return fallback;
		}

		var hooks = parseJson( $manager.attr( 'data-hooks' ) || '[]', [] );
		var $hidden = $manager.find( '[data-scripts-value]' );
		var $select = $manager.find( '[data-scripts-hook]' );
		var $code = $manager.find( '[data-scripts-code]' );
		var $error = $manager.find( '[data-scripts-error]' );
		var scripts = parseJson( $hidden.val() || '{}', {} );
		var storedHook = '';
		if ( window.localStorage ) {
			storedHook = localStorage.getItem( 'trizync_pop_cart_script_hook' ) || '';
		}
		var currentHook = hooks.length ? hooks[0] : '';
		if ( storedHook && hooks.indexOf( storedHook ) !== -1 ) {
			currentHook = storedHook;
		}

		function syncScripts() {
			$hidden.val( JSON.stringify( scripts ) );
		}

		function setError( message ) {
			if ( ! $error.length ) {
				return;
			}
			if ( message ) {
				$error.text( message );
				$error.prop( 'hidden', false );
			} else {
				$error.text( '' );
				$error.prop( 'hidden', true );
			}
		}

		function setCurrentHook( hook ) {
			currentHook = hook;
			$select.val( hook );
			$code.val( scripts[ hook ] || '' );
			if ( window.localStorage ) {
				localStorage.setItem( 'trizync_pop_cart_script_hook', hook );
			}
		}

		$select.empty();
		hooks.forEach( function( hook ) {
			$select.append( '<option value="' + hook + '">' + hook + '</option>' );
			if ( typeof scripts[ hook ] !== 'string' ) {
				scripts[ hook ] = '';
			}
		} );

		setCurrentHook( currentHook );
		syncScripts();

		$select.on( 'change', function() {
			setCurrentHook( $( this ).val() );
			setError( '' );
		} );

		$code.on( 'input', function() {
			if ( ! currentHook ) {
				return;
			}
			scripts[ currentHook ] = $( this ).val();
			syncScripts();
			setError( '' );
		} );

		$manager.closest( 'form' ).on( 'submit', function( event ) {
			scripts[ currentHook ] = $code.val();
			syncScripts();
			setError( '' );
			var errorFound = null;
			hooks.some( function( hook ) {
				var code = scripts[ hook ];
				if ( code && code.trim().length ) {
					try {
						new Function( 'data', 'context', code );
					} catch ( e ) {
						errorFound = { hook: hook, error: e };
						return true;
					}
				}
				return false;
			} );

			if ( errorFound ) {
				event.preventDefault();
				setCurrentHook( errorFound.hook );
				setError( 'Syntax error in ' + errorFound.hook + ': ' + errorFound.error.message );
			}
		} );
	} );

})( jQuery );
