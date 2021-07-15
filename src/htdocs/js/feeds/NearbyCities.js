'use strict';


/**
 * Get Nearby Cities Feed.
 *
 * @param options {Object}
 *   {
 *     app: {Object} Application
 *   }
 *
 * @return _this {Object}
 *   {
 *     destroy: {Function}
 *     id: {String}
 *     name: {String}
 *     url: {String}
 *   }
 */
var NearbyCities = function (options) {
  var _this,
      _initialize,

      _app,

      _getFeedUrl;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;

    _this.id = 'nearby-cities';
    _this.name = 'Nearby Cities';
    _this.url = _getFeedUrl();
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

    if (products['nearby-cities']) {
      contents = products['nearby-cities'][0].contents;

      if (contents['nearby-cities.json']) {
        url = contents['nearby-cities.json'].url;
      }
    }

    return url;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Destroy this Class to aid in garbage collection
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;
    _getFeedUrl = null;

    _this = null;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = NearbyCities;
