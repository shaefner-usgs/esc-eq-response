/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
    Luxon = require('luxon');


/**
 * Create the Forecast Feature, a sub-Feature of Aftershocks.
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *     }
 *
 * @return _this {Object}
 *     {
 *       addData: {Function}
 *       addListeners: {Function}
 *       dependencies: {Array}
 *       destroy: {Function}
 *       forecast: {Array}
 *       id: {String}
 *       model: {Object}
 *       name: {String)
 *       removeListeners: {Function}
 *       summary: {String}
 *       url: {String}
 *     }
 */
var Forecast = function (options) {
  var _this,
      _initialize,

      _app,

      _fetch,
      _getItem,
      _getList,
      _getParameters,
      _getPercentage,
      _getProbabilities,
      _getSummary,
      _getUrl,
      _toggleParams;


  _this = {};

  _initialize = function (options = {}) {
    var dependency = 'aftershocks';

    if (AppUtil.getParam('catalog') === 'dd') {
      dependency = 'dd-aftershocks';
    }

    _app = options.app;

    _this.id = 'forecast';
    _this.dependencies = [dependency];
    _this.forecast = [];
    _this.model = {};
    _this.name = 'Forecast';
    _this.summary = '';
    _this.url = _getUrl();

    _fetch();
  };

  /**
   * Fetch the feed data.
   */
  _fetch = function () {
    if (_this.url) {
      L.geoJSON.async(_this.url, {
        app: _app,
        feature: _this
      });
    }
  };

  /**
   * Get the HTML <li> for the given probability data.
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
   * Get the HTML content for the probabilities list in the given timeframe.
   *
   * @param timeframe {Object}
   *
   * @return html {String}
   */
  _getList = function (timeframe) {
    var eqid = AppUtil.getParam('eqid'),
        data = {
          url: `https://earthquake.usgs.gov/earthquakes/eventpage/${eqid}/oaf/forecast`
        },
        html = '<ol>';

    timeframe.bins.forEach(bin => {
      var range = bin.p95minimum;

      if (bin.p95maximum !== 0) {
        range += '–' + bin.p95maximum;
      }

      Object.assign(data, {
        mag: bin.magnitude,
        probability: _getPercentage(bin.probability),
        range: range
      });

      html += _getItem(data);
    });

    html += '</ol>';

    return html;
  };

  /**
   * Get the HTML content for the parameters list.
   *
   * @param json {Object}
   *
   * @return html {String}
   */
  _getParameters = function (json) {
    var html = '<h4>Parameters <a class="toggle button">Show</a></h4>',
        params = json.model?.parameters;

    html += '<dl class="props alt hide">';

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
   * Get the HTML content for the list of probabilities and its 'radio-bar'.
   *
   * @param json {Object}
   *
   * @return html {String}
   */
  _getProbabilities = function (json) {
    var html = '',
        nav = '',
        probabilities = '';

    json.forecast.forEach(timeframe => {
      var hide = 'hide',
          period = timeframe.label.replace(/1\s+/, ''),
          selected = '';

      if (timeframe.label === json.advisoryTimeFrame) {
        hide = ''; // show
        selected = 'selected';
      }

      nav += `<li id="next${period}" class="${selected}">${timeframe.label}</li>`;
      probabilities += `<li class="next${period} option ${hide}">`;
      probabilities += _getList(timeframe);
      probabilities += '</li>';
    });

    if (probabilities) {
      html += `<ul class="timeframe options">${nav}</ul>`;
      html += `<ul class="probabilities">${probabilities}</ul>`;
    }

    return html;
  };

  /**
   * Get the HTML content for the SummaryPane.
   *
   * @param json {Object}
   *
   * @return html {String}
   */
  _getSummary = function (json) {
    var data, timeStart,
        html = '',
        probabilities = _getProbabilities(json);

    if (probabilities) {
      timeStart = Luxon.DateTime.fromMillis(json.forecast[0].timeStart).toUTC()
        .toFormat("ccc, LLL d, yyyy 'at' T"); // eslint-disable-line

      data = {
        model: json.model.name,
        name: _this.name,
        parameters: _getParameters(json),
        probabilities: probabilities,
        timeStart: timeStart
      };

      html = L.Util.template(
        '<h3>{name}</h3>' +
        '<p>Probability of one or more aftershocks in the specified time ' +
          'frame and magnitude range starting on {timeStart} UTC. The ' +
          'likely number of aftershocks (95% confidence range) is listed  ' +
          'below the probability.</p>' +
        '{probabilities}' +
        '{parameters}' +
        '<p><strong>Model</strong>: {model}</p>',
        data
      );
    }

    return html;
  };

  /**
   * Get the JSON feed's URL.
   *
   * @return url {String}
   */
  _getUrl = function () {
    var contents,
        mainshock = _app.Features.getFeature('mainshock'),
        products = mainshock.data.products,
        url = '';

    if (products.oaf) {
      contents = products.oaf[0].contents;

      if (contents['forecast.json']) {
        url = contents['forecast.json'].url;
      }
    }

    return url;
  };

  /**
   * Event handler that toggles the visibility of the Forecast's parameters.
   *
   * @param e {Event}
   */
  _toggleParams = function (e) {
    var button = e.target,
        params = document.querySelector('.forecast .props');

    e.preventDefault();

    button.classList.toggle('selected');
    params.classList.toggle('hide');
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add the JSON feed data.
   *
   * @param json {Object}
   */
  _this.addData = function (json) {
    _this.forecast = json.forecast;
    _this.model = json.model;
    _this.summary = _getSummary(json);
  };

  /**
   * Add event listeners.
   */
  _this.addListeners = function () {
    var el = document.querySelector('#summaryPane .forecast'),
        buttons = el.querySelectorAll('.timeframe li'),
        toggle = el.querySelector('.toggle');

    // Set the selected option on the timeframe 'radio-bar'
    buttons.forEach(button =>
      button.addEventListener('click', _app.setOption)
    );

    // Toggle the Forecast params
    toggle.addEventListener('click', _toggleParams);
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;

    _fetch = null;
    _getItem = null;
    _getList = null;
    _getParameters = null;
    _getPercentage = null;
    _getProbabilities = null;
    _getSummary = null;
    _getUrl = null;
    _toggleParams = null;

    _this = null;
  };

  /**
   * Remove event listeners.
   */
  _this.removeListeners = function () {
    var buttons, toggle,
        el = document.querySelector('#summaryPane .forecast');

    if (el) {
      buttons = el.querySelectorAll('.timeframe li'),
      toggle = el.querySelector('.toggle');

      buttons.forEach(button =>
        button.removeEventListener('click', _app.setOption)
      );

      if (toggle) {
        toggle.removeEventListener('click', _toggleParams);
      }
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Forecast;
