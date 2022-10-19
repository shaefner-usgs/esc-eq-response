/* global L */
'use strict';


var AppUtil = require('util/AppUtil');


/**
 * Create the PAGER Cities Feature, a co-Feature of PAGER Exposures.
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *     }
 *
 * @return _this {Object}
 *     {
 *       addData: {Function}
 *       cities: {Array}
 *       destroy: {Function}
 *       id: {String}
 *       name: {String)
 *       url: {String}
 *     }
 */
var PagerCities = function (options) {
  var _this,
      _initialize,

      _app,

      _compare,
      _fetch,
      _getUrl;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;

    _this.cities = [];
    _this.id = 'pager-cities';
    _this.name = 'PAGER Cities';
    _this.url =_getUrl();

    _fetch();
  };

  /**
   * Comparison function to sort cities by population (DESC).
   *
   * @params a, b {Objects}
   *
   * @return {Integer}
   */
  _compare = function (a, b) {
    if (a.pop > b.pop) {
      return -1;
    } else if (b.pop > a.pop) {
      return 1;
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
   * Get the JSON feed's URL.
   *
   * @return url {String}
   */
  _getUrl = function () {
    var contents,
        mainshock = _app.Features.getFeature('mainshock'),
        products = mainshock.data.products,
        url = '';

    if (products.losspager) {
      contents = products.losspager[0].contents;

      if (contents['json/cities.json']) {
        url = contents['json/cities.json'].url;
      }
    }

    return url;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add the JSON feed data.
   *
   * @param json {Object}
   */
  _this.addData = function (json) {
    if (json.onepager_cities) {
      _this.cities = json.onepager_cities.sort(_compare);
    } else if (Array.isArray(json)) { // sometimes data stored as top-level Array
      _this.cities = json.sort(_compare);
    }

    _this.cities.forEach(city => {
      city.pop = AppUtil.roundThousands(city.pop);
    });
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;

    _compare = null;
    _fetch = null;
    _getUrl = null;

    _this = null;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = PagerCities;
