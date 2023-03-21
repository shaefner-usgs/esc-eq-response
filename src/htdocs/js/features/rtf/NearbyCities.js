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
 *       url: {String}
 *     }
 */
var NearbyCities = function (options) {
  var _this,
      _initialize,

      _app,

      _fetch,
      _getUrl;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;

    _this.data = [];
    _this.id = 'nearby-cities';
    _this.name = 'Nearby Cities';
    _this.url = _getUrl();

    _fetch();
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
   * Get the JSON feed's URL.
   *
   * @return url {String}
   */
  _getUrl = function () {
    var mainshock = _app.Features.getFeature('mainshock'),
        product = mainshock.data.products?.['nearby-cities'] || [],
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
    _this.data = json;
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;

    _fetch = null;
    _getUrl = null;

    _this = null;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = NearbyCities;
