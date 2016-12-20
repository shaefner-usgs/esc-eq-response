'use strict';


var AppUtil = require('AppUtil'),
    Mainshock = require('Mainshock'),
    SignificantEqs = require('SignificantEqs');

/**
 * Handles form fields (kicks off fetching of data feeds), displays mainshock,
 *   and sets address bar to match application state
 *
 * @param options {Object}
 *   {
 *     el: {Element},
 *     features: {Object}, // Features instance
 *     statusBar: {Object} // StatusBar instance
 *   }
 */
var EditPane = function (options) {
  var _this,
      _initialize,

      _el,
      _eqid,
      _eqidPrevValue,
      _features,
      _inputs,
      _mainshock,
      _mapPane,
      _significantEqs,
      _statusBar,
      _summaryPane,

      _addListener,
      _createMainshock,
      _getDefaults,
      _initListeners,
      _isValidEqId,
      _refreshAftershocks,
      _refreshHistorical,
      _resetApp,
      _resetForm,
      _selSignificantEq,
      _setFormFields,
      _setQueryString,
      _showSignificantEqs,
      _updateQueryString;


  _this = {};

  _initialize = function (options) {
    options = options || {};
    _el = options.el || document.createElement('div');
    _features = options.features;
    _mapPane = options.mapPane;
    _statusBar = options.statusBar;
    _summaryPane = options.summaryPane;

    _eqid = document.getElementById('eqid');
    _eqid.focus();
    _eqidPrevValue = null;

    _inputs = _el.querySelectorAll('input:not(.reset)');

    _significantEqs = SignificantEqs({
      callback: _showSignificantEqs,
      statusBar: _statusBar
    });

    _initListeners();
    _setFormFields();
    _setQueryString();

    // Get things rolling if eqid is already set when initialized
    if (_eqid.value !== '') {
      _createMainshock();
    }
  };

  /**
   * Add event listener
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
   * Create a new mainshock instance using event id provided by user
   */
  _createMainshock = function () {
    _resetApp();

    if (_isValidEqId()) {
      _mainshock = Mainshock({
        callback: _features.initFeatures, // add features to map and summary panes
        editPane: _this,
        id: _eqid.value,
        statusBar: _statusBar
      });
    }
  };

  /*
   * Get default values for form fields that depend on user-selected mainshock
   *
   * @param mainshock {Object}
   *
   * @return {Object}
   */
  _getDefaults = function (mainshock) {
    var mag,
        ruptureArea,
        ruptureLength;

    mag = mainshock.properties.mag;

    /*
     * Default values for aftershock and historical seismicity differences are
     * based on rupture length, which we estimate from the Hanks-Bakun (2014)
     * magitude-area relation. We round to the nearest 10km via 10*round(0.1*value).
     *
     * ruptureArea = 10**(M-4), ruptureLength(approx) = A**0.7
     *
     * Aftershock distance = ruptureLength, historical distance = 1.5*ruptureLength
     */
    ruptureArea = Math.pow(10, mag-4);
    ruptureLength = Math.pow(ruptureArea, 0.7);

    return {
      'aftershocks-dist': Math.max(5, 10*Math.round(0.1*ruptureLength)),
      'aftershocks-minmag': 0.0,
      'historical-dist': Math.max(10, 15*Math.round(0.1*ruptureLength)),
      'historical-minmag': 3.0,
      'historical-years': 10,
    };
  };

  /**
   * Initialize event listeners
   *
   * Note that _addListener expects a NodeList (or an array) as the first arg
   */
  _initListeners = function () {
    var aftershocks,
        historical,
        reset;

    aftershocks = _el.querySelectorAll('.aftershocks');
    historical = _el.querySelectorAll('.historical');
    reset = _el.querySelector('.reset');

    // Update querystring when params changed
    _addListener(_inputs, 'input', _updateQueryString);

    // Update mainshock when eqid changed
    _addListener([_eqid], 'input', _createMainshock);

    // Update aftershocks, historical layers when params changed
    _addListener(aftershocks, 'change', _refreshAftershocks);
    _addListener(historical, 'change', _refreshHistorical);

    // Clear features when reset button pressed
    _addListener([reset], 'click', _resetForm);
  };

  /**
   * Check that eqid is valid format (2 letters followed by 8 characters)
   * and that eqid exists (if known - error is shown after it was not found)
   *
   * @return {Boolean}
   */
  _isValidEqId = function () {
    var regex;

    if (_statusBar.hasError('mainshock')) {
      return false;
    }

    regex = /^[a-zA-Z]{2}[a-zA-Z0-9]{8}$/;
    if (regex.test(_eqid.value)) {
      return true;
    }
  };

  /**
   * Refresh aftershocks feature layer
   */
  _refreshAftershocks = function () {
    if (_isValidEqId()) {
      _features.removeFeature('aftershocks');
      _features.addAftershocks();
    }
  };

  /**
   * Refresh historical seismicity feature layer
   */
  _refreshHistorical = function () {
    if (_isValidEqId()) {
      _features.removeFeature('historical');
      _features.addHistorical();
    }
  };

  /**
   * Reset app: clear previous mainshock details, features, alerts, etc.
   */
  _resetApp = function () {
    _el.querySelector('.details').innerHTML = '';
    _features.removeFeatures();
    _statusBar.clearAll();
    _mapPane.setDefaultView();
    _summaryPane.resetTimeStamp();
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

    // Call these manually since input event is not triggered when value changed
    _createMainshock();
    _setQueryString();
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

    for (i = 0; i < _inputs.length; i ++) {
      AppUtil.setParam(_inputs[i].id, _inputs[i].value);
    }
  };

  /**
   * Show list of significant earthquakes
   *
   * @param data {Object}
   *     GeoJson data
   */
  _showSignificantEqs = function (data) {
    var div,
        refNode,
        select,
        significant;

    refNode = _el.querySelector('label[for=eqid]');
    select = _significantEqs.getHtml(data);

    div = document.createElement('div');
    div.innerHTML = select;
    refNode.parentNode.insertBefore(div, refNode);

    // Add listener here b/c we have to wait til it exists
    significant = _el.querySelector('.significant');
    _addListener([significant], 'change', _selSignificantEq);

    // Finished loading; remove alert
    _statusBar.removeItem('significant');
  };

  /**
   * Update querystring (e.g. called when a form field value changes)
   *
   * @param e {Event}
   */
  _updateQueryString = function (e) {
    var id,
        value;

    id = e.target.id;
    value = document.getElementById(id).value;

    AppUtil.setParam(id, value);
  };

  /**
   * Set default form field values / url params based on mainshock's details
   *
   * @param mainshock {Object}
   */
  _this.setDefaults = function (mainshock) {
    var defaults,
        newEvent;

    defaults = _getDefaults(mainshock);

    if (_eqidPrevValue && _eqid.value !== _eqidPrevValue) {
      newEvent = true;
    }
    _eqidPrevValue = _eqid.value;

    // First, update url params with defaults
    Object.keys(defaults).forEach(function(key) {
      // Only set default value if empty or user entered a 'new' Event ID
      if (AppUtil.getParam(key) === '' || newEvent) {
        AppUtil.setParam(key, defaults[key]);
      }
    });

    // Next, update all form fields to match url params
    _setFormFields();
  };

  /**
   * Display mainshock's details
   *
   * @param data {Object}
   *     GeoJson data
   */
  _this.showEqDetails = function (data) {
    var appTitle,
        details,
        html,
        props;

    appTitle = document.title.split('|')[1] || document.title.split('|')[0];
    details = _el.querySelector('.details');
    html = _mainshock.getHtml(data);
    props = data.properties;

    details.innerHTML = html;
    document.title = props.magType + ' ' + AppUtil.round(props.mag, 1) + ' - ' +
      props.place + ' | ' + appTitle;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = EditPane;
