'use strict';


var AppUtil = require('util/AppUtil');


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
      _initialLoad,

      _addListeners,
      _getDefaults,
      _refreshFeature,
      _saveFocusedField;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _el = options.el || document.createElement('section');
    _initialLoad = true;

    _addListeners();
  };

  /**
   * Add event listeners.
   */
  _addListeners = function () {
    var features,
        fields;

    features = _el.querySelectorAll('.aftershocks, .foreshocks, .historical');
    fields = _el.querySelectorAll('input');

    // Update Feature when its params are changed
    features.forEach(feature => {
      feature.addEventListener('input', _refreshFeature);
    });

    // Update querystring when a form field is changed; remember focused field
    fields.forEach(field => {
      field.addEventListener('focus', _saveFocusedField);
      field.addEventListener('input', AppUtil.updateParam);
    });
  };

  /**
   * Get default values for form fields that depend on the selected Mainshock.
   *
   * Default values for distances are based on rupture length, which we estimate
   * from the Hanks-Bakun (2014) magnitude-area relation, rounded the nearest
   * 10km.
   *
   * ruptureArea (A) = 10 ** (M - 4)
   * ruptureLength (approx) = A ** 0.7
   *
   * Aftershock, Foreshock distance = ruptureLength,
   * Historical distance = 1.5 * ruptureLength
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

    return {
      'as-dist': Math.max(5, 10 * Math.round(0.1 * ruptureLength)),
      'as-mag': 0,
      'fs-days': 30,
      'fs-dist': Math.max(5, 10 * Math.round(0.1 * ruptureLength)),
      'fs-mag': 1,
      'hs-dist': Math.max(20, 15 * Math.round(0.1 * ruptureLength)),
      'hs-mag': Math.round(Math.max(4, mag - 2)),
      'hs-years': 10
    };
  };

  /**
   * Refresh a Feature. Triggered when a Feature's parameter field is changed.
   */
  _refreshFeature = function () {
    var feature,
        id;

    if (_app.SelectBar.isEqidValid()) {
      id = this.className; // parent container of form field
      feature = _app.Features.getFeature(id);

      _app.JsonFeed.initThrottlers(id);

      // Immediately show loading status (don't wait for throttle timers)
      if (feature) {
        _app.StatusBar.addItem({
          id: feature.id,
          name: feature.name
        });
      }

      // Throttle requests
      _app.JsonFeed.throttlers[id].push(
        window.setTimeout(function() {
          if (feature) {
            _app.Features.refreshFeature(feature);
          } else { // Feature never created (likely due to a bad Fetch request)
            _app.Features.createFeature(id);
          }

          _app.PlotsPane.rendered = false; // flag to (re-)render plots
        }, 500)
      );
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
   * Show a 'loader' next to the Feature's name and hide the count value.
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
   * Reset to default state (<input>s are cleared by the Reset button).
   */
  _this.reset = function () {
    var counts = _el.querySelectorAll('.count');

    counts.forEach(count => {
      count.classList.add('hide');

      count.textContent = '';
    });
  };

  /**
   * Set the form field values and URL params based on the Mainshock's details.
   */
  _this.setDefaults = function () {
    var defaults = _getDefaults();

    // URL params
    Object.keys(defaults).forEach(key => {
      // Preserve user-set URL params on initial load
      if (!_initialLoad || AppUtil.getParam(key) === '') {
        AppUtil.setParam(key, defaults[key]);
      }
    });

    _initialLoad = false;

    // set form fields to match URL params
    AppUtil.setFieldValues();
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
