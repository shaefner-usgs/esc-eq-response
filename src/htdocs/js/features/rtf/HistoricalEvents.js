/* global L */
'use strict';


/**
 * Create the Historical Events Feature.
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *     }
 *
 * @return _this {Object}
 *     {
 *       addData: {Function}
 *       destroy: {Function}
 *       events: {Array}
 *       id: {String}
 *       name: {String}
 *       url: {String}
 *     }
 */
var HistoricalEvents = function (options) {
  var _this,
      _initialize,

      _app,

      _fetch,
      _getUrl;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;

    _this.events = [];
    _this.id = 'historical-events';
    _this.name = 'Historical Events';
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
    var contents,
        mainshock = _app.Features.getFeature('mainshock'),
        products = mainshock.json.properties.products,
        url = '';

    if (products.losspager) {
      contents = products.losspager[0].contents;

      if (contents['json/historical_earthquakes.json']) {
        url = contents['json/historical_earthquakes.json'].url;
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
    _this.events = json;
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


module.exports = HistoricalEvents;
