'use strict';


var Earthquake = require('Earthquake'),
    SignificantEqs = require('SignificantEqs');

/**
 * Handles form fields (kicks off fetching of data feeds), displays mainshock,
 *   and sets address bar to match application state
 *
 * @param options {Object}
 *   {
 *     el: {Element},
 *     features: {Object} // Features instance
 *     loadingModule: {Object} // LoadingModule instance
 *   }
 */
var EditPane = function (options) {
  var _this,
      _initialize,

      _el,
      _eqid,
      _features,
      _inputs,
      _loadingModule,
      _mainshock,
      _mapPane,
      _significantEqs,
      _summaryPane,

      _addListener,
      _createEarthquake,
      _getDefaults,
      _getParam,
      _getParams,
      _initListeners,
      _isValidEqId,
      _refreshAftershocks,
      _refreshHistorical,
      _resetApp,
      _resetForm,
      _selSignificantEq,
      _setFormFields,
      _setQueryString,
      _setParam,
      _showSignificantEqs,
      _updateQueryString;


  _this = {};

  _initialize = function (options) {
    options = options || {};
    _el = options.el || document.createElement('div');
    _features = options.features;
    _loadingModule = options.loadingModule;
    _mapPane = options.mapPane;
    _summaryPane = options.summaryPane;

    _eqid = document.getElementById('eqid');
    _eqid.focus();

    _inputs = _el.querySelectorAll('input:not(.reset)');

    _significantEqs = SignificantEqs({
      callback: _showSignificantEqs,
      loadingModule: _loadingModule
    });

    _initListeners();
    _setFormFields();
    _setQueryString();

    // Get things rolling if eqid is already set when initialized
    if (_eqid.value !== '') {
      _createEarthquake();
    }
  };

  /**
   * Add event listener
   *
   * @param els {NodeList}
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
   * Create a new earthquake instance using event id provided by user
   */
  _createEarthquake = function () {
    _resetApp();

    if (_isValidEqId()) {
      _mainshock = Earthquake({
        callback: _features.initFeatures, // add features to map and summary panes
        editPane: _this,
        id: _eqid.value,
        loadingModule: _loadingModule
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
      'historical-dist': Math.max(10, 15*Math.round(0.1*ruptureLength)),
      'historical-years': 10
    };
  };

  /**
   * Get value of url param
   *
   * @param name {String}
   *
   * @return {Mixed}
   */
  _getParam = function (name) {
    var params = _getParams();

    return params[name];
  };

  /**
   * Get all url param name/value pairs
   *
   * @return params {Object}
   */
  _getParams = function () {
    var params,
        queryString;

    params = {};
    queryString = location.search.slice(1);

    queryString.replace(/([^=]*)=([^&]*)&*/g, function (match, key, value) {
      params[key] = value;
    });

    return params;
  };

  /**
   * Initialize event listeners
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
    _addListener([_eqid], 'input', _createEarthquake);

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

    if (_loadingModule.hasError('mainshock')) {
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
   * Reset app: clear any previous mainshock details, features, and alerts
   */
  _resetApp = function () {
    _el.querySelector('.details').innerHTML = '';
    _features.removeFeatures();
    _loadingModule.clearAll();
  };

  /**
   * Reset form: calls resetApp and also resets querystring after form cleared
   */
  _resetForm = function () {
    _resetApp();
    _mapPane.setDefaultView();
    _summaryPane.resetTimeStamp();

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
    _createEarthquake();
    _setQueryString();
  };

  /**
   * Set all form field values to match values in querystring
   */
  _setFormFields = function () {
    var params = _getParams();

    Object.keys(params).forEach(function(key) {
      if (document.getElementById(key)) {
        document.getElementById(key).value = params[key];
      }
    });
  };

  /**
   * Set the value of a url parameter
   *
   * @param name {String}
   * @param value {Mixed}
   */
  _setParam = function (name, value) {
    var hash,
        pairs,
        params,
        queryString;

    hash = location.hash;
    params = _getParams();
    params[name] = value;

    pairs = [];
    Object.keys(params).forEach(function(key) {
      pairs.push(key + '=' + params[key]);
    });
    queryString = '?' + pairs.join('&');

    window.history.replaceState({}, '', queryString + hash);
  };

  /**
   * Set all querystring values to match values in form fields
   */
  _setQueryString = function () {
    var i;

    for (i = 0; i < _inputs.length; i ++) {
      _setParam(_inputs[i].id, _inputs[i].value);
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
    _loadingModule.removeItem('significant');
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

    _setParam(id, value);
  };

  /**
   * Set default form field values / url params based on mainshock's details
   *
   * @param mainshock {Object}
   */
  _this.setDefaults = function (mainshock) {
    var defaults;

    defaults = _getDefaults(mainshock);

    // First, update url params with defaults
    Object.keys(defaults).forEach(function(key) {
      _setParam(key, defaults[key]);
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
    var details,
        html;

    details = _el.querySelector('.details');
    html = _mainshock.getHtml(data);

    details.innerHTML = html;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = EditPane;
