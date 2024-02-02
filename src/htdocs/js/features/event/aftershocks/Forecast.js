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
 *       content: {String}
 *       data: {Object}
 *       dependencies: {Array}
 *       destroy: {Function}
 *       id: {String}
 *       name: {String)
 *       render: {Function}
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
      _selected,
      _toggle,

      _addListeners,
      _fetch,
      _getContent,
      _getData,
      _getItem,
      _getList,
      _getParameters,
      _getPercentage,
      _getProbabilities,
      _getUrl,
      _removeListeners,
      _toggleParams;


  _this = {};

  _initialize = function (options = {}) {
    var dependency = 'aftershocks';

    if (AppUtil.getParam('catalog') === 'dd') {
      dependency = 'dd-aftershocks';
    }

    _app = options.app;
    _radioBarOpts = {
      id: 'forecast-timeframe',
      items: [] // default
    };

    _this.content = '';
    _this.data = {};
    _this.dependencies = [dependency];
    _this.id = 'forecast';
    _this.name = 'Forecast';
    _this.url = _getUrl();

    _fetch();
  };

  /**
   * Add event listeners.
   */
  _addListeners = function () {
    _el = document.querySelector('#summary-pane .forecast');
    _toggle = _el.querySelector('.toggle');

    // Display the selected timeframe's forecast
    _radioBar?.addListeners(document.getElementById('forecast-timeframe'));

    // Toggle the forecast parameters
    _toggle?.addEventListener('click', _toggleParams);
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
   * Get the HTML content for the SummaryPane.
   *
   * @return html {String}
   */
  _getContent = function () {
    var data,
        html = '',
        probabilities = _getProbabilities();

    if (probabilities) {
      _radioBar = RadioBar(_radioBarOpts);

      data = Object.assign({}, _this.data, {
        modelName: _this.data.model.name,
        name: _this.name
      });

      html = L.Util.template(
        '<h3>{name}</h3>' +
        '<p>Probability of one or more aftershocks in the specified time ' +
          'frame and magnitude range starting on ' +
          '<strong>' +
            '<time datetime="{isoTime}" class="user">{userStartTime} (UTC{utcOffset})</time>' +
            '<time datetime="{isoTime}" class="utc">{utcStartTime} (UTC)</time>' +
          '</strong>. ' +
          'The likely number of aftershocks (95% confidence range) is listed ' +
          'below the probability.' +
        '</p>' +
        _radioBar.getContent() +
        probabilities +
        _getParameters() +
        '<dl class="props">' +
          '<dt>Model</dt>' +
          '<dd>{modelName}</dd>' +
          _app.Features.getTimeStamp(_this.data) +
        '</dl>',
        data
      );
    }

    return html;
  };

  /**
   * Get the data used to create the content.
   *
   * @param json {Object}
   *
   * @return {Object}
   */
  _getData = function (json) {
    var format = "cccc, LLLL d, yyyy 'at' T", // eslint-disable-line
        millisecs = Number(json.creationTime || 0),
        datetime = Luxon.DateTime.fromMillis(millisecs),
        startsecs = Number(json.forecast?.[0]?.timeStart) || 0,
        startTime = Luxon.DateTime.fromMillis(startsecs);

    return {
      advisoryTimeFrame: json.advisoryTimeFrame || '',
      isoTime: datetime.toUTC().toISO(),
      model: json.model || {},
      timeFrames: json.forecast || [],
      userStartTime: startTime.toFormat(format),
      userTime: datetime.toFormat(_app.dateFormat),
      utcOffset: Number(datetime.toFormat('Z')),
      utcStartTime: startTime.toUTC().toFormat(format),
      utcTime: datetime.toUTC().toFormat(_app.dateFormat)
    };
  };

  /**
   * Get the HTML content for the item with the given magnitude/probability.
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
   * Get the HTML content for the probabilities. Also populate its RadioBar
   * items and set the initially selected item.
   *
   * @return html {String}
   */
  _getProbabilities = function () {
    var html = '',
        probabilities = '';

    _this.data.timeFrames.forEach((timeframe = {}) => {
      var period = timeframe.label?.replace(/1\s+/, ''),
          id = 'next' + period;

      if (timeframe.label === _this.data.advisoryTimeFrame) {
        _selected = id;
      }

      _radioBarOpts.items.push({
        id: id,
        name: timeframe.label
      });

      probabilities += `<li class="${id} option">`;
      probabilities += _getList(timeframe);
      probabilities += '</li>';
    });

    if (probabilities) {
      html += `<ul class="probabilities">${probabilities}</ul>`;
    }

    return html;
  };

  /**
   * Get the JSON feed's URL.
   *
   * @return url {String}
   */
  _getUrl = function () {
    var mainshock = _app.Features.getMainshock(),
        product = mainshock.data.eq.products?.oaf || [],
        contents = product[0]?.contents || {},
        url = '';

    if (contents['forecast.json']) {
      url = contents['forecast.json']?.url || '';
    }

    return url;
  };

  /**
   * Remove event listeners.
   */
  _removeListeners = function () {
    if (_el) {
      _radioBar?.removeListeners();
      _toggle?.removeEventListener('click', _toggleParams);
    }
  };

  /**
   * Event handler that toggles the visibility of the Forecast's parameters.
   *
   * @param e {Event}
   */
  _toggleParams = function (e) {
    var state,
        button = e.target,
        params = _el.querySelector('.params');

    e.preventDefault();
    button.classList.toggle('selected');
    params.classList.toggle('hide');

    state = button.classList.contains('selected');

    sessionStorage.setItem('forecast-params', state);
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Destroy this Class.
   */
  _this.destroy = function () {
    _removeListeners();
    _radioBar?.destroy();

    _initialize = null;

    _app = null;
    _el = null;
    _radioBar = null;
    _radioBarOpts = null;
    _selected = null;
    _toggle = null;

    _addListeners = null;
    _fetch = null;
    _getContent = null;
    _getData = null;
    _getItem = null;
    _getList = null;
    _getParameters = null;
    _getPercentage = null;
    _getProbabilities = null;
    _getUrl = null;
    _removeListeners = null;
    _toggleParams = null;

    _this = null;
  };

  /**
   * Render the Feature.
   *
   * @param json {Object} optional; default is {}
   */
  _this.render = function (json = {}) {
    var button;

    if (AppUtil.isEmpty(_this.data)) { // initial render
      _this.data = _getData(json);
      _this.content = _getContent();
    } else {
      _selected = sessionStorage.getItem('forecast-timeframe');

      _removeListeners();
    }

    _app.SummaryPane.addContent(_this);
    _addListeners();
    _radioBar?.setOption(document.getElementById(_selected));

    if (sessionStorage.getItem('forecast-params') === 'true') {
      button = _el.querySelector('.button');

      button.click();
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Forecast;
