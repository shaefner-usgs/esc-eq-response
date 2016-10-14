'use strict';


/**
 * Edit pane - handles form fields and setting browser's address bar to match
 *  application state
 */
var EditPane = function () {
  var _this,
      _initialize,

      _inputs,

      _addListeners,
      _getDefaults,
      _getParams,
      _setFormFields,
      _setQueryString,
      _updateQueryString;


  _this = {};

  _initialize = function () {
    _inputs = document.querySelectorAll('input');

    document.getElementById('eqid').focus();

    _addListeners();
    _setFormFields();
    _setQueryString();
  };


  /**
   * Add Event Listeners
   */
  _addListeners = function () {
    var i;

    // Update querystring when input is changed
    for (i = 0; i < _inputs.length; i ++) {
      _inputs[i].addEventListener('change', _updateQueryString);
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
      'historical-dist': Math.max(10, Math.round(mag - 2) * 10)
    };
  };

  /**
   * Get all url param name/value pairs
   *
   * @return {Object}
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
   * Set default form field values based on mainshock's details
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


  _initialize();
  return _this;
};


module.exports = EditPane;
