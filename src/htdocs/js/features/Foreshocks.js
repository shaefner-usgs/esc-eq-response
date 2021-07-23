'use strict';


var AppUtil = require('util/AppUtil'),
    Earthquakes = require('features/util/Earthquakes'),
    Moment = require('moment');


/**
 * Create Foreshocks Feature.
 *
 * @param options {Object}
 *   {
 *     app: {Object} Application
 *   }
 *
 * @return _this {Object}
 *   {
 *     bins: {Object}
 *     count: {Integer}
 *     create: {Function}
 *     description: {String}
 *     destroy: {Function}
 *     getFeedUrl: {Function}
 *     id: {String}
 *     list: {Array}
 *     mapLayer: {L.Layer}
 *     name: {String}
 *     reset: {Function}
 *     showLayer: {Boolean}
 *     sortByField: {String}
 *     summary: {String}
 *     zoomToLayer: {Boolean}
 *   }
 */
var Foreshocks = function (options) {
  var _this,
      _initialize,

      _app,
      _Earthquakes,

      _createSummary;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;

    _this.id = 'foreshocks';
    _this.mapLayer = null;
    _this.name = 'Foreshocks';
    _this.showLayer = true;
    _this.sortByField = 'utcTime';
    _this.summary = null;
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

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Create Feature (set properties that depend on external feed data).
   *
   * @param json {Object}
   *     feed data for Feature
   */
  _this.create = function (json) {
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
    _this.summary = _createSummary();
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;
    _Earthquakes = null;

    _createSummary = null;

    _this = null;
  };

  /**
   * Get the JSON feed's URL.
   *
   * @return {String}
   */
  _this.getFeedUrl = function () {
    var mainshock,
        urlParams;

    mainshock = _app.Features.getFeature('mainshock');
    urlParams = {
      endtime: Moment(mainshock.json.properties.time - 1000).utc().toISOString()
        .slice(0, -5),
      latitude: mainshock.json.geometry.coordinates[1],
      longitude: mainshock.json.geometry.coordinates[0],
      maxradiuskm: Number(AppUtil.getParam('fs-dist')),
      minmagnitude: Number(AppUtil.getParam('fs-mag')) - 0.05, // account for rounding to tenths
      starttime: Moment(mainshock.json.properties.time).utc()
        .subtract(AppUtil.getParam('fs-days'), 'days').toISOString()
        .slice(0, -5)
    };

    return Earthquakes.getFeedUrl(urlParams);
  };

  /**
   * Reset to initial state.
   */
  _this.reset = function () {
    _this.mapLayer = null;
    _this.summary = null;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Foreshocks;
