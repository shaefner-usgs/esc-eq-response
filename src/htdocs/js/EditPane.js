'use strict';


var Earthquake = require('Earthquake'),
    Moment = require('moment');

/**
 * Handles form fields and setting address bar to match application state
 *
 * @param options {Object}
 *   {
 *     el: {Element},
 *     features: {Object} // Features instance
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
      _refreshAftershocks,
      _refreshHistorical,
      _setFormFields,
      _setQueryString,
      _updateQueryString,
      _verifyEqId;


  _this = {};

  _initialize = function (options) {
    options = options || {};
    _el = options.el || document.createElement('div');
    _features = options.features;
    _loadingModule = options.loadingModule;

    _eqid = document.getElementById('eqid');
    _eqid.focus();

    _inputs = _el.querySelectorAll('input');

    _initListeners();
    _setFormFields();
    _setQueryString();

    // Call _createEarthquake() if eqid is set when initialized
    if (_eqid.value) {
      _createEarthquake();
    }
  };

  /**
   * Add event listener
   *
   * @param els {Elements}
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
    // Clear any previous details, layers, and messages
    document.querySelector('.details').innerHTML = '';
    _features.removeFeatures();
    _loadingModule.clearAll();


    if (_eqid.value !== '') {
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
    var mag;

    mag = mainshock.properties.mag;

    return {
      'aftershocks-dist': Math.max(5, Math.round(mag - 2) * 5),
      'historical-dist': Math.max(10, Math.round(mag - 2) * 10),
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
        historical;

    aftershocks = _el.querySelectorAll('.aftershocks');
    historical = _el.querySelectorAll('.historical');

    // Update querystring when params changed
    _addListener(_inputs, 'input', _updateQueryString);

    // Update mainshock (pass elem as array b/c _addListener expects an array)
    _addListener([_eqid], 'input', _verifyEqId);

    // Update aftershocks, historical layers when params change
    _addListener(aftershocks, 'change', _refreshAftershocks);
    _addListener(historical, 'change', _refreshHistorical);
  };

  /**
   * Refresh aftershocks feature layer
   */
  _refreshAftershocks = function () {
    _features.removeFeature('aftershocks');
    _features.addAftershocks();
  };

  /**
   * Refresh historical seismicity feature layer
   */
  _refreshHistorical = function () {
    _features.removeFeature('historical');
    _features.addHistorical();
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
   * Check that eqid is valid format, and if so call _createEarthquake()
   */
  _verifyEqId = function () {
    var regex;

    regex = /^[a-zA-Z]{2}[a-zA-Z0-9]{8}$/;
    if (regex.test(_eqid.value)) {
      _createEarthquake();
    }
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
