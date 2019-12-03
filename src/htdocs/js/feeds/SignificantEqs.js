'use strict';


/**
 * Previous Significant Earthquakes Feed
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
var SignificantEqs = function (options) {
  var _this,
      _initialize,

      _app,

      _getFeedUrl;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;

    _this.id = 'significant-eqs';
    _this.name = 'Previous Significant Earthquakes';
    _this.url = _getFeedUrl();
  };

  /**
   * Get URL of json feed
   *
   * @return url {String}
   */
  _getFeedUrl = function () {
    var mainshockJson,
        url;

    mainshockJson = _app.Features.getFeature('mainshock').json;
    url = mainshockJson.properties.products.losspager[0].
      contents['json/historical_earthquakes.json'].url;

    return url;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = SignificantEqs;
