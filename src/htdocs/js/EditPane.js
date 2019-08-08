'use strict';


/**
 * Handle form fields on Edit pane and set address bar to match application state.
 * Also kick off fetching of data feeds.
 *
 * @param options {Object}
 *   {
 *     app: {Object}, // application props / methods
 *     el: {Element}
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
      _throttleRefresh,

      _addListener,
      _getDefaults,
      _hideMainshock,
      _initFeatures,
      _initListeners,
      _isNewEvent,
      _isValidEqId,
      _refreshEqs,
      _resetApp,
      _resetForm,
      _resetTitle,
      _setFormFields,
      _setQueryString,
      _updateParam,
      _viewMap;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _el = options.el || document.createElement('div');
    _eqid = document.getElementById('eqid');
    _eqid.focus();
    _eqidPrevValue = null;

    // All form fields
    _fields = _el.querySelectorAll('input');

    _initListeners();
    _setFormFields();
    _setQueryString();

    // Get things rolling if eqid is already set when initialized
    if (_eqid.value !== '') {
      _initFeatures();
    }
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

  /*
   * Get default values for form fields that depend on user-selected mainshock
   *
   * @param mainshockJson {Object}
   *     GeoJson data
   *
   * @return {Object}
   */
  _getDefaults = function (mainshockJson) {
    var mag,
        ruptureArea,
        ruptureLength;

    mag = mainshockJson.properties.mag;

    /*
     * Default values for aftershock and historical seismicity differences are
     * based on rupture length, which we estimate from the Hanks-Bakun (2014)
     * magitude-area relation. We round to the nearest 10km via 10*round(0.1*value).
     *
     * ruptureArea = 10**(M-4), ruptureLength(approx) = A**0.7
     *
     * Aftershock / Forshock distance = ruptureLength,
     * Historical distance = 1.5 * ruptureLength
     */
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

  /*
   * Hide mainshock details on edit pane
   */
  _hideMainshock = function () {
    _el.querySelector('.details').classList.add('hide');
  };

  /**
   * Add features to map, plots, summary panes
   */
  _initFeatures = function () {
    _resetForm(); // first reset form/app to default state

    if (_isValidEqId()) {
      _el.querySelector('.viewmap').removeAttribute('disabled');

      _app.Features.initFeatures();
    }
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

    // Get new set of feature layers when eqid is changed
    _addListener([_eqid], 'input', _initFeatures);

    // Update eq features when params changed
    _addListener(aftershocks, 'change', _refreshEqs);
    _addListener(foreshocks, 'change', _refreshEqs);
    _addListener(historical, 'change', _refreshEqs);

    // Clear features when reset button pressed
    _addListener([reset], 'click', _resetForm);

    // Switch to map pane when 'View Map' button is clicked
    _addListener([viewmap], 'click', _viewMap);
  };

  /**
   * Check if event id entered by user is 'new' (different from previous value)
   *
   * @return newEvent {Boolean}
   */
  _isNewEvent = function () {
    var isNew = false;

    if (_eqidPrevValue && _eqid.value !== _eqidPrevValue) {
      isNew = true;
    }
    _eqidPrevValue = _eqid.value;

    return isNew;
  };

  /**
   * Check if eqid is valid
   *
   * @return {Boolean}
   */
  _isValidEqId = function () {
    var regex;

    // Check if eqid exists (returns 404 error if not)
    if (_app.StatusBar.hasError('Mainshock')) {
      return false;
    }

    // Check if eqid is correct format (2 letters followed by 5-8 characters)
    regex = /^[a-zA-Z]{2}[a-zA-Z0-9]{5,8}$/;
    if (regex.test(_eqid.value)) {
      return true;
    }
  };

  /**
   * Refresh eqs feature layer (triggered when a form field is changed by user)
   */
  _refreshEqs = function () {
    var formField,
        id;

    if (_isValidEqId()) {
      formField = this;
      id = formField.className; // 'afershocks', 'foreshocks' or 'historical'

      // Throttle requests so they don't fire off repeatedly in rapid succession
      window.clearTimeout(_throttleRefresh);
      _throttleRefresh = window.setTimeout(function() {
        // Even with throttle in place, ajax requests could 'stack' up
        // Wait until previous request is finished before starting another
        if (_app.Features.isRefreshing) {
          window.setTimeout(function() {
            _refreshEqs.call(formField);
          }, 100);
        } else {
          _app.Features.refresh(id);
        }
      }, 250);
    }
  };

  /**
   * Reset app: clear mainshock details, features, status bar, etc.
   */
  _resetApp = function () {
    _el.querySelector('.viewmap').setAttribute('disabled', 'disabled');

    _hideMainshock();
    _resetTitle();
    _app.StatusBar.reset();
    _app.Features.removeFeatures();
    _app.MapPane.reset();
    _app.SummaryPane.reset();
    _app.NavBar.reset();
  };

  /**
   * Reset form: call _resetApp, reset querystring/pulldown after form cleared
   */
  _resetForm = function () {
    var div,
        select;

    _resetApp();

    // Set a slight delay so reset button can clear form fields first
    setTimeout(function () {
      // Reset query string
      _setQueryString();

      // Rebuild significant eqs pulldown (to set selected item)
      select = _el.querySelector('.significant');
      if (select) {
        div = select.parentNode;
        div.parentNode.removeChild(div);
        _app.SignificantEqs.addSignificantEqs();
      }
    }, 10);
  };

  /**
   * Reset page title to default and return it
   *
   * @return title {String}
   */
  _resetTitle = function () {
    var title;

    title = document.title.split('|')[1] || document.title.split('|')[0];
    document.title = title;

    return title;
  };

  /**
   * Set all form field values to match values in querystring
   */
  _setFormFields = function () {
    var params = _app.AppUtil.getParams();

    Object.keys(params).forEach(function(key) {
      if (document.getElementById(key)) {
        document.getElementById(key).value = params[key];
      }
    });
  };

  /**
   * Set all querystring values to match values in form fields
   */
  _setQueryString = function () {
    var i;

    for (i = 0; i < _fields.length; i ++) {
      _app.AppUtil.setParam(_fields[i].id, _fields[i].value);
    }
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

    _app.AppUtil.setParam(id, value);
  };

  /**
   * Switch to map pane (triggered when 'View map' button clicked)
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
   * Set user selected significant eq as mainshock
   */
  _this.selSignificantEq = function () {
    var index,
        significant;

    significant = _el.querySelector('.significant');
    index = significant.selectedIndex;

    _eqid.value = significant.options[index].value;

    // Call manually: eqid input event not triggered when value changed programmatically
    _setQueryString();
    _initFeatures();
  };

  /**
   * Display mainshock's details on edit pane and also update <title>
   *
   * @param html {String}
   * @param props {Object}
   */
  _this.showMainshock = function (html, props) {
    var appTitle,
        details;

    appTitle = _resetTitle();
    details = _el.querySelector('.details');

    details.innerHTML = html;
    details.classList.remove('hide');

    document.title = props.magType + ' ' + _app.AppUtil.round(props.mag, 1) +
      ' - ' + props.place + ' | ' + appTitle;
  };

  /**
   * Set default form field values / url params based on mainshock's details
   *
   * @param mainshockJson {Object}
   *     GeoJson data
   */
  _this.setDefaults = function (mainshockJson) {
    var defaults,
        isNewEvent;

    defaults = _getDefaults(mainshockJson);
    isNewEvent = _isNewEvent();

    // First, update url params with defaults
    Object.keys(defaults).forEach(function(key) {
      // Only set default value if empty or user entered a 'new' Event ID
      if (_app.AppUtil.getParam(key) === '' || isNewEvent) {
        _app.AppUtil.setParam(key, defaults[key]);
      }
    });

    // Next, update all form fields to match url params
    _setFormFields();
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = EditPane;
