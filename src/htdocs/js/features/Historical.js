'use strict';


var Earthquakes = require('features/util/Earthquakes'),
    Luxon = require('luxon');


/**
 * Create the Historical Seismicity Feature.
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
 *     data: {Array}
 *     description: {String}
 *     destroy: {Function}
 *     id: {String}
 *     mapLayer: {L.Layer}
 *     name: {String}
 *     plots: {Object}
 *     reset: {Function}
 *     setFeedUrl: {Function}
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
      _earthquakes,

      _createSummary;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;

    _this.id = 'historical';
    _this.mapLayer = null;
    _this.name = 'Historical Seismicity';
    _this.plots = null;
    _this.showLayer = true;
    _this.sortByField = 'mag';
    _this.summary = null;
    _this.zoomToLayer = true;
  };

  /**
   * Create summary HTML.
   *
   * @return html {String}
   */
  _createSummary = function () {
    var html = '<div class="bubble">';

    html += _earthquakes.createDescription();

    if (_this.count > 0) {
      html += _earthquakes.createBinTable('prior');
      html += _earthquakes.createSlider();
      html += _earthquakes.createListTable('all');
    }

    html += '</div>';

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
    _earthquakes = Earthquakes({
      app: _app,
      id: _this.id,
      json: json,
      sortByField: _this.sortByField
    });

    _this.bins = _earthquakes.bins;
    _this.count = _earthquakes.count;
    _this.data = _earthquakes.data;
    _this.description = _earthquakes.createDescription();
    _this.mapLayer = _earthquakes.mapLayer;
    _this.plots = _earthquakes.plots;
    _this.summary = _createSummary();
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;
    _earthquakes = null;

    _createSummary = null;

    _this = null;
  };

  /**
   * Set the JSON feed's URL.
   */
  _this.setFeedUrl = function () {
    var mainshock = _app.Features.getFeature('mainshock'),
        endtime = Luxon.DateTime.fromMillis(mainshock.json.properties.time - 1000)
          .toUTC().toISO().slice(0, -5),
        urlParams = {
          hsDist: document.getElementById('hs-dist').value,
          hsMag: document.getElementById('hs-mag').value,
          hsYears: document.getElementById('hs-years').value
        },
        starttime = Luxon.DateTime.fromMillis(mainshock.json.properties.time)
          .toUTC().minus({ years: urlParams.hsYears }).toISO().slice(0, -5),
        params = {
          endtime: endtime,
          latitude: mainshock.data.lat,
          longitude: mainshock.data.lon,
          maxradiuskm: Number(urlParams.hsDist),
          minmagnitude: Number(urlParams.hsMag),
          starttime: starttime
        };

    _this.url = Earthquakes.getFeedUrl(params);
  };

  /**
   * Reset to initial state.
   */
  _this.reset = function () {
    _this.mapLayer = null;
    _this.plots = null;
    _this.summary = null;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Historical;
