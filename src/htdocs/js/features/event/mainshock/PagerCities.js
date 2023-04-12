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
 *       data: {Array}
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
      _getData,
      _getUrl;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;

    _this.data = [];
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
   * Get the data used to create the content.
   *
   * @param json {Mixed <Object|Array>}
   *
   * @return data {Array}
   */
  _getData = function (json) {
    var cities = json.onepager_cities || [],
        data = [];

    if (Array.isArray(json)) { // data stored in disparate formats
      data = json.sort(_compare);
    } else {
      data = cities.sort(_compare);
    }

    data.forEach((city = {}) => {
      city.pop = AppUtil.roundThousands(city.pop);
    });

    return data;
  };

  /**
   * Get the JSON feed's URL.
   *
   * @return url {String}
   */
  _getUrl = function () {
    var mainshock = _app.Features.getFeature('mainshock'),
        product = mainshock.data.eq.products?.losspager || [],
        contents = product[0]?.contents || {},
        url = '';

    if (contents['json/cities.json']) {
      url = contents['json/cities.json'].url || '';
    }

    return url;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add the JSON feed data.
   *
   * @param json {Object} default is {}
   */
  _this.addData = function (json = {}) {
    _this.data = _getData(json);
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
    _getUrl = null;

    _this = null;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = PagerCities;
