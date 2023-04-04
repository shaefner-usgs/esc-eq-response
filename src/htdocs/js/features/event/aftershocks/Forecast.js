/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
    Luxon = require('luxon'),
    RadioBar = require('util/controls/RadioBar');


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
 *       data: {Object}
 *       dependencies: {Array}
 *       destroy: {Function}
 *       id: {String}
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
      _el,
      _radioBar,
      _radioBarOpts,
      _toggle,

      _fetch,
      _getData,
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
    _radioBarOpts = {
      id: 'timeframe',
      items: [],
      selected: ''
    };

    _this.data = {};
    _this.dependencies = [dependency];
    _this.id = 'forecast';
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
   * Get the data used to create the content.
   *
   * @param json {Object}
   *
   * @return {Object}
   */
  _getData = function (json) {
    var millisecs = Number(json.forecast?.[0]?.timeStart) || 0,
        datetime = Luxon.DateTime.fromMillis(millisecs),
        format = "ccc, LLL d, yyyy 'at' T"; // eslint-disable-line

    return {
      advisoryTimeFrame: json.advisoryTimeFrame,
      isoTime: datetime.toUTC().toISO(),
      model: json.model || {},
      timeFrames: json.forecast || [],
      userTime: datetime.toFormat(format),
      utcOffset: Number(datetime.toFormat('Z')),
      utcTime: datetime.toUTC().toFormat(format)
    };
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
          '<h5>M {mag}+</h5>' +
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
    var bins = timeframe.bins || [],
        eqid = AppUtil.getParam('eqid'),
        data = {
          url: 'https://earthquake.usgs.gov/earthquakes/eventpage/' + eqid +
            '/oaf/forecast'
        },
        html = '<ol>';

    bins.forEach((bin = {}) => {
      var probability = Number(bin.probability) || 0,
          range = bin.p95minimum;

      if (bin.p95maximum !== 0) {
        range += '–' + bin.p95maximum;
      }

      Object.assign(data, {
        mag: bin.magnitude,
        probability: _getPercentage(probability),
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
   * @return html {String}
   */
  _getParameters = function () {
    var html = '<h4>Parameters <a class="toggle button">Show</a></h4>',
        params = _this.data.model.parameters || {};

    html += '<dl class="props alt params hide">';

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
      percentage = Math.round(100 * probability) + '%';
    }

    return percentage;
  };

  /**
   * Get the HTML content for the probabilities and populate its RadioBar items.
   *
   * @return html {String}
   */
  _getProbabilities = function () {
    var html = '',
        probabilities = '';

    _this.data.timeFrames.forEach((timeframe = {}) => {
      var hide = 'hide', // default
          period = timeframe.label?.replace(/1\s+/, ''),
          id = 'next' + period;

      if (timeframe.label === _this.data.advisoryTimeFrame) {
        hide = ''; // show default timeframe
        _radioBarOpts.selected = id;
      }

      _radioBarOpts.items.push({
        id: id,
        name: timeframe.label
      });

      probabilities += `<li class="${id} option ${hide}">`;
      probabilities += _getList(timeframe);
      probabilities += '</li>';
    });

    if (probabilities) {
      html += `<ul class="probabilities">${probabilities}</ul>`;
    }

    return html;
  };

  /**
   * Get the HTML content for the SummaryPane.
   *
   * @return html {String}
   */
  _getSummary = function () {
    var data,
        html = '',
        probabilities = _getProbabilities();

    if (probabilities) {
      _radioBar = RadioBar(_radioBarOpts);

      data = Object.assign({}, _this.data, {
        modelName: _this.data.model.name, // flatten for template
        name: _this.name
      });

      html = L.Util.template(
        '<h3>{name}</h3>' +
        '<p>Probability of one or more aftershocks in the specified time ' +
          'frame and magnitude range starting on ' +
          '<time datetime="{isoTime}" class="user">{userTime} (UTC{utcOffset})</time>' +
          '<time datetime="{isoTime}" class="utc">{utcTime} (UTC)</time>. ' +
          'The likely number of aftershocks (95% confidence range) is listed ' +
          'below the probability.' +
        '</p>' +
        _radioBar.getHtml() +
        probabilities +
        '<dl class="props model">' +
          '<dt>Model</dt>' +
          '<dd>{modelName}</dd>' +
        '</dl>' +
        _getParameters(),
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
    var mainshock = _app.Features.getFeature('mainshock'),
        product = mainshock.data.eq.products?.oaf || [],
        contents = product[0]?.contents || {},
        url = '';

    if (contents['forecast.json']) {
      url = contents['forecast.json']?.url || '';
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
        params = _el.querySelector('.params');

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
   * @param json {Object} default is {}
   */
  _this.addData = function (json = {}) {
    _this.data = _getData(json);
    _this.summary = _getSummary();
  };

  /**
   * Add event listeners.
   */
  _this.addListeners = function () {
    _el = document.querySelector('#summaryPane .forecast');
    _toggle = _el.querySelector('.toggle');

    // Display the selected timeframe's forecast
    _radioBar.addListeners(document.getElementById('timeframe'));

    // Toggle the forecast parameters
    _toggle.addEventListener('click', _toggleParams);
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    if (_radioBar) {
      _radioBar.destroy();
    }

    _initialize = null;

    _app = null;
    _el = null;
    _radioBar = null;
    _radioBarOpts = null;
    _toggle = null;

    _fetch = null;
    _getData = null;
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
    if (_el) {
      _radioBar.removeListeners();
      _toggle.removeEventListener('click', _toggleParams);
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Forecast;
