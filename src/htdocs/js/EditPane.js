'use strict';


var AppUtil = require('AppUtil');


/**
 * Handle form fields and set URL to match application state; display mainshock
 *   details
 *
 * Also kicks off creation of Features
 *
 * @param options {Object}
 *   {
 *     app: {Object}, // Application
 *     el: {Element}
 *   }
 *
 * @return _this {Object}
 *   {
 *     addCount: {Function},
 *     addLoadingSpinner: {Function},
 *     focusedField: {String},
 *     initFeatures: {Function},
 *     removeFeature: {Function},
 *     reset: {Function},
 *     selSignificantEq: {Function},
 *     setDefaults: {Function},
 *     showMainshock: {Function}
 *   }
 */
var EditPane = function (options) {
  var _this,
      _initialize,

      _app,
      _el,
      _eqid,
      _eqidPrevValue,
      _fields,

      _addListener,
      _checkIfNew,
      _checkIfValid,
      _getDefaults,
      _hideMainshock,
      _initListeners,
      _loadEvent,
      _refreshFeature,
      _resetCounts,
      _resetForm,
      _resetTitle,
      _setFormFieldValues,
      _setQueryStringValues,
      _storeFocus,
      _timers,
      _updateParam,
      _viewMap;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _el = options.el || document.createElement('div');
    _eqid = document.getElementById('eqid');
    _eqidPrevValue = null;
    _fields = _el.querySelectorAll('input'); // all form fields
    _timers = {};

    _initListeners();
    _setFormFieldValues();
    _setQueryStringValues();
  };

  /**
   * Add an event listener
   *
   * @param els {NodeList | Array}
   *     Elements
   * @param type {String}
   *     Event type
   * @param listener {Function}
   */
  _addListener = function (els, type, listener) {
    var i;

    for (i = 0; i < els.length; i ++) {
      els[i].addEventListener(type, listener);
    }
  };

  /**
   * Check if eqid entered by user is 'new' (different from previous value)
   *
   * @return isNew {Boolean}
   */
  _checkIfNew = function () {
    var isNew = false;

    if (_eqidPrevValue && _eqid.value !== _eqidPrevValue) {
      isNew = true;
    }
    _eqidPrevValue = _eqid.value; // cache previous value

    return isNew;
  };

  /**
   * Check if eqid is valid and exists
   *
   * @return isValid {Boolean}
   */
  _checkIfValid = function () {
    var isValid,
        regex;

    isValid = false;
    regex = /^[^/\\:]+$/; // no slashes, colons

    // 404 error is logged if eqid not found
    if (regex.test(_eqid.value) && !_app.StatusBar.hasError('mainshock')) {
      isValid = true;
    }

    return isValid;
  };

  /**
   * Get default values for form fields that depend on user-selected mainshock
   *
   * Default values for aftershock and historical seismicity differences are
   * based on rupture length, which we estimate from the Hanks-Bakun (2014)
   * magitude-area relation. We round to the nearest 10km via 10*round(0.1*value).
   *
   * ruptureArea = 10**(M-4), ruptureLength(approx) = A**0.7
   *
   * Aftershock / Forshock distance = ruptureLength,
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
   * Hide mainshock details on edit pane
   */
  _hideMainshock = function () {
    _el.querySelector('.details').classList.add('hide');
  };

  /**
   * Initialize event listeners
   *
   * Note that _addListener() expects a NodeList (or an array) as the first arg
   */
  _initListeners = function () {
    var aftershocks,
        foreshocks,
        historical,
        reset,
        viewmap;

    aftershocks = _el.querySelectorAll('.aftershocks');
    foreshocks = _el.querySelectorAll('.foreshocks');
    historical = _el.querySelectorAll('.historical');
    reset = _el.querySelector('.reset');
    viewmap = _el.querySelector('.viewmap');

    // Update querystring param when form field is changed
    _addListener(_fields, 'input', _updateParam);

    // Remember focused field
    _addListener(_fields, 'focus', _storeFocus);

    // Load a new set of Feature layers when eqid is changed
    _addListener([_eqid], 'input', _loadEvent);

    // Update Features when params are changed (fires when change is committed)
    _addListener(aftershocks, 'change', _refreshFeature);
    _addListener(foreshocks, 'change', _refreshFeature);
    _addListener(historical, 'change', _refreshFeature);

    // Clear Features when reset button is pressed
    _addListener([reset], 'click', _app.resetApp);

    // Switch to map pane when 'View Map' button is clicked
    _addListener([viewmap], 'click', _viewMap);
  };

  /**
   * Throttle loading so multiple requests don't stack up when typing an Event ID
   */
  _loadEvent = function () {
    var id = this.id;

    if (!_timers.hasOwnProperty(id)) {
      _timers[id] = [];
    }

    _timers[id].forEach(function(timer) { // clear throttled requests
      window.clearTimeout(timer);
      _timers[id].shift();
    });

    _timers[id].push( // throttle requests
      window.setTimeout(function() {
        _this.initFeatures();
      }, 500)
    );
  };

  /**
   * Refresh a Feature - triggered when a form field is changed by user
   */
  _refreshFeature = function () {
    var button,
        div,
        eqidIsValid,
        feature,
        featureId;

    eqidIsValid = _checkIfValid();

    if (eqidIsValid) {
      div = this; // parent container of form field
      featureId = div.className;
      feature = _app.Features.getFeature(featureId);

      if (!_timers.hasOwnProperty(featureId)) {
        _timers[featureId] = [];
      }

      _timers[featureId].forEach(function(timer) { // clear throttled requests
        window.clearTimeout(timer);
        _timers[featureId].shift();
      });

      // Throttle so multiple requests don't stack up
      _timers[featureId].push(
        window.setTimeout(function() {
          if (feature) {
            // Disable download button while feature is refreshing
            button = document.querySelector('.event-summary');
            button.setAttribute('disabled', 'disabled');

            _app.Features.refreshFeature(feature);
          } else { // feature never instantiated (likely due to a bad ajax request)
            _app.Features.instantiateFeature(featureId);
          }
        }, 500)
      );
    }
  };

  /**
   * Reset counts from Feature headers on form controls
   */
  _resetCounts = function () {
    var counts;

    counts = _el.querySelectorAll('.count');
    counts.forEach(function(count) {
      count.classList.add('hide');
      count.textContent = '';
    });
  };

  /**
   * Reset querystring/significant eqs (input fields are already cleared)
   */
  _resetForm = function () {
    var select;

    // Set a slight delay so 'Reset' button can finish clearing form fields first
    setTimeout(function() {
      _setQueryStringValues(); // reset query string

      // Rebuild significant eqs pulldown (to set selected item if necessary)
      select = _el.querySelector('.significant');
      if (select) {
        select.parentNode.removeChild(select);
        _app.SignificantEqs.addSignificantEqs();
      }
    }, 25);
  };

  /**
   * Reset page title to default and return it
   *
   * @return title {String}
   */
  _resetTitle = function () {
    var title;

    // Only keep 'generic' portion of title after '|' char (app name)
    title = document.title.split('|')[1] || document.title.split('|')[0];
    document.title = title;

    return title;
  };

  /**
   * Set all form field values to match values in querystring
   */
  _setFormFieldValues = function () {
    var params = AppUtil.getParams();

    Object.keys(params).forEach(function(key) {
      if (document.getElementById(key)) {
        document.getElementById(key).value = params[key];
      }
    });
  };

  /**
   * Set all querystring values to match values in form fields
   */
  _setQueryStringValues = function () {
    var i;

    for (i = 0; i < _fields.length; i ++) {
      AppUtil.setParam(_fields[i].id, _fields[i].value);
    }
  };

  /**
   * Store id of form field selected (focused) by user
   *
   * @param e {Event}
   */
  _storeFocus = function (e) {
    _this.focusedField = e.target.id;
  };

  /**
   * Update URL parameter (triggered when a form field is changed by user)
   *
   * @param e {Event}
   */
  _updateParam = function (e) {
    var el,
        id,
        value;

    id = e.target.id;
    el = document.getElementById(id);
    value = el.value.replace(/\s+/g, ''); // strip whitespace
    el.value = value;

    AppUtil.setParam(id, value);
  };

  /**
   * Switch to map pane when 'View Map' button clicked
   */
  _viewMap = function () {
    if (!_el.querySelector('.viewmap').hasAttribute('disabled')) {
      location.hash = '#mapPane';
    }
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add count to Feature's name and hide laoding 'spinner'
   *
   * @param feature {Object}
   */
  _this.addCount = function (feature) {
    var count,
        div,
        spinner;

    div = _el.querySelector('.' + feature.id);

    if (div) { // Feature has configuration params
      spinner = div.querySelector('.spinner');
      spinner.classList.add('hide');

      count = div.querySelector('.count');
      if (count && feature.hasOwnProperty('count')) { // add count if applicable
        count.textContent = feature.count;
        count.classList.remove('hide');
      }
    }
  };

  /**
   * Show loading 'spinner' next to Feature's name and hide count
   *
   * @param feature {Object}
   */
  _this.addLoadingSpinner = function (feature) {
    var count,
        div,
        spinner;

    div = _el.querySelector('.' + feature.id);

    if (div) { // Feature has configuration params
      spinner = div.querySelector('.spinner');
      spinner.classList.remove('hide');

      count = div.querySelector('.count');
      if (count) {
        count.classList.add('hide');
      }
    }
  };

  /**
   * Create Features (and subsequently add them to map, plots and summary panes)
   */
  _this.initFeatures = function () {
    var eqidIsValid;

    _app.resetApp(); // first reset app to default state

    eqidIsValid = _checkIfValid();
    if (eqidIsValid) {
      _el.querySelector('.viewmap').removeAttribute('disabled');

      // Instantiate mainshock (other features are created after mainshock is ready)
      _app.Features.instantiateFeature('mainshock');
    }
  };

  /**
   * Hide loading 'spinner' and count next to Feature's name
   *
   * @param feature {Object}
   */
  _this.removeFeature = function (feature) {
    var count,
        div,
        spinner;

    div = _el.querySelector('.' + feature.id);

    if (div) { // Feature has configuration params
      count = div.querySelector('.count');
      spinner = div.querySelector('.spinner');

      spinner.classList.add('hide');
      if (count) {
        count.classList.add('hide');
      }
    }
  };

  /**
   * Reset edit pane to initial state
   */
  _this.reset = function () {
    _hideMainshock();
    _resetCounts();
    _resetForm();
    _resetTitle();

    _el.querySelector('.viewmap').setAttribute('disabled', 'disabled');
  };

  /**
   * Set user selected significant eq as mainshock
   */
  _this.selSignificantEq = function () {
    var index,
        significant;

    significant = _el.querySelector('.significant');
    index = significant.selectedIndex;

    _eqid.value = significant.options[index].value;

    // Call manually: eqid input event not triggered when value changed programmatically
    _setQueryStringValues();
    _this.initFeatures();
  };

  /**
   * Set default form field values / url params based on mainshock's details
   */
  _this.setDefaults = function () {
    var defaults,
        eqidIsNew;

    defaults = _getDefaults();
    eqidIsNew = _checkIfNew();

    // First, update url params with defaults
    Object.keys(defaults).forEach(function(key) {
      // Only set default value if empty or user entered a 'new' Event ID
      if (AppUtil.getParam(key) === '' || eqidIsNew) {
        AppUtil.setParam(key, defaults[key]);
      }
    });

    // Next, update all form fields to match url params
    _setFormFieldValues();
  };

  /**
   * Display mainshock's details on edit pane and also update <title>
   */
  _this.showMainshock = function () {
    var appTitle,
        details,
        mainshock,
        props;

    appTitle = _resetTitle();
    details = _el.querySelector('.details');
    mainshock = _app.Features.getFeature('mainshock');
    props = mainshock.json.properties;

    details.innerHTML = mainshock.mapLayer.getLayers()[0].getPopup().getContent();
    details.classList.remove('hide');

    document.title = props.magType + ' ' + AppUtil.round(props.mag, 1) +
      ' - ' + props.place + ' | ' + appTitle;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = EditPane;
