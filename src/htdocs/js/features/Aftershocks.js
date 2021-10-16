/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
    Earthquakes = require('features/util/Earthquakes'),
    Luxon = require('luxon');


/**
 * Create Aftershocks Feature.
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
 *     forecast: {Array}
 *     id: {String}
 *     list: {Array}
 *     mapLayer: {L.Layer}
 *     model: {Object}
 *     name: {String}
 *     plotTraces: {Object}
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
      _forecast,
      _mainshock,
      _model,

      _createForecast,
      _createProbabilities,
      _createSummary,
      _getPercentage;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _mainshock = _app.Features.getFeature('mainshock');

    _this.id = 'aftershocks';
    _this.mapLayer = null;
    _this.name = 'Aftershocks';
    _this.plotTraces = null;
    _this.showLayer = true;
    _this.sortByField = 'utcTime';
    _this.summary = null;
    _this.zoomToLayer = true;
  };

  /**
   * Create aftershocks forecast HTML.
   *
   * @return html {String}
   */
  _createForecast = function () {
    var content,
        data,
        html,
        oaf;

    oaf = _mainshock.json.properties.products.oaf;
    html = '';

    if (oaf) { // forecast exists
      content = JSON.parse(oaf[0].contents[''].bytes);
      data = {
        probabilities: _createProbabilities(content),
      };

      // Store forecast and model to return as public props
      _forecast = content.forecast;
      _model = content.model;

      if (data.probabilities) {
        data.model = content.model.name;
        data.timeFrame = content.advisoryTimeFrame.toLowerCase().replace(/1\s+/, '');

        html = L.Util.template(
          '<h3>Aftershock Forecast</h3>' +
          '<p>The probability of one or more aftershocks in the specified ' +
            'magnitude range during the <strong>next {timeFrame}</strong>. ' +
            'The likely number of aftershocks (95% confidence range) is also ' +
            'included.</p>' +
          '<div class="probabilities">{probabilities}</div>' +
          '<p class="model"><strong>Model</strong>: {model}</p>',
          data
        );
      }
    }

    return html;
  };

  /**
   * Create aftershocks probability buttons HTML.
   *
   * @param oaf {Object}
   *
   * @return html {String}
   */
  _createProbabilities = function (oaf) {
    var data,
        eqid,
        html;

    eqid = AppUtil.getParam('eqid');
    data = {
      url: `https://earthquake.usgs.gov/earthquakes/eventpage/${eqid}/oaf/forecast`
    };
    html = '';

    oaf.forecast.forEach(period => {
      if (period.label === oaf.advisoryTimeFrame) { // 'primary emphasis' period
        period.bins.forEach(bin => {
          data.mag = bin.magnitude;
          data.probability = _getPercentage(bin.probability);
          data.range = bin.p95minimum  + '–' + bin.p95maximum;

          if (bin.p95minimum === 0 && bin.p95maximum === 0) {
            data.range = 0;
          }

          html += L.Util.template(
            '<a href="{url}">' +
              '<h4>M {mag}+</h4>' +
              '<ul>' +
                '<li class="probability">{probability}</li>' +
                '<li class="likely">' +
                  '<abbr title="Likely number of aftershocks">{range}</abbr>' +
                '</li>' +
              '</ul>' +
            '</a>',
            data
          );
        });
      }
    });

    return html;
  };

  /**
   * Create summary HTML.
   *
   * @return html {String}
   */
  _createSummary = function () {
    var duration,
        html,
        interval,
        mostRecentEq;

    html = '<div class="bubble">';
    html += _earthquakes.createDescription();

    if (_this.count > 0) {
      mostRecentEq = _earthquakes.list[_earthquakes.list.length - 1];
      interval = Luxon.Interval.fromDateTimes(
        Luxon.DateTime.fromISO(mostRecentEq.isoTime),
        Luxon.DateTime.utc()
      ).length('days');
      duration = AppUtil.round(interval, 1) + ' days';

      html += '<div class="bins">';
      html += _earthquakes.createBinTable('first');
      html += _earthquakes.createBinTable('past');
      html += '</div>';
      html += _createForecast();

      if (_this.count > 1) {
        html += '<h3>Most Recent Aftershock</h3>';
        html += `<p>The most recent aftershock was <strong>${duration} ago</strong>.</p>`;
        html += _earthquakes.createListTable('mostRecent');
      }

      html += _earthquakes.createSlider();
      html += _earthquakes.createListTable('all');
    }

    html += '</div>';

    return html;
  };

  /**
   * Get probability as a percentage string.
   *
   * @param probability {Number}
   *
   * @return percentage {String}
   */
  _getPercentage = function (probability) {
    var percentage;

    if (probability < 0.01) {
      percentage = '< 1%';
    } else if (probability > 0.99) {
      percentage = '> 99%';
    } else {
      percentage = AppUtil.round(100 * probability, 0) + '%';
    }

    return percentage;
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
    _this.count = json.metadata.count;
    _this.description = _earthquakes.createDescription();
    _this.list = _earthquakes.list;
    _this.mapLayer = _earthquakes.mapLayer;
    _this.plotTraces = _earthquakes.plotTraces;
    _this.summary = _createSummary();

    // The following props depend on summary being created first
    _this.forecast = _forecast;
    _this.model = _model;
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;
    _earthquakes = null;
    _forecast = null;
    _mainshock = null;
    _model = null;

    _createForecast = null;
    _createProbabilities = null;
    _createSummary = null;
    _getPercentage = null;

    _this = null;
  };

  /**
   * Set the JSON feed's URL.
   */
  _this.setFeedUrl = function () {
    var params,
        starttime,
        urlParams;

    starttime = Luxon.DateTime.fromMillis(_mainshock.json.properties.time + 1000)
      .toUTC().toISO().slice(0, -5);
    urlParams = {
      asDist: document.getElementById('as-dist').value,
      asMag: document.getElementById('as-mag').value
    };
    params = {
      latitude: _mainshock.json.geometry.coordinates[1],
      longitude: _mainshock.json.geometry.coordinates[0],
      maxradiuskm: Number(urlParams.asDist),
      minmagnitude: Number(urlParams.asMag) - 0.05, // account for rounding to tenths
      starttime: starttime
    };

    _this.url = Earthquakes.getFeedUrl(params);
  };

  /**
   * Reset to initial state.
   */
  _this.reset = function () {
    _this.mapLayer = null;
    _this.plotTraces = null;
    _this.summary = null;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Aftershocks;
