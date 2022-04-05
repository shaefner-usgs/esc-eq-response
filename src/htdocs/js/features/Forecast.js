/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
    Luxon = require('luxon');


/**
 * Create the Forecast for Aftershocks Feature.
 *
 * @param options {Object}
 *   {
 *     app: {Object} Application
 *   }
 *
 * @return _this {Object}
 *   {
 *     create: {Function}
 *     destroy: {Function}
 *     forecast: {Array}
 *     html: {String}
 *     id: {String}
 *     model: {Object}
 *     name: {String)
 *     setFeedUrl: {Function}
 *     url: {String}
 *   }
 */
var Forecast = function (options) {
  var _this,
      _initialize,

      _app,

      _createItem,
      _createParameters,
      _createProbabilities,
      _getPercentage;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;

    _this.html = '';
    _this.id = 'forecast';
    _this.name = 'Aftershocks Forecast';
    _this.url = '';
  };

  /**
   * Create an item for the probabilities list.
   *
   * @param data {Object}
   *
   * @return {String}
   */
  _createItem = function (data) {
    return L.Util.template(
      '<li>' +
        '<a href="{url}" target="new">' +
          '<h4>M {mag}+</h4>' +
          '<ul>' +
            '<li class="probability">{probability}</li>' +
            '<li class="likely">' +
              '<abbr title="Likely number of aftershocks">{range}</abbr>' +
            '</li>' +
          '</ul>' +
        '</a>' +
      '</li>',
      data
    );
  };

  /**
   * Create the HTML for the parameters.
   *
   * @param json {Object}
   *
   * @return html {String}
   */
  _createParameters = function (json) {
    var html,
        params;

    html = '<h4>Parameters <a class="button">Show</a></h4>';
    params = json.model?.parameters;

    html += '<dl class="params alt hide">';

    Object.keys(params).forEach(key => {
      html += `<dt>${key}</dt><dd>${params[key]}</dd>`;
    });

    html += '</dl>';

    return html;
  };

  /**
   * Create the HTML for the probabilities.
   *
   * @param json {Object}
   *
   * @return html {String}
   */
  _createProbabilities = function (json) {
    var data,
        eqid,
        html,
        period,
        probabilities,
        range,
        state,
        timeframes,
        visibility;

    eqid = AppUtil.getParam('eqid');
    data = {
      url: `https://earthquake.usgs.gov/earthquakes/eventpage/${eqid}/oaf/forecast`
    };
    html = '';
    probabilities = '';
    timeframes = '';

    json.forecast.forEach(timeframe => {
      period = timeframe.label.replace(/1\s+/, '');
      state = '';
      visibility = 'hide'; // default

      if (timeframe.label === json.advisoryTimeFrame) {
        state = 'selected';
        visibility = ''; // show
      }

      probabilities += `<li class="next${period} option ${visibility}"><ol>`;
      timeframes += `<li id="next${period}" class="${state}">${timeframe.label}</li>`;

      timeframe.bins.forEach(bin => {
        range = bin.p95minimum;
        if (bin.p95maximum !== 0) {
          range += '–' + bin.p95maximum;
        }

        Object.assign(data, {
          mag: bin.magnitude,
          probability: _getPercentage(bin.probability),
          range: range
        });

        probabilities += _createItem(data);
      });

      probabilities += '</ol></li>';
    });

    if (probabilities) {
      html += `<ul class="timeframe options">${timeframes}</ul>`;
      html += `<ul class="probabilities">${probabilities}</ul>`;
    }

    return html;
  };

  /**
   * Get the probability as a percentage.
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
    var data = {
      parameters: _createParameters(json),
      probabilities: _createProbabilities(json),
    };

    _this.forecast = json.forecast;
    _this.model = json.model;

    if (data.probabilities) {
      data.model = json.model.name;
      data.timeStart = Luxon.DateTime.fromMillis(json.forecast[0].timeStart)
        .toUTC().toFormat("ccc, LLL d, yyyy 'at' T"); // eslint-disable-line

      _this.html = L.Util.template(
        '<div class="forecast">' +
          '<h3>Forecast</h3>' +
          '<p>Probability of one or more aftershocks in the specified time ' +
            'frame and magnitude range starting on {timeStart} UTC. The ' +
            'likely number of aftershocks (95% confidence range) is listed  ' +
            'below the probability.</p>' +
          '{probabilities}' +
          '{parameters}' +
          '<p><strong>Model</strong>: {model}</p>' +
        '</div>',
        data
      );
    }
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;

    _createProbabilities = null;
    _createParameters = null;
    _getPercentage = null;

    _this = null;
  };

  /**
   * Set the JSON feed's URL.
   */
  _this.setFeedUrl = function () {
    var contents,
        mainshock,
        products;

    mainshock = _app.Features.getFeature('mainshock');
    products = mainshock.json.properties.products;

    if (products.oaf) {
      contents = products.oaf[0].contents;

      if (contents['forecast.json']) {
        _this.url = contents['forecast.json'].url;
      }
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Forecast;
