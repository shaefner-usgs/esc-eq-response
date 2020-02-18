'use strict';


var AppUtil = require('AppUtil'),
    Earthquakes = require('features/util/Earthquakes');


/**
 * Create Aftershocks Feature
 *
 * @param options {Object}
 *   {
 *     app: {Object}, // Application
 *     eqid: {String} // Mainshock event id
 *   }
 *
 * @return _this {Object}
 *   {
 *     bins: {Object},
 *     cumulativeEqs: {Array},
 *     description: {String},
 *     destroy: {Function},
 *     forecast: {Array},
 *     id: {String},
 *     initFeature: {Function},
 *     mapLayer: {L.layer},
 *     model: {Object},
 *     name: {String},
 *     plotTraces: {Object},
 *     showLayer: {Boolean},
 *     summary: {String},
 *     title: {String},
 *     url: {String},
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

      _getFeedUrl,
      _getProbabilities,
      _getSummary;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _eqid = options.eqid;
    _mainshock = _app.Features.getFeature('mainshock');

    _this.id = 'aftershocks';
    _this.name = 'Aftershocks';
    _this.showLayer = true;
    _this.url = _getFeedUrl();
    _this.zoomToLayer = true;
  };

  /**
   * Get URL of json feed
   *
   * @return {String}
   */
  _getFeedUrl = function () {
    var urlParams;

    urlParams = {
      latitude: _mainshock.json.geometry.coordinates[1],
      longitude: _mainshock.json.geometry.coordinates[0],
      maxradiuskm: Number(AppUtil.getParam('as-dist')),
      minmagnitude: Number(AppUtil.getParam('as-mag')) - 0.05, // account for rounding to tenths
      starttime: AppUtil.Moment(_mainshock.json.properties.time + 1000)
        .utc().toISOString().slice(0, -5)
    };

    return Earthquakes.getFeedUrl(urlParams);
  };

  /**
   * Get aftershock probabilities HTML
   *
   * @return html {String}
   */
  _getProbabilities = function () {
    var data,
        html,
        oaf,
        probability,
        range,
        timeFrame,
        url;

    html = '';
    oaf = _mainshock.json.properties.products.oaf;
    url = 'https://earthquake.usgs.gov/earthquakes/eventpage/' + _eqid + '/oaf/forecast';

    if (oaf) { // add forecast to html output
      data = JSON.parse(oaf[0].contents[''].bytes);

      // Store forecast and model to attach as returned (public) props
      _forecast = data.forecast;
      _model = data.model;

      data.forecast.forEach(function(period) {
        if (period.label === data.advisoryTimeFrame) { // show 'primary emphasis' period
          period.bins.forEach(function(bin) {
            if (bin.probability < 0.01) {
              probability = '&lt; 1%';
            } else if (bin.probability > 0.99) {
              probability = '&gt; 99%';
            } else {
              probability = AppUtil.round(100 * bin.probability, 0) + '%';
            }
            if (bin.p95minimum === 0 && bin.p95maximum === 0) {
              range = 0;
            } else {
              range = bin.p95minimum  + '&ndash;' + bin.p95maximum;
            }
            html += '<a href="' + url + '"><h4>M ' + bin.magnitude + '+</h4>' +
              '<ul>' +
                '<li class="probability">' + probability + '</li>' +
                '<li class="likely"><abbr title="Likely number of ' +
                  'aftershocks">' + range + '</abbr></li>' +
              '</ul></a>';
          });
        }
      });
    }

    if (html) { // add explanatory text to html output
      timeFrame = data.advisoryTimeFrame.toLowerCase().replace(/1\s+/, '');
      html = '<h3>Aftershock Forecast</h3>' +
        '<p>The probability of one or more aftershocks in the specified ' +
          'magnitude range during the <strong>next ' + timeFrame +
          '</strong>. The likely number of aftershocks (95% confidence ' +
          'range) is also included.</p>' +
        '<div class="probabilities">' + html + '</div>' +
        '<p class="model"><strong>Model</strong>: ' + data.model.name + '</p>';
    }

    return html;
  };

  /**
   * Get summary HTML
   *
   * @param json {Object}
   *
   * @return summary {String}
   */
  _getSummary = function (json) {
    var count,
        duration,
        mostRecentEq,
        mostRecentEqTime,
        summary;

    count = json.metadata.count;
    summary = _Earthquakes.getDescription();

    if (count > 0) {
      mostRecentEq = _Earthquakes.list[_Earthquakes.list.length - 1];
      mostRecentEqTime = mostRecentEq.isoTime;

      duration = AppUtil.round(
        AppUtil.Moment.duration(
          AppUtil.Moment.utc() -
          AppUtil.Moment.utc(mostRecentEqTime)
        ).asDays(), 1
      ) + ' days';

      summary += '<div class="bins">';
      summary += _Earthquakes.getBinnedTable('first');
      summary += _Earthquakes.getBinnedTable('past');
      summary += '</div>';
      summary += _getProbabilities();
      if (count > 1) {
        summary += '<h3>Most Recent Aftershock</h3>';
        summary += '<p>The most recent aftershock was <strong>' + duration +
          ' ago</strong>.';
        summary += _Earthquakes.getListTable([mostRecentEq]); // expects array
      }
      summary += _Earthquakes.getSubHeader();
      summary += _Earthquakes.getSlider();
      summary += _Earthquakes.getListTable(_Earthquakes.list, _Earthquakes.range.initial);
    }

    return summary;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Destroy this Class to aid in garbage collection
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;
    _eqid = null;
    _forecast = null;
    _mainshock = null;
    _model = null;
    _Earthquakes = null;

    _getFeedUrl = null;
    _getProbabilities = null;
    _getSummary = null;

    _this = null;
  };

  /**
   * Init Feature (set properties that depend on external feed data)
   *
   * @param json {Object}
   *     feed data for Feature
   */
  _this.initFeature = function (json) {
    _Earthquakes = Earthquakes({
      app: _app,
      id: _this.id,
      json: json
    });

    _this.bins = {};
    if (_Earthquakes.bins.first) {
      _this.bins.first = _Earthquakes.bins.first;
      _this.bins.past = _Earthquakes.bins.past;
    }
    _this.cumulativeEqs = _Earthquakes.bins.cumulative; // for eq mag filters on summary
    _this.description = _Earthquakes.getDescription();
    _this.mapLayer = _Earthquakes.mapLayer;
    _this.plotTraces = _Earthquakes.plotTraces;
    _this.summary = _getSummary(json);
    _this.title = _this.name + ' (' + json.metadata.count + ')';

    // The following props depend on summary being set
    _this.forecast = _forecast;
    _this.model = _model;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Aftershocks;
