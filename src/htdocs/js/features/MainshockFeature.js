'use strict';


var Earthquakes = require('features/Earthquakes');


/**
 * Create Mainshock feature
 *
 * @param options {Object}
 *   {
 *     app: {Object}, // application props / methods
 *     eqid: {String} // mainshock event id
 *   }

 */
var MainshockFeature = function (options) {
  var _this,
      _initialize,

      _app,

      _getSummary;

  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;

    _this.displayLayer = true;
    _this.id = 'mainshock';
    _this.name = 'Mainshock';
    _this.url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/' +
      options.eqid + '.geojson';
    _this.zoomToLayer = true;
  };

  /**
   * Get summary html for feature
   */
  _getSummary = function (Earthquakes) {
    var summary;

    summary = Earthquakes.lastId;

    return summary;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Create feature (map layer, plot data, summary)
   *   invoked via Ajax callback in Features.js
   */
  _this.createFeature = function () {
    Earthquakes = Earthquakes({
      app: _app,
      feature: _this
    });

    _this.mapLayer = Earthquakes.mapLayer;
    _this.plotData = Earthquakes.plotData;
    _this.summary = _getSummary(Earthquakes);
  };


  _initialize(options);
  options = null;
  return _this;
};

module.exports = MainshockFeature;
