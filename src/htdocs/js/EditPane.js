'use strict';


var AppUtil = require('util/AppUtil');


/**
 * Handle form fields and set URL to match application state; display Mainshock
 * details.
 *
 * Also kicks off creation of Features.
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
 *     postInit: {Function}
 *     removeCount: {Function}
 *     reset: {Function}
 *     selSignificantEq: {Function}
 *     setDefaults: {Function}
 *     setFocusedField: {Function}
 *     showMainshock: {Function}
 *   }
 */
var EditPane = function (options) {
  var _this,
      _initialize,

      _app,
      _el,
      _eqid,
      _focusedField,
      _initialLoad,
      _timers,

      _addListeners,
      _createMainshock,
      _getDefaults,
      _handleMainshock,
      _hideMainshock,
      _initTimers,
      _isEqidValid,
      _refreshFeature,
      _resetCounts,
      _resetForm,
      _saveFocusedField;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _el = options.el || document.createElement('div');
    _eqid = document.getElementById('eqid');
    _initialLoad = true;
    _timers = {};

    _addListeners();
    AppUtil.setFieldValues();
  };

  /**
   * Add event listeners.
   */
  _addListeners = function () {
    var features,
        fields,
        reset;

    features = [
      _el.querySelector('.aftershocks'),
      _el.querySelector('.foreshocks'),
      _el.querySelector('.historical')
    ];
    fields = _el.querySelectorAll('input'); // all form fields
    reset = _el.querySelector('.reset');

    // Update Feature when its params are changed
    features.forEach(feature => {
      feature.addEventListener('input', _refreshFeature);
    });

    // Update querystring when a form field is changed; remember focused field
    fields.forEach(field => {
      field.addEventListener('focus', _saveFocusedField);
      field.addEventListener('input', AppUtil.updateParam);
    });

    // Reset app when the reset button is clicked
    reset.addEventListener('click', _app.reset);

    // Load a new set of Features when Mainshock eqid is changed
    _eqid.addEventListener('input', _handleMainshock);
  };

  /**
   * Create a new Mainshock (which subsequently creates the other Features).
   */
  _createMainshock = function () {
    _app.reset();

    if (_isEqidValid()) {
      _app.Features.createFeature('mainshock');
    }
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
   * Handler for managing a new Mainshock. Triggered when the Event ID field is
   * changed.
   */
  _handleMainshock = function () {
    var id = 'mainshock';

    if (_eqid.value) {
      _initTimers(id);

      // Immediately show loading status (don't wait for throttle timers)
      _app.StatusBar.clearItems();
      _app.StatusBar.addItem({
        id: id,
        name: 'Mainshock'
      });

      // Throttle requests
      _timers[id].push(
        window.setTimeout(function() {
          _createMainshock();
        }, 500)
      );
    } else {
      _app.reset();
    }
  };

  /**
   * Hide Mainshock details.
   */
  _hideMainshock = function () {
    _el.querySelector('.details').classList.add('hide');
  };

  /**
   * Initialize throttle timers that are used to minimize 'stacked' Fetch
   * requests when loading Features.
   *
   * @param id {String}
   *     Feature id
   */
  _initTimers = function (id) {
    if (!Object.prototype.hasOwnProperty.call(_timers, id)) {
      _timers[id] = [];
    }

    // Clear any previous throttled requests for this Feature
    _timers[id].forEach(timer => {
      window.clearTimeout(timer);
      _timers[id].shift();
    });
  };

  /**
   * Check if the current value entered in the Event ID field is valid and
   * exists.
   *
   * @return isValid {Boolean}
   */
  _isEqidValid = function () {
    var isValid,
        regex;

    isValid = false;
    regex = /^[^/\\:]+$/; // no slashes or colons

    // 404 error is logged if Event ID is not found
    if (regex.test(_eqid.value) && !_app.StatusBar.hasError('mainshock')) {
      isValid = true;
    }

    return isValid;
  };

  /**
   * Refresh a Feature. Triggered when a Feature's parameter field is changed.
   */
  _refreshFeature = function () {
    var feature,
        id;

    if (_isEqidValid()) {
      id = this.className; // parent container of form field
      feature = _app.Features.getFeature(id);

      _initTimers(id);

      // Immediately show loading status (don't wait for throttle timers)
      if (feature) {
        _app.StatusBar.addItem({
          id: feature.id,
          name: feature.name
        });
      }

      // Throttle requests
      _timers[id].push(
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
   * Reset Feature counts on form control headers.
   */
  _resetCounts = function () {
    var counts = _el.querySelectorAll('.count');

    counts.forEach(count => {
      count.classList.add('hide');

      count.textContent = '';
    });
  };

  /**
   * Reset significant earthquakes <select> menu and querystring (<input>s are
   * cleared by the Reset button).
   */
  _resetForm = function () {
    var select = _el.querySelector('.significantEqs');

    // Add a slight delay so 'Reset' button can clear <input>s first
    setTimeout(() => {
      AppUtil.setQueryString(); // reset query string

      // Rebuild <select> menu (sets selected item if applicable)
      if (select) {
        select.parentNode.removeChild(select);
        _app.SignificantEqs.addSelect();
      }
    }, 25);
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

      loader.innerHTML = '<div></div>';
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
    // Get things rolling if an eqid is already set
    if (AppUtil.getParam('eqid') !== '') {
      _createMainshock();
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
   */
  _this.reset = function () {
    _hideMainshock();
    _resetCounts();
    _resetForm();
  };

  /**
   * Set the user selected significant earthquake as the Mainshock.
   */
  _this.selSignificantEq = function () {
    var index,
        significantEqs;

    significantEqs = _el.querySelector('.significantEqs');
    index = significantEqs.selectedIndex;

    _eqid.value = significantEqs.options[index].value;

    // Input event is not triggered when it's changed programmatically
    AppUtil.setQueryString();
    _createMainshock();
  };

  /**
   * Set the form field values and URL params based on the Mainshock's details.
   */
  _this.setDefaults = function () {
    var defaults = _getDefaults();

    // Update URL params with defaults
    Object.keys(defaults).forEach(key => {
      // Preserve user-set URL params on initial load
      if (!_initialLoad || AppUtil.getParam(key) === '') {
        AppUtil.setParam(key, defaults[key]);
      }
    });

    _initialLoad = false;

    // Update form fields to match URL params
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

  /**
   * Show the Mainshock's details.
   */
  _this.showMainshock = function () {
    var details,
        mainshock;

    details = _el.querySelector('.details');
    mainshock = _app.Features.getFeature('mainshock');

    details.innerHTML = mainshock.mapLayer.getLayers()[0].getPopup().getContent().outerHTML;
    details.classList.remove('hide');

    _app.setTitle(mainshock.details);
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = EditPane;
