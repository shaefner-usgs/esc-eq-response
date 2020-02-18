'use strict';


var AppUtil = require('AppUtil'),
    Earthquakes = require('features/util/Earthquakes');


/**
 * Create Foreshocks Feature
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
 *     cumulativeEqs: {Array},
 *     description: {String},
 *     destroy: {Function},
 *     id: {String},
 *     initFeature: {Function},
 *     mapLayer: {L.layer},
 *     name: {String},
 *     showLayer: {Boolean},
 *     summary: {String},
 *     title: {String},
 *     url: {String},
 *     zoomToLayer: {Boolean}
 *   }
 */
var Foreshocks = function (options) {
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

    _this.id = 'foreshocks';
    _this.name = 'Foreshocks';
    _this.showLayer = true;
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
      maxradiuskm: Number(AppUtil.getParam('fs-dist')),
      minmagnitude: Number(AppUtil.getParam('fs-mag')) - 0.05, // account for rounding to tenths
      starttime: AppUtil.Moment(mainshock.json.properties.time).utc()
        .subtract(AppUtil.getParam('fs-days'), 'days').toISOString()
        .slice(0, -5)
    };

    return Earthquakes.getFeedUrl(urlParams);
  };

  /**
   * Get summary html for Feature
   *
   * @param json {Object}
   *
   * @return summary {String}
   */
  _getSummary = function (json) {
    var summary;

    summary = _Earthquakes.getDescription();

    if (json.metadata.count > 0) {
      summary += _Earthquakes.getBinnedTable('prior');
      summary += _Earthquakes.getSubHeader();
      summary += _Earthquakes.getSlider();
      summary += _Earthquakes.getListTable(_Earthquakes.list, _Earthquakes.range.initial);
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
      json: json
    });

    _this.bins = {};
    if (_Earthquakes.bins.prior) {
      _this.bins.prior = _Earthquakes.bins.prior;
    }
    _this.cumulativeEqs = _Earthquakes.bins.cumulative; // for eq mag filters on summary
    _this.description = _Earthquakes.getDescription();
    _this.mapLayer = _Earthquakes.mapLayer;
    //_this.plotTraces = _Earthquakes.plotTraces;
    _this.summary = _getSummary(json);
    _this.title = _this.name + ' (' + json.metadata.count + ')';
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Foreshocks;
