/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
    Earthquakes = require('features/util/earthquakes/Earthquakes'),
    Luxon = require('luxon'),
    Plots = require('features/util/earthquakes/Plots'),
    Summary = require('features/util/earthquakes/Summary');


var _DEFAULTS = {
  isRefreshing: false
};


/**
 * Create the Aftershocks Feature.
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *       isRefreshing: {Boolean} optional
 *     }
 *
 * @return _this {Object}
 *     {
 *       add: {Function}
 *       content: {String}
 *       count: {Integer}
 *       data: {Object}
 *       description: {String}
 *       destroy: {Function}
 *       id: {String}
 *       mapLayer: {L.GeoJSON}
 *       name: {String}
 *       params: {Object}
 *       placeholder: {String}
 *       plots: {Object}
 *       remove: {Function}
 *       render: {Function}
 *       showLayer: {Boolean}
 *       summary: {Object}
 *       type: {String}
 *       url: {String}
 *       zoomToLayer: {Boolean}
 *     }
 */
var Aftershocks = function (options) {
  var _this,
      _initialize,

      _app,
      _earthquakes,
      _mainshock,

      _addData,
      _addForecast,
      _addListeners,
      _destroy,
      _fetch,
      _getDescription,
      _getDuration,
      _getPlaceholder,
      _getUrl,
      _removeListeners;


  _this = {};

  _initialize = function (options = {}) {
    var catalog = AppUtil.getParam('catalog'),
        now = Luxon.DateTime.now();

    options = Object.assign({}, _DEFAULTS, options);

    _app = options.app;
    _mainshock = _app.Features.getMainshock();

    _this.params = {
      distance: Number(document.getElementById('as-distance').value),
      duration: _getDuration(now),
      magnitude: Number(document.getElementById('as-magnitude').value),
      now: now
    };
    _this.content = '';
    _this.count = 0;
    _this.data = {};
    _this.description = _getDescription(catalog);
    _this.id = 'aftershocks';
    _this.mapLayer = L.geoJSON();
    _this.name = 'Aftershocks';
    _this.placeholder = _getPlaceholder();
    _this.plots = {};
    _this.showLayer = true;
    _this.summary = {};
    _this.type = _this.id;
    _this.url = _getUrl();
    _this.zoomToLayer = true;

    if (catalog === 'dd') {
      _this.id = 'dd-aftershocks';
    }

    if (options.isRefreshing) {
      _fetch();
    }
  };

  /**
   * Add the JSON data and set properties that depend on it.
   *
   * @param json {Object}
   */
  _addData = function (json) {
    _earthquakes.addData(json);

    _this.count = _earthquakes.data.eqs.length;
    _this.data = _earthquakes.data;
    _this.mapLayer = _earthquakes.mapLayer;
    _this.plots = Plots({
      app: _app,
      feature: _this
    });
    _this.summary = Summary({
      app: _app,
      feature: _this
    });
    _this.content = _this.summary.getContent();
  };

  /**
   * Add the Forecast sub-Feature (i.e. preserve it when re-rendering).
   */
  _addForecast = function () {
    var forecast = _app.Features.getFeature('forecast');

    if (forecast.content) {
      forecast.render();
    }
  };

  /**
   * Add event listeners.
   */
  _addListeners = function () {
    _earthquakes.addListeners();
    _this.plots.addListeners();
    _this.summary.addListeners();
  };

  /**
   * Destroy this Feature's sub-Classes.
   */
  _destroy = function () {
    _earthquakes?.destroy();

    if (!AppUtil.isEmpty(_this.plots)) {
      _this.plots.destroy();
    }
    if (!AppUtil.isEmpty(_this.summary)) {
      _this.summary.destroy();
    }
  };

  /**
   * Fetch the feed data.
   */
  _fetch = function () {
    _earthquakes = Earthquakes({
      app: _app,
      feature: _this
    });
  };

  /**
   * Get the Feature's description.
   *
   * @param catalog {String}
   *
   * @return {String}
   */
  _getDescription = function (catalog) {
    var data, kind;

    if (catalog === 'dd') {
      kind = 'double-difference';
    }

    data = {
      distance: _this.params.distance,
      duration: _this.params.duration,
      kind: kind || '',
      mag: _this.params.magnitude
    };

    return L.Util.template(
      '<strong>M {mag}+</strong> {kind} earthquakes within ' +
      '<strong>{distance} km</strong> of the mainshock’s epicenter. The ' +
      'duration of the aftershock sequence is <strong>{duration} days</strong>.',
      data
    );
  };

  /**
   * Get the duration (i.e. number of days) of the aftershocks sequence.
   *
   * @param now {Object}
   *
   * @return {Number}
   */
  _getDuration = function (now) {
    var interval = Luxon.Interval
      .fromDateTimes(_mainshock.data.eq.datetime, now)
      .length('days');

    return Number(AppUtil.round(interval, 1));
  };

  /**
   * Get the placeholder HTML.
   *
   * @return {String}
   */
  _getPlaceholder = function () {
    return '' +
      '<div class="bubble content">' +
        `<p class="description">${_this.description}</p>` +
      '</div>' +
      '<div class="forecast feature content bubble hide"></div>';
  };

  /**
   * Get the JSON feed's URL.
   *
   * @return {String}
   */
  _getUrl = function () {
    var coords = _mainshock.data.eq.coords,
        starttime = _mainshock.data.eq.datetime.plus({ seconds: 1 })
          .toUTC().toISO().slice(0, -5);

    return Earthquakes.getUrl({
      latitude: coords[1],
      longitude: coords[0],
      maxradiuskm: _this.params.distance,
      minmagnitude: _this.params.magnitude,
      starttime: starttime
    });
  };

  /**
   * Remove event listeners.
   */
  _removeListeners = function () {
    _earthquakes?.removeListeners();

    if (!AppUtil.isEmpty(_this.plots)) {
      _this.plots.removeListeners();
    }
    if (!AppUtil.isEmpty(_this.summary)) {
      _this.summary.removeListeners();
    }
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add the Feature.
   */
  _this.add = function () {
    _app.MapPane.addFeature(_this);
    _app.SummaryPane.addFeature(_this);

    if (!_this.isRefreshing) {
      _app.PlotsPane.addFeature(_this);
    }

    if (!_earthquakes) { // only fetch once
      _fetch();
    }
  };

  /**
   * Destroy this Class.
   */
  _this.destroy = function () {
    _destroy();

    _initialize = null;

    _app = null;
    _earthquakes = null;
    _mainshock = null;

    _addData = null;
    _addForecast = null;
    _addListeners = null;
    _destroy = null;
    _fetch = null;
    _getDescription = null;
    _getDuration = null;
    _getPlaceholder = null;
    _getUrl = null;
    _removeListeners = null;

    _this = null;
  };

  /**
   * Remove the Feature.
   */
  _this.remove = function () {
    _removeListeners();
    _app.MapPane.removeFeature(_this);
    _app.SummaryPane.removeFeature(_this);
    _app.SettingsBar.setStatus(_this, 'disabled');

    if (!_this.isRefreshing) {
      _app.PlotsPane.removeFeature(_this);
    }
  };

  /**
   * Render the Feature.
   *
   * @param json {Object} optional; default is {}
   */
  _this.render = function (json = {}) {
    if (AppUtil.isEmpty(_this.data)) { // initial render
      _addData(json);
    } else {
      _this.content = _this.summary.getContent();
    }

    _app.MapPane.addContent(_this);
    _app.PlotsPane.addContent(_this);
    _app.SummaryPane.addContent(_this);
    _app.SettingsBar.setStatus(_this, 'enabled');
    _app.SettingsBar.updateTimeStamp(_this);
    _addForecast();
    _addListeners();

    if (AppUtil.getParam('as-refresh')) {
      _app.SettingsBar.setInterval('as-refresh'); // enable auto-refresh
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Aftershocks;
