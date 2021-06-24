'use strict';


var AppUtil = require('util/AppUtil'),
    Earthquakes = require('features/util/Earthquakes'),
    Moment = require('moment');


/**
 * Create Historical Seismicity Feature.
 *
 * @param options {Object}
 *   {
 *     app: {Object} Application
 *     eqid: {String} Mainshock event id
 *   }
 *
 * @return _this {Object}
 *   {
 *     bins: {Object}
 *     count: {Integer}
 *     description: {String}
 *     destroy: {Function}
 *     id: {String}
 *     initFeature: {Function}
 *     list: {Array}
 *     mapLayer: {L.Layer}
 *     name: {String}
 *     plotTraces: {Object}
 *     showLayer: {Boolean}
 *     sortByField: {String}
 *     summary: {String}
 *     url: {String}
 *     zoomToLayer: {Boolean}
 *   }
 */
var Historical = function (options) {
  var _this,
      _initialize,

      _app,
      _Earthquakes,

      _createSummary,
      _getFeedUrl;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;

    _this.id = 'historical';
    _this.mapLayer = null;
    _this.name = 'Historical Seismicity';
    _this.plotTraces = null;
    _this.showLayer = true;
    _this.sortByField = 'mag';
    _this.summary = null;
    _this.url = _getFeedUrl();
    _this.zoomToLayer = true;
  };

  /**
   * Create summary HTML.
   *
   * @return html {String}
   */
  _createSummary = function () {
    var html = _Earthquakes.createDescription();

    if (_this.count > 0) {
      html += _Earthquakes.createBinTable('prior');
      html += _Earthquakes.createSlider();
      html += _Earthquakes.createListTable('all');
    }

    return html;
  };

  /**
   * Get URL of JSON feed.
   *
   * @return {String}
   */
  _getFeedUrl = function () {
    var mainshock,
        urlParams;

    mainshock = _app.Features.getFeature('mainshock');
    urlParams = {
      endtime: Moment(mainshock.json.properties.time - 1000).utc()
        .toISOString().slice(0, -5),
      latitude: mainshock.json.geometry.coordinates[1],
      longitude: mainshock.json.geometry.coordinates[0],
      maxradiuskm: Number(AppUtil.getParam('hs-dist')),
      minmagnitude: Number(AppUtil.getParam('hs-mag')) - 0.05, // account for rounding to tenths
      starttime: Moment(mainshock.json.properties.time).utc()
        .subtract(AppUtil.getParam('hs-years'), 'years').toISOString()
        .slice(0, -5)
    };

    return Earthquakes.getFeedUrl(urlParams);
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;
    _Earthquakes = null;

    _createSummary = null;
    _getFeedUrl = null;

    _this = null;
  };

  /**
   * Initialize Feature (set properties that depend on external feed data).
   *
   * @param json {Object}
   *     feed data for Feature
   */
  _this.initFeature = function (json) {
    _Earthquakes = Earthquakes({
      app: _app,
      id: _this.id,
      json: json,
      sortByField: _this.sortByField
    });

    _this.bins = _Earthquakes.bins;
    _this.count = json.metadata.count;
    _this.description = _Earthquakes.createDescription();
    _this.list = _Earthquakes.list;
    _this.mapLayer = _Earthquakes.mapLayer;
    _this.plotTraces = _Earthquakes.plotTraces;
    _this.summary = _createSummary();
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Historical;
