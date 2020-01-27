'use strict';


var AppUtil = require('AppUtil');


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
 *     destroy: {Function},
 *     exposures: {Object},
 *     id: {String},
 *     initFeature: {Function},
 *     name: {String),
 *     url: {String}
 *   }
 */
var PagerExposures = function (options) {
  var _this,
      _initialize,

      _app,

      _getExposures,
      _getFeedUrl,
      _getShakingLevels;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;

    _this.id = 'pager-exposures';
    _this.name = 'PAGER Exposures';
    _this.url = _getFeedUrl();
  };

  /**
   * Get aggregated population exposure and associated MMI (in descending order)
   *
   * @return exposures {Object}
   */
  _getExposures = function (json) {
    var exposures,
        mmi;

    mmi = json.population_exposure.mmi;

    exposures = {
      mmi: mmi,
      population: json.population_exposure.aggregated_exposure,
      shaking: _getShakingLevels(mmi)
    };

    return exposures;
  };

  /**
   * Get URL of json feed
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
      if (contents['json/exposures.json']) {
        url = contents['json/exposures.json'].url;
      }
    }

    return url;
  };

  /**
   * Get Intensity/Shaking levels for an array of mmi values
   *
   * @param mmi {Array}
   *
   * @return levels {Array}
   */
  _getShakingLevels = function (mmi) {
    var levels = [];

    mmi.forEach(function (val) { // Integer
      levels.push(AppUtil.getShakingLevel(val));
    });

    return levels;
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

    _getExposures = null;
    _getFeedUrl = null;

    _this = null;
  };

  /**
   * Init Feature (set properties that depend on external feed data)
   *
   * @param json {Object}
   *     feed data for Feature
   */
  _this.initFeature = function (json) {
    if (_this.url) { // url not set when feed is unavailable
      _this.exposures = _getExposures(json);
    }
  };

  _initialize(options);
  options = null;
  return _this;
};


module.exports = PagerExposures;
