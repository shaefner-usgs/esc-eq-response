'use strict';


/**
 * Create PAGER Exposures Feature
 *
 * @param options {Object}
 *   {
 *     app: {Object}, // Application
 *   }
 *
 * @return _this {Object}
 *   {
 *     exposures: {Object},
 *     getFeedUrl: {Function},
 *     id: {String},
 *     initFeature: {Function},
 *     name: {String),
 *   }
 */
var PagerExposures = function (options) {
  var _this,
      _initialize,

      _app,

      _getExposures;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;

    _this.id = 'pager-exposures';
    _this.name = 'PAGER Exposures';
  };

  /**
   * Get aggregated population exposure and associated MMI (in descending order)
   *
   * @return exposures {Object}
   */
  _getExposures = function (json) {
    var exposures;

    exposures = {
      mmi: json.population_exposure.mmi.reverse(),
      population: json.population_exposure.aggregated_exposure.reverse()
    };

    return exposures;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Get URL of json feed
   *
   * @return url {String}
   */
  _this.getFeedUrl = function () {
    var mainshockJson,
        url;

    mainshockJson = _app.Features.getFeature('mainshock').json;
    url = mainshockJson.properties.products.losspager[0].
      contents['json/exposures.json'].url;

    return url;
  };

  /**
   * Create Feature - set properties that depend on external feed data
   *
   * @param json {Object}
   *     feed data for Feature
   */
  _this.initFeature = function (json) {
    _this.exposures = _getExposures(json);
  };

  _initialize(options);
  options = null;
  return _this;
};


module.exports = PagerExposures;
