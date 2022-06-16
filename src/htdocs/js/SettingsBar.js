'use strict';


var AppUtil = require('util/AppUtil');


var _DEFAULTS = {
  'as-mag': 0,
  catalog: 'comcat',
  'fs-days': 30,
  'fs-mag': 1,
  'hs-years': 10,
  timezone: 'utc'
};


/**
 * Refresh a Feature when the user tweaks its settings and set the URL to match
 * the application's state. Also set the default parameter values based on the
 * selected Mainshock.
 *
 * @param options {Object}
 *   {
 *     app: {Object} Application
 *     el: {Element}
 *   }
 *
 * @return _this {Object}
 *   {
 *     addCount: {Function}
 *     addLoader: {Function}
 *     removeCount: {Function}
 *     reset: {Function}
 *     setDefaults: {Function}
 *     setFocusedField: {Function}
 *   }
 */
var SettingsBar = function (options) {
  var _this,
      _initialize,

      _app,
      _el,
      _focusedField,

      _addListeners,
      _addOffset,
      _getDefaults,
      _refreshFeature,
      _setCatalog,
      _setDefaults,
      _setField,
      _setOption,
      _setParam,
      _setTimeZone,
      _toggle,
      _update;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _el = options.el || document.createElement('section');

    _addListeners();
    _addOffset();
  };

  /**
   * Add event listeners.
   */
  _addListeners = function () {
    var buttons = _el.querySelectorAll('.catalog li, .timezone li'),
        fields = _el.querySelectorAll('input'),
        swap = document.getElementById('swap');

    // Set the selected catalog/time zone option
    buttons.forEach(button =>
      button.addEventListener('click', _setOption)
    );

    // Track changes to input fields
    fields.forEach(field => {
      field.addEventListener('focus', _setField);
      field.addEventListener('input', _update);
    });

    // Refresh Features using data from an alternative catalog
    swap.addEventListener('click', _setCatalog);

    // Safari clears form fields w/ autocomplete="off" when navigating "back" to app
    window.addEventListener('pageshow', () => {
      if (document.body.classList.contains('mainshock')) {
        // Set a slight delay so browser doesn't wipe out values
        setTimeout(_this.setDefaults, 25);
      }
    });
  };

  /**
   * Add UTC offset to 'User' timezone button.
   */
  _addOffset = function () {
    var button = document.getElementById('user');

    button.innerText += ` (${_app.utcOffset})`;
  };

  /**
   * Get the default values for fields that depend on the selected Mainshock
   * and merge them with the 'static' default values.
   *
   * Default values for distances are based on rupture length, which we estimate
   * from the Hanks-Bakun (2014) magnitude-area relation, rounded the nearest
   * 10km.
   *
   * ruptureArea (A) = 10 ** (M - 4)
   * ruptureLength = A ** 0.7 (approx)
   *
   * Aftershock, Foreshock distance = ruptureLength (km, min 5)
   * Historical distance = 1.5 * ruptureLength (km, min 20)
   *
   * @return {Object}
   */
  _getDefaults = function () {
    var mag = _app.Features.getFeature('mainshock').json.properties.mag,
        ruptureArea = Math.pow(10, mag - 4),
        ruptureLength = Math.pow(ruptureArea, 0.7);

    return Object.assign({}, _DEFAULTS, {
      'as-dist': Math.max(5, 10 * Math.round(0.1 * ruptureLength)),
      'fs-dist': Math.max(5, 10 * Math.round(0.1 * ruptureLength)),
      'hs-dist': Math.max(20, 15 * Math.round(0.1 * ruptureLength)),
      'hs-mag': Math.round(Math.max(4, mag - 2)),
    });
  };

  /**
   * Refresh a Feature, throttling repeated requests. Triggered when the user
   * tweaks the settings and when the earthquake catalog is swapped.
   *
   * @param id {String}
   * @param throttle {Boolean} optional; default is true
   */
  _refreshFeature = function (id, throttle = true) {
    var feature;

    if (document.body.classList.contains('mainshock')) {
      feature = _app.Features.getFeature(id);

      // Immediately show loading status (don't wait for throttle timers)
      if (feature) {
        _app.StatusBar.addItem({
          id: feature.id,
          name: feature.name
        });
      }

      if (throttle) {
        _app.JsonFeed.initThrottlers(id);
        _app.JsonFeed.throttlers[id].push(
          setTimeout(() => {
            if (feature) {
              _app.Features.refreshFeature(feature);
            } else { // Feature never created (likely due to a bad Fetch request)
              _app.Features.createFeature(id);
            }
          }, 500)
        );
      } else {
        _app.Features.refreshFeature(feature); // refresh immediately
      }

      _app.PlotsPane.rendered = false; // flag to (re-)render plots
    }
  };

  /**
   * Set the earthquake catalog (source data) for Aftershocks, Foreshocks and
   * Historical Seismicity Features.
   */
  _setCatalog = function () {
    var catalog = _el.querySelector('.catalog .selected').id,
        mainshock = _app.Features.getFeature('mainshock');

    _setParam('catalog', catalog);
    _toggle(catalog);

    mainshock.update(catalog);
    _refreshFeature('aftershocks', false);
    _refreshFeature('foreshocks', false);
    _refreshFeature('historical', false);
  };

  /**
   * Set the default values for the 'catalog' and 'timezone' options, which are
   * overridden by existing queryString values when present.
   */
  _setDefaults = function () {
    var catalog = AppUtil.getParam('catalog') || _DEFAULTS['catalog'],
        timezone = AppUtil.getParam('timezone') || _DEFAULTS['timezone'],
        buttons = [
          document.getElementById(catalog),
          document.getElementById(timezone)
        ];

    buttons.forEach(button => {
      button.click(); // select appropriate button in UI
    });

    _setTimeZone(timezone);
  };

  /**
   * Save the id of the last focused field and select the text in the field.
   *
   * @param e {Event}
   */
  _setField = function (e) {
    var input = e.target;

    _focusedField = input.id;

    input.select();
    input.addEventListener('mouseup', e => e.preventDefault());
  };

  /**
   * Wrapper method that sets the selected 'radio-bar' option and calls other
   * methods associated with the button the user clicked.
   *
   * @param e {Event}
   */
  _setOption = function (e) {
    var tables,
        ul = e.target.closest('ul'),
        name = Array.from(ul.classList).find(className =>
          className !== 'options'
        ),
        value = this.id;

    _app.setOption.call(this);

    if (name === 'catalog') {
      if (document.body.classList.contains('mainshock')) {
        _toggle(value);
      } else {
        _setParam(name, value);
      }
    } else { // timezone option
      tables = document.querySelectorAll('#summaryPane table.list.sortable');

      _setParam(name, value);
      _setTimeZone(value);
      _app.SummaryPane.swapSortIndicator(tables);
    }
  };

  /**
   * Set (or delete) the given URL parameter depending on whether or not the
   * given value is the default.
   *
   * @param name {String}
   * @param value {String}
   */
  _setParam = function (name, value) {
    if (value === _DEFAULTS[name]) {
      AppUtil.deleteParam(name, value);
    } else {
      AppUtil.setParam(name, value);
    }
  };

  /**
   * Show earthquake times in the given timezone.
   *
   * @param timezone {String <user|utc>}
   */
  _setTimeZone = function (timezone) {
    var tzs = ['user', 'utc'];

    tzs.forEach(tz => {
      document.body.classList.remove(tz);
    });

    document.body.classList.add(timezone);

    if (document.body.classList.contains('mainshock')) {
      _app.PlotsPane.update();
    }
  };

  /**
   * Toggle the option to swap catalogs on/off depending on the current state.
   *
   * @param catalog {String <comcat|dd>}
   */
  _toggle = function (catalog) {
    var names = {
          comcat: 'ComCat',
          dd: 'Double Difference'
        },
        prevCatalog = AppUtil.getParam('catalog') || _DEFAULTS.catalog,
        swap = _el.querySelector('.swap'),
        span = swap.querySelector('span');

    if (catalog === prevCatalog) {
      swap.classList.add('hide');
    } else {
      swap.classList.remove('hide');
      span.textContent = names[prevCatalog];
    }
  };

  /**
   * Update the URL and refresh a Feature when its settings are changed.
   */
  _update = function () {
    var featureId = this.closest('div').className;

    AppUtil.updateParam(this.id);

    if (this.value !== '') {
      _refreshFeature(featureId);
    }
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add the count value to the Feature's name and hide the 'loader'.
   *
   * @param feature {Object}
   */
  _this.addCount = function (feature) {
    var count, loader,
        div = _el.querySelector('.' + feature.id);

    if (div) { // Feature has configurable params
      count = div.querySelector('.count');
      loader = div.querySelector('.breather');

      loader.classList.add('hide');

      // Add/show count if applicable
      if (count && Object.prototype.hasOwnProperty.call(feature, 'count')) {
        count.textContent = feature.count;

        count.classList.remove('hide');
      }
    }
  };

  /**
   * Show the 'loader' next to the Feature's name and hide the count value.
   *
   * @param feature {Object}
   */
  _this.addLoader = function (feature) {
    var count, loader,
        div = _el.querySelector('.' + feature.id);

    if (div) { // Feature has configurable params
      count = div.querySelector('.count');
      loader = div.querySelector('.breather');

      loader.innerHTML = '<span></span>';
      loader.classList.remove('hide');

      if (count) {
        count.classList.add('hide');
      }
    }
  };

  /**
   * Initialization that depends on other Classes being ready before running.
   */
  _this.postInit = function () {
    _setDefaults();
  };

  /**
   * Hide the 'loader' and count value next to the Feature's name.
   *
   * @param feature {Object}
   */
  _this.removeCount = function (feature) {
    var count, loader,
        div = _el.querySelector('.' + feature.id);

    if (div) { // Feature has configurable params
      count = div.querySelector('.count');
      loader = div.querySelector('.breather');

      loader.classList.add('hide');

      if (count) {
        count.classList.add('hide');
      }
    }
  };

  /**
   * Reset to default state.
   *
   * Note: Feature counts are removed separately via _this.removeCount().
   */
  _this.reset = function () {
    var catalog = AppUtil.getParam('catalog') || _DEFAULTS.catalog,
        selectors = [
          '.aftershocks input',
          '.foreshocks input',
          '.historical input'
        ],
        inputs = _el.querySelectorAll(selectors.join(',')),
        selected = _el.querySelector('.catalog .selected'),
        swap = _el.querySelector('.swap');

    _focusedField = null;

    inputs.forEach(input =>
      input.value = ''
    );

    // Set the catalog param when user changed setting but didn't complete swap
    if (selected) {
      if (catalog !== selected.id && !swap.classList.contains('hide')) {
        _setParam('catalog', selected.id);
        swap.classList.add('hide');
      }
    }
  };

  /**
   * Set the default form field values based on the selected Mainshock, which
   * are overridden by existing queryString values when present.
   */
  _this.setDefaults = function () {
    var input, param,
        defaults = _getDefaults();

    Object.keys(defaults).forEach(key => {
      input = document.getElementById(key);
      param = AppUtil.getParam(key);

      if (input) {
        if (param) {
          input.value = param;
        } else {
          input.value = defaults[key];
        }
      }
    });
  };

  /**
   * Set the focus to the last field selected by user (or Event ID by default).
   */
  _this.setFocusedField = function () {
    var field = 'eqid'; // default

    if (_focusedField) {
      field = _focusedField;
    }

    document.getElementById(field).focus();
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = SettingsBar;
