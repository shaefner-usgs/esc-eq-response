'use strict';


/**
 * Create PAGER Cities list for PAGER Exposures Feature.
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
 *     getFeedUrl: {Function}
 *     id: {String}
 *     name: {String)
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

    _this.id = 'pager-cities';
    _this.name = 'PAGER Cities';
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
   * Create cities list.
   *
   * @param json {Object}
   *     feed data for Feature
   */
  _this.create = function (json) {
    _this.cities = json.onepager_cities.sort(_compare);
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
   * Get the JSON feed's URL.
   *
   * @return url {String}
   */
  _this.getFeedUrl = function () {
    var contents,
        mainshock,
        products,
        url;

    mainshock = _app.Features.getFeature('mainshock');
    products = mainshock.json.properties.products;
    url = '';

    if (products.losspager) {
      contents = products.losspager[0].contents;

      if (contents['json/cities.json']) {
        url = contents['json/cities.json'].url;
      }
    }

    return url;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = PagerCities;
