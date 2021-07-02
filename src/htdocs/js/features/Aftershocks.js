/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
    Earthquakes = require('features/util/Earthquakes'),
    Moment = require('moment');


/**
 * Create Aftershocks Feature.
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
 *     forecast: {Array}
 *     id: {String}
 *     initFeature: {Function}
 *     list: {Array}
 *     mapLayer: {L.Layer}
 *     model: {Object}
 *     name: {String}
 *     plotTraces: {Object}
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
      _eqid,
      _forecast,
      _mainshock,
      _model,
      _Earthquakes,

      _createForecast,
      _createProbabilities,
      _createSummary,
      _getFeedUrl,
      _getProbability;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _eqid = options.eqid;
    _mainshock = _app.Features.getFeature('mainshock');

    _this.id = 'aftershocks';
    _this.mapLayer = null;
    _this.name = 'Aftershocks';
    _this.plotTraces = null;
    _this.showLayer = true;
    _this.sortByField = 'utcTime';
    _this.summary = null;
    _this.url = _getFeedUrl();
    _this.zoomToLayer = true;
  };

  /**
   * Create forecast HTML.
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
            'magnitude range during the <strong>next {timeFrame}</strong>.' +
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
   * Create probability buttons HTML.
   *
   * @param oaf {Object}
   *
   * @return html {String}
   */
  _createProbabilities = function (oaf) {
    var data,
        html;

    data = {
      url: 'https://earthquake.usgs.gov/earthquakes/eventpage/' + _eqid + '/oaf/forecast'
    };
    html = '';

    oaf.forecast.forEach(period => {
      if (period.label === oaf.advisoryTimeFrame) { // 'primary emphasis' period
        period.bins.forEach(bin => {
          data.mag = bin.magnitude;
          data.probability = _getProbability(bin.probability);
          data.range = bin.p95minimum  + '&ndash;' + bin.p95maximum;

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
        mostRecentEq;

    html = _Earthquakes.createDescription();

    if (_this.count > 0) {
      mostRecentEq = _Earthquakes.list[_Earthquakes.list.length - 1];
      duration = AppUtil.round(
        Moment.duration(
          Moment.utc() -
          Moment.utc(mostRecentEq.isoTime)
        ).asDays(), 1
      ) + ' days';

      html += '<div class="bins">';
      html += _Earthquakes.createBinTable('first');
      html += _Earthquakes.createBinTable('past');
      html += '</div>';
      html += _createForecast();

      if (_this.count > 1) {
        html += '<h3>Most Recent Aftershock</h3>';
        html += '<p>The most recent aftershock was <strong>' + duration +
          ' ago</strong>.</p>';
        html += _Earthquakes.createListTable('mostRecent');
      }

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
    var urlParams = {
      latitude: _mainshock.json.geometry.coordinates[1],
      longitude: _mainshock.json.geometry.coordinates[0],
      maxradiuskm: Number(AppUtil.getParam('as-dist')),
      minmagnitude: Number(AppUtil.getParam('as-mag')) - 0.05, // account for rounding to tenths
      starttime: Moment(_mainshock.json.properties.time + 1000)
        .utc().toISOString().slice(0, -5)
    };

    return Earthquakes.getFeedUrl(urlParams);
  };

  /**
   * Get probability as a percentage string.
   *
   * @param probability {Number}
   *
   * @return percentage {String}
   */
  _getProbability = function (probability) {
    var percentage;

    if (probability < 0.01) {
      percentage = '&lt; 1%';
    } else if (probability > 0.99) {
      percentage = '&gt; 99%';
    } else {
      percentage = AppUtil.round(100 * probability, 0) + '%';
    }

    return percentage;
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
    _eqid = null;
    _forecast = null;
    _mainshock = null;
    _model = null;
    _Earthquakes = null;

    _createForecast = null;
    _createProbabilities = null;
    _createSummary = null;
    _getFeedUrl = null;
    _getProbability = null;

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

    // The following props depend on summary being created
    _this.forecast = _forecast;
    _this.model = _model;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Aftershocks;
