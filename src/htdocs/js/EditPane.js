'use strict';


var AppUtil = require('AppUtil'),
    SignificantEqs = require('SignificantEqs');


/**
 * Handles form fields and sets address bar to match application state.
 * Also kicks off fetching of data feeds and displays mainshock details.
 *
 * @param options {Object}
 *   {
 *     el: {Element},
 *     features: {Object}, // Features instance
 *     mapPane: {Object}, // MapPane instance
 *     navBar: {Object}, // NavBar instance
 *     statusBar: {Object}, // StatusBar instance
 *     summaryPane: {Object} // SummaryPane instance
 *   }
 */
var EditPane = function (options) {
  var _this,
      _initialize,

      _el,
      _eqid,
      _eqidPrevValue,
      _fields,
      _significantEqs,
      _throttleRefresh,
      _throttleUpdate,

      _Features,
      _MapPane,
      _NavBar,
      _StatusBar,
      _SummaryPane,

      _addListener,
      _addSignificantEqs,
      _getDefaults,
      _getFeatures,
      _hideMainshock,
      _initListeners,
      _isNewEvent,
      _isValidEqId,
      _refreshEqs,
      _resetApp,
      _resetForm,
      _selSignificantEq,
      _setFormFields,
      _setQueryString,
      _updateParam,
      _viewMap;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _Features = options.features;
    _MapPane = options.mapPane;
    _NavBar = options.navBar;
    _StatusBar = options.statusBar;
    _SummaryPane = options.summaryPane;

    _el = options.el || document.createElement('div');
    _eqid = document.getElementById('eqid');
    _eqid.focus();
    _eqidPrevValue = null;

    // All form fields
    _fields = _el.querySelectorAll('input');

    _significantEqs = SignificantEqs({
      callback: _addSignificantEqs,
      statusBar: _StatusBar
    });

    _initListeners();
    _setFormFields();
    _setQueryString();

    // Get things rolling if eqid is already set when initialized
    if (_eqid.value !== '') {
      _getFeatures();
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

  /**
   * Add list of significant earthquakes pulldown menu
   *
   * @param json {Object}
   *     GeoJson data
   */
  _addSignificantEqs = function (json) {
    var div,
        refNode,
        select,
        significant;

    refNode = _el.querySelector('label[for=eqid]');
    select = _significantEqs.getHtml(json);

    div = document.createElement('div');
    div.innerHTML = select;
    refNode.parentNode.insertBefore(div, refNode);

    // Add listener here b/c we have to wait til it exists
    significant = _el.querySelector('.significant');
    _addListener([significant], 'change', _selSignificantEq);
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
      'aftershocks-dist': Math.max(5, 10 * Math.round(0.1 * ruptureLength)),
      'aftershocks-minmag': 0,
      'foreshocks-days': 30,
      'foreshocks-dist': Math.max(5, 10 * Math.round(0.1 * ruptureLength)),
      'foreshocks-minmag': 1,
      'historical-dist': Math.max(20, 15 * Math.round(0.1 * ruptureLength)),
      'historical-minmag': Math.round(Math.max(4, mag - 2)),
      'historical-years': 10
    };
  };

  /**
   * Get features for map, plots, summary panes
   */
  _getFeatures = function () {
    _resetApp(); // first reset app to default state

    if (_isValidEqId()) {
      _el.querySelector('.viewmap').removeAttribute('disabled');

      // Pass editPane instance to expose its public methods to xhr callback in Features
      _Features.getFeatures({
        editPane: _this
      });
    }
  };

  /*
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

    // Get new set of feature layers when eqid is changed
    _addListener([_eqid], 'input', _getFeatures);

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
    if (_StatusBar.hasError('mainshock')) {
      return false;
    }

    // Check eqid format (2 letters followed by 5-8 characters)
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
        if (_Features.isRefreshing) {
          window.setTimeout(function() {
            _refreshEqs.call(formField);
          }, 100);
        } else {
          _Features.refresh(id);
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
    _StatusBar.reset();
    _Features.removeFeatures();
    _MapPane.reset();
    _SummaryPane.reset();
    _NavBar.reset();
  };

  /**
   * Reset form: calls resetApp and also resets querystring after form cleared
   */
  _resetForm = function () {
    _resetApp();

    // Set a slight delay so reset button can clear form fields first
    setTimeout(function () {
      _setQueryString();
    }, 10);
  };

  /**
   * Set user selected significant eq as mainshock
   */
  _selSignificantEq = function () {
    var index,
        significant;

    significant = _el.querySelector('.significant');
    index = significant.selectedIndex;

    _eqid.value = significant.options[index].value;

    // Call manually: eqid input event not triggered when value changed programmatically
    _setQueryString();
    _getFeatures();
  };

  /**
   * Set all form field values to match values in querystring
   */
  _setFormFields = function () {
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
  _setQueryString = function () {
    var i;

    for (i = 0; i < _fields.length; i ++) {
      AppUtil.setParam(_fields[i].id, _fields[i].value);
    }
  };

  /**
   * Update URL parameter (triggered when a form field is changed by user)
   *
   * @param e {Event}
   */
  _updateParam = function (e) {
    var doUpdate,
        el,
        id,
        value;

    doUpdate = function () {
      id = e.target.id;
      el = document.getElementById(id);
      value = el.value.replace(/\s+/g, ''); // strip whitespace
      el.value = value;

      AppUtil.setParam(id, value);
    };

    if (e.target.id === 'eqid') {
      // Update immediately (only need to throttle number type inputs)
      doUpdate();
    } else {
      // Throttle updates so they don't fire off repeatedly in rapid succession
      window.clearTimeout(_throttleUpdate);
      _throttleUpdate = window.setTimeout(function() {
        doUpdate();
      }, 100);
    }
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
   * Display mainshock's details on edit pane and also update <title>
   *
   * @param html {String}
   * @param props {Object}
   */
  _this.showMainshock = function (html, props) {
    var appTitle,
        details;

    appTitle = document.title.split('|')[1] || document.title.split('|')[0];
    details = _el.querySelector('.details');

    details.innerHTML = html;
    details.classList.remove('hide');

    document.title = props.magType + ' ' + AppUtil.round(props.mag, 1) + ' - ' +
      props.place + ' | ' + appTitle;
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
      if (AppUtil.getParam(key) === '' || isNewEvent) {
        AppUtil.setParam(key, defaults[key]);
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
