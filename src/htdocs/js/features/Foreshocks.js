'use strict';


var Earthquakes = require('features/util/Earthquakes');


/**
 * Create Foreshocks feature
 *
 * @param options {Object}
 *   {
 *     app: {Object}, // application props / methods
 *     eqid: {String} // mainshock event id
 *   }
 */
var Foreshocks = function (options) {
  var _this,
      _initialize,

      _app,
      _eqid,
      _mainshock,
      _Earthquakes,

      _getSummary;


  _this = {};

  _initialize = function (options) {
    var days,
        urlParams;

    options = options || {};

    _app = options.app;
    _eqid = options.eqid;
    _mainshock = _app.Features.getFeature('mainshock');

    days = _app.AppUtil.getParam('fs-days');
    urlParams = {
      endtime: _app.AppUtil.Moment(_mainshock.json.properties.time - 1000).utc()
        .toISOString().slice(0, -5),
      latitude: _mainshock.json.geometry.coordinates[1],
      longitude: _mainshock.json.geometry.coordinates[0],
      maxradiuskm: Number(_app.AppUtil.getParam('fs-dist')),
      minmagnitude: Number(_app.AppUtil.getParam('fs-mag')) - 0.05, // account for rounding to tenths
      starttime: _app.AppUtil.Moment(_mainshock.json.properties.time).utc()
        .subtract(days, 'days').toISOString().slice(0, -5)
    };

    _this.displayLayer = true;
    _this.id = 'foreshocks';
    _this.name = 'Foreshocks';
    _this.url = _app.Features.getEqFeedUrl(urlParams);
    _this.zoomToLayer = true;
  };

  /**
   * Get summary html for feature
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
      magThreshold = Math.floor(_app.AppUtil.getParam('fs-mag'));

      // Check if there's eq data for mag threshold; if not, decr mag by 1
      while (!_Earthquakes.sliderData[magThreshold]) {
        magThreshold --;
      }

      summary += _Earthquakes.getBinnedTable('prior');
      summary += '<h3>M <span class="mag">' + magThreshold + '</span>+ ' +
        'Earthquakes (<span class="num">' + _Earthquakes.sliderData[magThreshold] +
        '</span>)</h3>';
      summary += _Earthquakes.getSlider(magThreshold);
      summary += _Earthquakes.getListTable(_Earthquakes.eqList, magThreshold);
    }

    return summary;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Create feature (map layer, plot data, summary)
   *   invoked via Ajax callback in Features.js after json feed is loaded
   *
   * @param json {Object}
   *     feed data for feature
   */
  _this.createFeature = function (json) {
    _Earthquakes = Earthquakes({
      app: _app,
      id: _this.id,
      json: json
    });

    _this.mapLayer = _Earthquakes.mapLayer;
    _this.plotDescription = _Earthquakes.getDescription();
    _this.plotTraces = _Earthquakes.plotTraces;
    _this.sliderData = _Earthquakes.sliderData; // for eq mag filters on summary
    _this.summary = _getSummary(json);
    _this.title = _this.name + ' (' + json.metadata.count + ')';
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Foreshocks;
