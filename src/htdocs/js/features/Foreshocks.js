'use strict';


var Earthquakes = require('features/util/Earthquakes'),
    Luxon = require('luxon');


/**
 * Create the Foreshocks Feature.
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
 *     reset: {Function}
 *     setFeedUrl: {Function}
 *     showLayer: {Boolean}
 *     sortByField: {String}
 *     summary: {String}
 *     url: {String}
 *     zoomToLayer: {Boolean}
 *   }
 */
var Foreshocks = function (options) {
  var _this,
      _initialize,

      _app,
      _earthquakes,

      _getSummary;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;

    Object.assign(_this, {
      id: 'foreshocks',
      mapLayer: null,
      name: 'Foreshocks',
      showLayer: true,
      sortByField: 'utcTime',
      summary: null,
      zoomToLayer: true
    });
  };

  /**
   * Get the HTML for the summary.
   *
   * @return html {String}
   */
  _getSummary = function () {
    var html = '<div class="bubble">';

    html += _earthquakes.description;

    if (_this.count > 0) {
      html += _earthquakes.getBinTable('prior');
      html += _earthquakes.getSlider();
      html += _earthquakes.getListTable('all');
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

    Object.assign(_this, {
      bins: _earthquakes.bins,
      count: _earthquakes.count,
      data: _earthquakes.data,
      description: _earthquakes.description,
      mapLayer: _earthquakes.mapLayer
    });

    _this.summary = _getSummary();
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;
    _earthquakes = null;

    _getSummary = null;

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
          fsDays: document.getElementById('fs-days').value,
          fsDist: document.getElementById('fs-dist').value,
          fsMag: document.getElementById('fs-mag').value
        },
        starttime = Luxon.DateTime.fromMillis(mainshock.json.properties.time)
          .toUTC().minus({ days: urlParams.fsDays }).toISO().slice(0, -5),
        params = {
          endtime: endtime,
          latitude: mainshock.data.lat,
          longitude: mainshock.data.lon,
          maxradiuskm: Number(urlParams.fsDist),
          minmagnitude: Number(urlParams.fsMag),
          starttime: starttime
        };

    _this.url = Earthquakes.getFeedUrl(params);
  };

  /**
   * Reset to initial state.
   */
  _this.reset = function () {
    Object.assign(_this, {
      mapLayer: null,
      summary: null
    });
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Foreshocks;
