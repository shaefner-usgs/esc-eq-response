'use strict';


/**
 * Get PAGER Cities for PAGER Exposures Feature.
 *
 * @param options {Object}
 *   {
 *     app: {Object} Application
 *     eqid: {String} Mainshock event id
 *   }
 *
 * @return _this {Object}
 *   {
 *     cities: {Object}
 *     destroy: {Function}
 *     id: {String}
 *     initFeature: {Function}
 *     name: {String)
 *     url: {String}
 *   }
 */
var PagerCities = function (options) {
  var _this,
      _initialize,

      _app,

      _compare,
      _getFeedUrl;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;

    _this.id = 'pager-cities';
    _this.name = 'PAGER Cities';
    _this.url = _getFeedUrl();
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

  /**
   * Get URL of JSON feed.
   *
   * @return url {String}
   */
  _getFeedUrl = function () {
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

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;

    _compare = null;
    _getFeedUrl = null;

    _this = null;
  };

  /**
   * Initialize Feature (set properties that depend on external feed data).
   *
   * @param json {Object}
   *     feed data for Feature
   */
  _this.initFeature = function (json) {
    if (_this.url) { // url not set when feed is unavailable
      _this.cities = json.onepager_cities.sort(_compare);
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = PagerCities;
