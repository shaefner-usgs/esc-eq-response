'use strict';


var AppUtil = require('util/AppUtil'),
    Earthquakes = require('features/util/Earthquakes');


/**
 * Create Historical Seismicity Feature
 *
 * @param options {Object}
 *   {
 *     app: {Object}, // Application
 *     eqid: {String} // Mainshock event id
 *   }
 *
 * @return _this {Object}
 *   {
 *     bins: {Object},
 *     count: {Integer},
 *     cumulativeEqs: {Array},
 *     description: {String},
 *     destroy: {Function},
 *     id: {String},
 *     initFeature: {Function},
 *     list: {Array},
 *     mapLayer: {L.layer},
 *     name: {String},
 *     plotTraces: {Object},
 *     showLayer: {Boolean},
 *     sortBy: {String},
 *     summary: {String},
 *     url: {String},
 *     zoomToLayer: {Boolean}
 *   }
 */
var Historical = function (options) {
  var _this,
      _initialize,

      _app,
      _Earthquakes,

      _getFeedUrl,
      _getSummary;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;

    _this.id = 'historical';
    _this.mapLayer = null;
    _this.name = 'Historical Seismicity';
    _this.plotTraces = null;
    _this.showLayer = true;
    _this.sortBy = 'mag';
    _this.summary = null;
    _this.url = _getFeedUrl();
    _this.zoomToLayer = true;
  };

  /**
   * Get URL of json feed
   *
   * @return {String}
   */
  _getFeedUrl = function () {
    var mainshock,
        urlParams;

    mainshock = _app.Features.getFeature('mainshock');
    urlParams = {
      endtime: AppUtil.Moment(mainshock.json.properties.time - 1000).utc()
        .toISOString().slice(0, -5),
      latitude: mainshock.json.geometry.coordinates[1],
      longitude: mainshock.json.geometry.coordinates[0],
      maxradiuskm: Number(AppUtil.getParam('hs-dist')),
      minmagnitude: Number(AppUtil.getParam('hs-mag')) - 0.05, // account for rounding to tenths
      starttime: AppUtil.Moment(mainshock.json.properties.time).utc()
        .subtract(AppUtil.getParam('hs-years'), 'years').toISOString()
        .slice(0, -5)
    };

    return Earthquakes.getFeedUrl(urlParams);
  };

  /**
   * Get summary HTML
   *
   * @param json {Object}
   *
   * @return summary {String}
   */
  _getSummary = function () {
    var summary;

    summary = _Earthquakes.getDescription();

    if (_this.count > 0) {
      summary += _Earthquakes.getBinnedTable('prior');
      summary += _Earthquakes.getSubHeader();
      summary += _Earthquakes.getSlider();
      summary += _Earthquakes.getListTable('all');
    }

    return summary;
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
    _Earthquakes = null;

    _getFeedUrl = null;
    _getSummary = null;

    _this = null;
  };

  /**
   * Init Feature (set properties that depend on external feed data)
   *
   * @param json {Object}
   *     feed data for Feature
   */
  _this.initFeature = function (json) {
    _Earthquakes = Earthquakes({
      app: _app,
      id: _this.id,
      json: json,
      sortBy: _this.sortBy
    });

    _this.bins = {};
    if (_Earthquakes.bins.prior) {
      _this.bins.prior = _Earthquakes.bins.prior;
    }
    _this.count = json.metadata.count;
    _this.cumulativeEqs = _Earthquakes.bins.cumulative; // for eq mag filters on summary
    _this.description = _Earthquakes.getDescription();
    _this.list = _Earthquakes.list;
    _this.mapLayer = _Earthquakes.mapLayer;
    _this.plotTraces = _Earthquakes.plotTraces;
    _this.summary = _getSummary();
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Historical;
