'use strict';


var AppUtil = require('util/AppUtil'),
    Earthquakes = require('features/util/Earthquakes'),
    Luxon = require('luxon');


/**
 * Create the Aftershocks Feature.
 *
 * @param options {Object}
 *   {
 *     app: {Object} Application
 *   }
 *
 * @return _this {Object}
 *   {
 *     addListeners: {Function}
 *     bins: {Object}
 *     count: {Integer}
 *     create: {Function}
 *     data: {Array}
 *     dependencies: {Array}
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
var Aftershocks = function (options) {
  var _this,
      _initialize,

      _app,
      _earthquakes,

      _createSummary,
      _toggleParams;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;

    _this.dependencies = [
      'forecast'
    ];
    _this.id = 'aftershocks';
    _this.mapLayer = null;
    _this.name = 'Aftershocks';
    _this.plots = null;
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
    var duration, interval, mostRecentEq,
        html = '<div class="bubble">';

    html += _earthquakes.createDescription();

    if (_this.count > 0) {
      html += '<div class="bins">';
      html += _earthquakes.createBinTable('first');
      html += _earthquakes.createBinTable('past');
      html += '</div>';
    }

    html += _app.Features.getFeature('forecast').html;

    if (_this.count > 1) {
      mostRecentEq = _earthquakes.data[_earthquakes.data.length - 1];
      interval = Luxon.Interval.fromDateTimes(
        Luxon.DateTime.fromISO(mostRecentEq.isoTime),
        Luxon.DateTime.utc()
      ).length('days');
      duration = AppUtil.round(interval, 1) + ' days';

      html += '<h3>Most Recent Aftershock</h3>';
      html += `<p>The most recent aftershock was <strong>${duration} ago</strong>.</p>`;
      html += _earthquakes.createListTable('mostRecent');
    }

    if (_this.count > 0) {
      html += _earthquakes.createSlider();
      html += _earthquakes.createListTable('all');
    }

    html += '</div>';

    return html;
  };

  /**
   * Toggle the visibility of the Aftershock forecast parameters.
   *
   * @param el {Element}
   */
  _toggleParams = function (el) {
    var params = document.querySelector('#summaryPane .params');

    el.classList.toggle('selected');
    params.classList.toggle('hide');
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add event listeners.
   */
  _this.addListeners = function () {
    var el = document.querySelector('#summaryPane .aftershocks'),
        buttons = el.querySelectorAll('.timeframe li'),
        toggle = el.querySelector('a.button');

    // Set the selected option on the 'radio-bar'
    buttons.forEach(button =>
      button.addEventListener('click', _app.setOption)
    );

    if (toggle) {
      toggle.addEventListener('click', (e) => {
        e.preventDefault();
        _toggleParams(toggle);
      });
    }
  };

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
    _toggleParams = null;

    _this = null;
  };

  /**
   * Reset to initial state.
   */
  _this.reset = function () {
    _this.mapLayer = null;
    _this.plots = null;
    _this.summary = null;
  };

  /**
   * Set the JSON feed's URL.
   */
  _this.setFeedUrl = function () {
    var mainshock = _app.Features.getFeature('mainshock'),
        starttime = Luxon.DateTime.fromMillis(mainshock.json.properties.time + 1000)
          .toUTC().toISO().slice(0, -5),
        urlParams = {
          asDist: document.getElementById('as-dist').value,
          asMag: document.getElementById('as-mag').value
        },
        params = {
          latitude: mainshock.data.lat,
          longitude: mainshock.data.lon,
          maxradiuskm: Number(urlParams.asDist),
          minmagnitude: Number(urlParams.asMag),
          starttime: starttime
        };

    _this.url = Earthquakes.getFeedUrl(params);
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Aftershocks;
