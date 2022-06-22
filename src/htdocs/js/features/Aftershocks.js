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

      _getSummary,
      _toggleParams;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;

    Object.assign(_this, {
      dependencies: [
        'forecast'
      ],
      id: 'aftershocks',
      mapLayer: null,
      name: 'Aftershocks',
      plots: null,
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
    var duration, interval, mostRecentEq,
        html = '<div class="bubble">';

    html += _earthquakes.description;

    if (_earthquakes.count > 0) {
      html += '<div class="bins">';
      html += _earthquakes.getBinTable('first');
      html += _earthquakes.getBinTable('past');
      html += '</div>';
    }

    html += _app.Features.getFeature('forecast').html;

    if (_earthquakes.count > 1) {
      mostRecentEq = _earthquakes.data[_earthquakes.data.length - 1];
      interval = Luxon.Interval.fromDateTimes(
        Luxon.DateTime.fromISO(mostRecentEq.isoTime),
        Luxon.DateTime.utc()
      ).length('days');
      duration = AppUtil.round(interval, 1) + ' days';

      html += '<h3>Most Recent Aftershock</h3>';
      html += `<p>The most recent aftershock was <strong>${duration} ago</strong>.</p>`;
      html += _earthquakes.getListTable('mostRecent');
    }

    if (_earthquakes.count > 0) {
      html += _earthquakes.getSlider();
      html += _earthquakes.getListTable('all');
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

    Object.assign(_this, {
      bins: _earthquakes.bins,
      count: _earthquakes.count,
      data: _earthquakes.data,
      description: _earthquakes.description,
      mapLayer: _earthquakes.mapLayer,
      plots: _earthquakes.plots,
      summary: _getSummary()
    });
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;
    _earthquakes = null;

    _getSummary = null;
    _toggleParams = null;

    _this = null;
  };

  /**
   * Reset to initial state.
   */
  _this.reset = function () {
    Object.assign(_this, {
      mapLayer: null,
      plots: null,
      summary: null
    });
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
