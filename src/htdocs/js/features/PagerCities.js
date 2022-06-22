'use strict';


var AppUtil = require('util/AppUtil');


/**
 * Create the PAGER Cities Feature, which is a sub-Feature of PAGER Exposures.
 *
 * @param options {Object}
 *   {
 *     app: {Object} Application
 *   }
 *
 * @return _this {Object}
 *   {
 *     cities: {Object}
 *     create: {Function}
 *     destroy: {Function}
 *     id: {String}
 *     name: {String)
 *     setFeedUrl: {Function}
 *     url: {String}
 *   }
 */
var PagerCities = function (options) {
  var _this,
      _initialize,

      _app,

      _compare;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;

    Object.assign(_this, {
      id: 'pager-cities',
      name: 'PAGER Cities',
      url: ''
    });
  };

  /**
   * Comparison function to sort cities by population (DESC).
   *
   * @params a, b {Objects}
   *     Objects to compare/sort
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

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Create the PAGER cities list.
   *
   * @param json {Object}
   *     feed data for Feature
   */
  _this.create = function (json) {
    _this.cities = [];

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

    _this = null;
  };

  /**
   * Set the JSON feed's URL.
   */
  _this.setFeedUrl = function () {
    var contents,
        mainshock = _app.Features.getFeature('mainshock'),
        products = mainshock.json.properties.products;

    if (products.losspager) {
      contents = products.losspager[0].contents;

      if (contents['json/cities.json']) {
        _this.url = contents['json/cities.json'].url;
      }
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = PagerCities;
