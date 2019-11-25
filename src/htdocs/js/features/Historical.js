'use strict';


var Earthquakes = require('features/util/Earthquakes');


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
 *     cumulativeEqs: {Array},
 *     description: {String},
 *     getFeedUrl: {Function},
 *     id: {String},
 *     initFeature: {Function},
 *     mapLayer: {L.layer},
 *     name: {String},
 *     plotTraces: {Object},
 *     showLayer: {Boolean},
 *     summary: {String},
 *     title: {String},
 *     zoomToLayer: {Boolean}
 *   }
 */
var Historical = function (options) {
  var _this,
      _initialize,

      _app,
      _Earthquakes,

      _getSummary;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;

    _this.id = 'historical';
    _this.name = 'Historical Seismicity';
    _this.showLayer = true;
    _this.zoomToLayer = true;
  };

  /**
   * Get summary HTML
   *
   * @param json {Object}
   *
   * @return summary {String}
   */
  _getSummary = function (json) {
    var magThreshold,
        summary;

    summary = _Earthquakes.getDescription();

    if (json.metadata.count > 0) {
      magThreshold = Math.floor(_app.AppUtil.getParam('hs-mag'));

      // Check if there's eq data for mag threshold; if not, decr mag by 1
      while (!_this.cumulativeEqs[magThreshold]) {
        magThreshold --;
      }

      summary += _Earthquakes.getBinnedTable('prior');
      summary += '<h3>M <span class="mag">' + magThreshold + '</span>+ ' +
        'Earthquakes (<span class="num">' + _this.cumulativeEqs[magThreshold] +
        '</span>)</h3>';
      summary += _Earthquakes.getSlider(magThreshold);
      summary += _Earthquakes.getListTable(_Earthquakes.list, magThreshold);
    }

    return summary;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Get url of data feed
   *
   * @return {String}
   */
  _this.getFeedUrl = function () {
    var mainshock,
        urlParams;

    mainshock = _app.Features.getFeature('mainshock');
    urlParams = {
      endtime: _app.AppUtil.Moment(mainshock.json.properties.time - 1000).utc()
        .toISOString().slice(0, -5),
      latitude: mainshock.json.geometry.coordinates[1],
      longitude: mainshock.json.geometry.coordinates[0],
      maxradiuskm: Number(_app.AppUtil.getParam('hs-dist')),
      minmagnitude: Number(_app.AppUtil.getParam('hs-mag')) - 0.05, // account for rounding to tenths
      starttime: _app.AppUtil.Moment(mainshock.json.properties.time).utc()
        .subtract(_app.AppUtil.getParam('hs-years'), 'years').toISOString()
        .slice(0, -5)
    };

    return Earthquakes.getFeedUrl(urlParams);
  };

  /**
   * Create Feature - set properties that depend on external feed data
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

    _this.bins = {
      prior: _Earthquakes.bins.prior
    };
    _this.cumulativeEqs = _Earthquakes.bins.cumulative; // for eq mag filters on summary
    _this.description = _Earthquakes.getDescription();
    _this.mapLayer = _Earthquakes.mapLayer;
    _this.plotTraces = _Earthquakes.plotTraces;
    _this.summary = _getSummary(json);
    _this.title = _this.name + ' (' + json.metadata.count + ')';
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Historical;
