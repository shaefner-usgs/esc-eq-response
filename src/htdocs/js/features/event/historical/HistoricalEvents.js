/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
    LatLon = require('util/LatLon'),
    Luxon = require('luxon');


/**
 * Create the Historical Events Feature.
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *     }
 *
 * @return _this {Object}
 *     {
 *       addData: {Function}
 *       data: {Array}
 *       dependencies: {Array}
 *       destroy: {Function}
 *       id: {String}
 *       name: {String}
 *       summary: {String}
 *       url: {String}
 *     }
 */
var HistoricalEvents = function (options) {
  var _this,
      _initialize,

      _app,

      _compare,
      _fetch,
      _getData,
      _getSummary,
      _getUrl;


  _this = {};

  _initialize = function (options = {}) {
    var dependency = 'historical';

    if (AppUtil.getParam('catalog') === 'dd') {
      dependency = 'dd-historical';
    }

    _app = options.app;

    _this.data = [];
    _this.dependencies = [dependency];
    _this.id = 'historical-events';
    _this.name = 'Historical Events';
    _this.summary = '';
    _this.url = _getUrl();

    _fetch();
  };

  /**
   * Comparison function to sort events by time (DESC).
   *
   * @params a, b {Objects}
   *
   * @return {Integer}
   */
  _compare = function (a, b) {
    if (a.Time > b.Time) {
      return -1;
    } else if (b.Time > a.Time) {
      return 1;
    }

    return 0;
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
   * @param json {Array}
   *
   * @return data {Array}
   */
  _getData = function (json) {
    var data = [];

    if (Array.isArray(json)) {
      json = json.sort(_compare);

      json.forEach((eq = {}) => {
        var isoDate = (eq.Time || '').replace(' ', 'T') + 'Z',
            datetime = Luxon.DateTime.fromISO(isoDate),
            from = _app.Features.getFeature('mainshock').data.eq.latlon,
            name = (eq.Name || '').replace(/"/g, ''),
            title = 'M ' + AppUtil.round(eq.Magnitude, 1),
            to = LatLon(eq.Lat || 0, eq.Lon || 0);

        if (name !== 'UK') {
          title += '—' + name;
        }

        data.push({
          deaths: parseInt(eq.TotalDeaths, 10) || 0,
          direction: AppUtil.getDirection(from, to),
          distance: AppUtil.round(Number(eq.Distance), 0),
          injured: parseInt(eq.Injured, 10) || 0,
          isoTime: datetime.toUTC().toISO() || '',
          mmi: AppUtil.romanize(parseInt(eq.MaxMMI, 10)),
          population: AppUtil.roundThousands(eq.NumMaxMMI),
          title: title,
          userTime: datetime.toFormat(_app.dateFormat),
          utcOffset: Number(datetime.toFormat('Z')),
          utcTime: datetime.toUTC().toFormat(_app.dateFormat)
        });
      });
    }

    return data;
  };

  /**
   * Get the HTML content for the SummaryPane.
   *
   * @return html {String}
   */
  _getSummary = function () {
    var html = '';

    _this.data.forEach(eq => {
      html += L.Util.template(
        '<div>' +
          '<h4>{title}</h4>' +
          '<dl class="props">' +
            '<dt>Time</dt>' +
            '<dd>' +
              '<time datetime="{isoTime}" class="user">' +
                '{userTime} (UTC{utcOffset})' +
              '</time>' +
              '<time datetime="{isoTime}" class="utc">{utcTime} (UTC)</time>' +
            '</dd>' +
            '<dt>' +
              '<abbr title="Distance and direction from mainshock">Distance</abbr>' +
            '</dt>' +
            '<dd>{distance} km {direction}</dd>' +
            '<dt>Fatalities</dt>' +
            '<dd>{deaths} ({injured} injured)</dd>' +
            '<dt>Max MMI</dt>' +
            '<dd class="mmi">' +
              '<span class="impact-bubble mmi{mmi}" ' +
                'title="ShakeMap maximum estimated intensity">' +
                '<strong class="roman">{mmi}</strong>' +
              '</span> ' +
              '{population} exposed' +
            '</dd>' +
          '</dl>' +
        '</div>',
        eq
      );
    });

    if (html) {
      html = '<h3>Previous Significant Earthquakes</h3>' +
        '<div>' + html + '</div>';
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
        product = mainshock.data.eq.products?.losspager || [],
        contents = product[0]?.contents || {},
        url = '';

    if (contents['json/historical_earthquakes.json']) {
      url = contents['json/historical_earthquakes.json']?.url || '';
    }

    return url;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add the JSON feed data.
   *
   * @param json {Object} default is []
   */
  _this.addData = function (json = []) {
    _this.data = _getData(json);
    _this.summary = _getSummary();
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;

    _compare = null;
    _fetch = null;
    _getData = null;
    _getSummary = null;
    _getUrl = null;

    _this = null;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = HistoricalEvents;
