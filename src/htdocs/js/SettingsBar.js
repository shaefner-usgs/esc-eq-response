'use strict';


var AppUtil = require('util/AppUtil');


var _STATIC_DEFAULTS = {
  'as-mag': 0,
  'fs-days': 30,
  'fs-mag': 1,
  'hs-years': 10
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
      _getDefaults,
      _refreshFeature,
      _saveFocusedField,
      _setCatalogOption,
      _setOption,
      _swapCatalog,
      _toggleSwap;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _el = options.el || document.createElement('section');

    _addListeners();
    _setCatalogOption();
  };

  /**
   * Add event listeners.
   */
  _addListeners = function () {
    var buttons,
        features,
        fields,
        swap;

    buttons = _el.querySelectorAll('.catalog li');
    features = _el.querySelectorAll('.aftershocks, .foreshocks, .historical');
    fields = _el.querySelectorAll('input');
    swap = document.getElementById('swap');

    // Set the selected option on the 'radio-bar'
    buttons.forEach(button =>
      button.addEventListener('click', _setOption)
    );

    // Refresh a Feature
    features.forEach(feature =>
      feature.addEventListener('input', _refreshFeature)
    );

    // Update the queryString when a form field is changed
    fields.forEach(field => {
      field.addEventListener('focus', _saveFocusedField); // remember focused field
      field.addEventListener('input', AppUtil.updateParam);
    });

    // Refresh Features using data from an alternative catalog
    swap.addEventListener('click', _swapCatalog);

    // Safari clears form fields w/ autocomplete="off" when navigating "back" to app
    window.addEventListener('pageshow', () => {
      if (document.body.classList.contains('mainshock')) {
        // Set a slight delay so browser doesn't wipe out values
        setTimeout(_this.setDefaults, 25);
      }
    });
  };

  /**
   * Get the default values for form fields that depend on the currently
   * selected Mainshock and combine them with the 'static' defaults.
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
    var mag,
        ruptureArea,
        ruptureLength;

    mag = _app.Features.getFeature('mainshock').json.properties.mag;
    ruptureArea = Math.pow(10, mag - 4);
    ruptureLength = Math.pow(ruptureArea, 0.7);

    return Object.assign({}, _STATIC_DEFAULTS, {
      'as-dist': Math.max(5, 10 * Math.round(0.1 * ruptureLength)),
      'fs-dist': Math.max(5, 10 * Math.round(0.1 * ruptureLength)),
      'hs-dist': Math.max(20, 15 * Math.round(0.1 * ruptureLength)),
      'hs-mag': Math.round(Math.max(4, mag - 2)),
    });
  };

  /**
   * Refresh a Feature, throttling repeated requests. Triggered when the user
   * changes a Feature's setting(s) and when the earthquake catalog is swapped.
   *
   * @param e {Event}
   * @param id {String} optional; default is ''
   * @param throttle {Boolean} optional; default is true
   */
  _refreshFeature = function (e, id = '', throttle = true) {
    var feature;

    if (document.body.classList.contains('mainshock')) {
      if (!id) {
        id = this.className; // CSS class of the form field's parent container
      }
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
   * Save the id value of the form field selected (focused) by the user.
   *
   * @param e {Event}
   */
  _saveFocusedField = function (e) {
    _focusedField = e.target.id;
  };

  /**
   * Set the catalog option to match the 'catalog' URL parameter if it is set.
   */
  _setCatalogOption = function () {
    var catalog,
        lis,
        note;

    catalog = AppUtil.getParam('catalog');

    if (catalog) {
      lis = _el.querySelectorAll('.catalog li');
      note = _el.querySelector('.dd');

      lis.forEach(li => {
        if (li.id === catalog) {
          li.classList.add('selected');
        } else {
          li.classList.remove('selected');
        }
      });

      if (catalog === 'dd') {
        note.classList.remove('hide');
      }
    }
  };

  /**
   * Wrapper method to set the selected 'radio bar' option and also show/hide
   * the 'Swap' catalogs button/set the catalog param.
   */
  _setOption = function () {
    _app.SideBar.setOption.call(this);

    if (document.body.classList.contains('mainshock')) {
      _toggleSwap(this.id);
    } else {
      AppUtil.setParam('catalog', this.id);
    }
  };

  /**
   * Swap the earthquake catalog (source data) for Aftershocks, Foreshocks and
   * Historical Seismicity Features.
   */
  _swapCatalog = function () {
    var catalog,
        mainshock;

    catalog = _el.querySelector('.catalog .selected').id;
    mainshock = _app.Features.getFeature('mainshock');

    AppUtil.setParam('catalog', catalog);

    _toggleSwap(catalog);

    mainshock.update(catalog);
    _refreshFeature(null, 'aftershocks', false);
    _refreshFeature(null, 'foreshocks', false);
    _refreshFeature(null, 'historical', false);
  };

  /**
   * Toggle the option to swap catalogs on/off depending on the current state.
   *
   * @param catalog {String <comcat|dd>}
   */
  _toggleSwap = function (catalog) {
    var names,
        prevCatalog,
        span,
        swap;

    names = {
      comcat: 'ComCat',
      dd: 'Double Difference'
    };
    prevCatalog = AppUtil.getParam('catalog') || 'comcat';
    swap = _el.querySelector('.swap');
    span = swap.querySelector('span');

    if (catalog === prevCatalog) {
      swap.classList.add('hide');
    } else {
      swap.classList.remove('hide');
      span.textContent = names[prevCatalog];
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
    var count,
        div,
        loader;

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
    var count,
        div,
        loader;

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
   * Hide the 'loader' and count value next to the Feature's name.
   *
   * @param feature {Object}
   */
  _this.removeCount = function (feature) {
    var count,
        div,
        loader;

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
    var catalog,
        inputs,
        selCatalog,
        selectors,
        swap;

    catalog = AppUtil.getParam('catalog') || 'comcat';
    selectors = [
      '.aftershocks input',
      '.foreshocks input',
      '.historical input'
    ];
    inputs = _el.querySelectorAll(selectors.join(','));
    selCatalog = _el.querySelector('.catalog .selected').id;
    swap = _el.querySelector('.swap');

    _focusedField = null;

    inputs.forEach(input =>
      input.value = ''
    );

    // Set catalog param when user changes setting but doesn't complete swap
    if (catalog !== selCatalog && !swap.classList.contains('hide')) {
      AppUtil.setParam('catalog', selCatalog);
    }
    swap.classList.add('hide');
  };

  /**
   * Set the default form field values based on the Mainshock's details, which
   * are overridden by existing queryString values when present.
   */
  _this.setDefaults = function () {
    var defaults,
        input,
        param;

    defaults = _getDefaults();

    Object.keys(defaults).forEach(key => {
      input = document.getElementById(key);
      param = AppUtil.getParam(key);

      if (param) {
        input.value = param;
      } else {
        input.value = defaults[key];
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
