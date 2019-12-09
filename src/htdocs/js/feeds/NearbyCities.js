'use strict';


/**
 * Nearby Cities Feed
 *
 * @param options {Object}
 *   {
 *     app: {Object}, // Application
 *   }
 *
 * @return _this {Object}
 *   {
 *     id: {String},
 *     name: {String),
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
   * Get URL of json feed
   *
   * @return url {String}
   */
  _getFeedUrl = function () {
    var mainshockJson,
        products,
        url;

    mainshockJson = _app.Features.getFeature('mainshock').json;
    products = mainshockJson.properties.products;

    if (products['nearby-cities']) {
      url = products['nearby-cities'][0].contents['nearby-cities.json'].url;
    }

    return url;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = NearbyCities;
