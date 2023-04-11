/* global L */
'use strict';


/**
 * Create the Nearby Cities Feature.
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *     }
 *
 * @return _this {Object}
 *     {
 *       addData: {Function}
 *       data: {Array}
 *       destroy: {Function}
 *       id: {String}
 *       name: {String}
 *       summary: {String}
 *       url: {String}
 *     }
 */
var NearbyCities = function (options) {
  var _this,
      _initialize,

      _app,

      _compare,
      _fetch,
      _getData,
      _getSummary,
      _getUrl;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;

    _this.data = [];
    _this.id = 'nearby-cities';
    _this.name = 'Nearby Cities';
    _this.summary = '';
    _this.url = _getUrl();

    _fetch();
  };

  /**
   * Comparison function to sort cities by distance (ASC).
   *
   * @params a, b {Objects}
   *
   * @return {Integer}
   */
  _compare = function (a, b) {
    if (a.distance > b.distance) {
      return 1;
    } else if (b.distance > a.distance) {
      return -1;
    }

    return 0;
  };

  /**
   * Fetch the feed data.
   */
  _fetch = function () {
    if (_this.url) {
      L.geoJSON.async(_this.url, {
        app: _app,
        feature: _this
      });
    }
  };

  /**
   * Get the data used to create the content.
   *
   * @param json {Array}
   *
   * @return data {Array}
   */
  _getData = function (json) {
    var data = [];

    if (Array.isArray(json)) {
      data = json.sort(_compare);
    }

    return data;
  };

  /**
   * Get the HTML content for the SummaryPane.
   *
   * @return html {String}
   */
  _getSummary = function () {
    var html = '',
        lis = '';

    _this.data.forEach((city = {}) => {
      lis += `<li>${city.distance} km ${city.direction} of ${city.name}</li>`;
    });

    if (lis) {
      html =
        '<h3>Nearby Cities</h3>' +
        '<ul>' + lis + '</ul>';
    }

    return html;
  };

  /**
   * Get the JSON feed's URL.
   *
   * @return url {String}
   */
  _getUrl = function () {
    var mainshock = _app.Features.getFeature('mainshock'),
        product = mainshock.data.eq.products?.['nearby-cities'] || [],
        contents = product[0]?.contents || {},
        url = '';

    if (contents['nearby-cities.json']) {
      url = contents['nearby-cities.json']?.url || '';
    }

    return url;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add the JSON feed data.
   *
   * @param json {Object} default is []
   */
  _this.addData = function (json = []) {
    _this.data = _getData(json);
    _this.summary = _getSummary();
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;

    _compare = null;
    _fetch = null;
    _getData = null;
    _getSummary = null;
    _getUrl = null;

    _this = null;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = NearbyCities;
