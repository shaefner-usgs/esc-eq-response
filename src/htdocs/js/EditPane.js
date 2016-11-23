'use strict';


var Earthquake = require('Earthquake'),
    Moment = require('moment');

/**
 * Handles form fields (kicks off fetching of data feeds), displays mainshock,
 *   and sets address bar to match application state
 *
 * @param options {Object}
 *   {
 *     el: {Element},
 *     features: {Object} // Features instance
 *     loadingModule: {Object}, // LoadingModule instance
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

      _addListener,
      _createEarthquake,
      _getDefaults,
      _getParams,
      _initListeners,
      _isValidEqId,
      _refreshAftershocks,
      _refreshHistorical,
      _resetApp,
      _resetForm,
      _setFormFields,
      _setQueryString,
      _updateQueryString;


  _this = {};

  _initialize = function (options) {
    options = options || {};
    _el = options.el || document.createElement('div');
    _features = options.features;
    _loadingModule = options.loadingModule;

    _eqid = document.getElementById('eqid');
    _eqid.focus();

    _inputs = _el.querySelectorAll('input:not(.reset)');

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
   * @param els {Array}
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
      Earthquake({
        callback: _features.initFeatures, // add features to map and summary panes
        editPane: _this,
        id: _eqid.value,
        loadingModule: _loadingModule,
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
   * Reset app: clear any previous mainshock details, features, and messages
   */
  _resetApp = function () {
    document.querySelector('.details').innerHTML = '';
    _features.removeFeatures();
    _loadingModule.clearAll();
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
   * Set all querystring values to match values in form fields
   */
  _setQueryString = function () {
    var i;

    for (i = 0; i < _inputs.length; i ++) {
      _this.setParam(_inputs[i].id, _inputs[i].value);
    }
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

    _this.setParam(id, value);
  };

  /**
   * Get value of url param
   *
   * @param name {String}
   *
   * @return {Mixed}
   */
  _this.getParam = function (name) {
    var params = _getParams();

    return params[name];
  };

  /**
   * Set default form field values / url params based on mainshock's details
   *
   * @param mainshock {Object}
   */
  _this.setDefaults = function (mainshock) {
    var defaults;

    defaults = _getDefaults(mainshock);
    Object.keys(defaults).forEach(function(key) {
      // first, update url params
      if (_this.getParam(key) === '') { // only set empty fields
        _this.setParam(key, defaults[key]);
      }
    });

    // next, update all form fields to match url params
    _setFormFields();
  };

  /**
   * Set the value of a url parameter
   *
   * @param name {String}
   * @param value {Mixed}
   */
  _this.setParam = function (name, value) {
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
   * Display mainshock's details
   *
   * @param mainshock {Object}
   */
  _this.showEqDetails = function (mainshock) {
    var coords,
        depth,
        details,
        eqMoment,
        html,
        isoTime,
        latlng,
        localTime,
        mag,
        props,
        utcTime;

    coords = mainshock.geometry.coordinates;
    props = mainshock.properties;

    eqMoment = Moment.utc(props.time, 'x');
    isoTime = eqMoment.toISOString();
    utcTime = eqMoment.format('MMM D, YYYY HH:mm:ss') + ' UTC';

    if (props.tz) {
      localTime = eqMoment.utcOffset(props.tz).format('MMM D, YYYY h:mm:ss A') +
        ' at epicenter';
    }

    depth = Math.round(coords[2] * 10) / 10;
    latlng = Math.round(coords[1] * 1000) / 1000 + ', ' +
      Math.round(coords[0] * 1000) / 1000;
    mag = Math.round(props.mag * 10) / 10;

    html = '<h2><a href="' + props.url + '">' + props.magType + ' ' + mag +
      ' - ' + props.place + '</a></h2>';
    html += '<dl>' +
        '<dt>Time</dt>' +
        '<dd>';
    if (localTime) {
      html += '<time datetime="' + isoTime + '">' + localTime + '</time>';
    }
    html += '<time datetime="' + isoTime + '">' + utcTime + '</time></dd>' +
        '<dt>Location</dt>' +
        '<dd>' + latlng + '</dd>' +
        '<dt>Depth</dt>' +
        '<dd>' + depth + ' km</dd>' +
        '<dt>Status</dt>' +
        '<dd>' + props.status + '</dd>' +
      '</dl>';

    details = _el.querySelector('.details');
    details.innerHTML = html;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = EditPane;
