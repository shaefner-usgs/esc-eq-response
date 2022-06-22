/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
    Luxon = require('luxon');


/**
 * Create the Forecast Feature, which is a sub-Feature of Aftershocks.
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

      _getItem,
      _getParameters,
      _getPercentage,
      _getProbabilities;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;

    Object.assign(_this, {
      html: '',
      id: 'forecast',
      name: 'Aftershocks Forecast',
      url: ''
    });
  };

  /**
   * Get an item for the probabilities list.
   *
   * @param data {Object}
   *
   * @return {String}
   */
  _getItem = function (data) {
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
   * Get the HTML for the parameters.
   *
   * @param json {Object}
   *
   * @return html {String}
   */
  _getParameters = function (json) {
    var html = '<h4>Parameters <a class="button">Show</a></h4>',
        params = json.model?.parameters;

    html += '<dl class="params alt hide">';

    Object.keys(params).forEach(key => {
      html += `<dt>${key}</dt><dd>${params[key]}</dd>`;
    });

    html += '</dl>';

    return html;
  };

  /**
   * Get the given probability as a percentage.
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

  /**
   * Get the HTML for the probabilities.
   *
   * @param json {Object}
   *
   * @return html {String}
   */
  _getProbabilities = function (json) {
    var period, range, state, visibility,
        eqid = AppUtil.getParam('eqid'),
        data = {
          url: `https://earthquake.usgs.gov/earthquakes/eventpage/${eqid}/oaf/forecast`
        },
        html = '',
        probabilities = '',
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

        probabilities += _getItem(data);
      });

      probabilities += '</ol></li>';
    });

    if (probabilities) {
      html += `<ul class="timeframe options">${timeframes}</ul>`;
      html += `<ul class="probabilities">${probabilities}</ul>`;
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
    var data = {
      parameters: _getParameters(json),
      probabilities: _getProbabilities(json),
    };

    Object.assign(_this, {
      forecast: json.forecast,
      model: json.model
    });

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

    _getItem = null;
    _getParameters = null;
    _getPercentage = null;
    _getProbabilities = null;

    _this = null;
  };

  /**
   * Set the JSON feed's URL.
   */
  _this.setFeedUrl = function () {
    var contents,
        mainshock = _app.Features.getFeature('mainshock'),
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
