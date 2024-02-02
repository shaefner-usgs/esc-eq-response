/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
    LatLon = require('util/LatLon'),
    Luxon = require('luxon');


/**
 * Create the Historical Events Feature, a sub-Feature of Historical Seismicity.
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *     }
 *
 * @return _this {Object}
 *     {
 *       content: {String}
 *       data: {Array}
 *       dependencies: {Array}
 *       destroy: {Function}
 *       id: {String}
 *       name: {String}
 *       render: {Function}
 *       url: {String}
 *     }
 */
var HistoricalEvents = function (options) {
  var _this,
      _initialize,

      _app,
      _mainshock,

      _compare,
      _fetch,
      _getContent,
      _getData,
      _getUrl,
      _removeNullVals;


  _this = {};

  _initialize = function (options = {}) {
    var dependency = 'historical';

    if (AppUtil.getParam('catalog') === 'dd') {
      dependency = 'dd-historical';
    }

    _app = options.app;
    _mainshock = _app.Features.getMainshock();

    _this.content = '';
    _this.data = [];
    _this.dependencies = [dependency];
    _this.id = 'historical-events';
    _this.name = 'Historical Events';
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
   * Get the HTML content for the SummaryPane.
   *
   * @return html {String}
   */
  _getContent = function () {
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
            '<dt>Depth</dt>' +
            '<dd>{depth} km</dd>' +
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
   * Get the data used to create the content.
   *
   * @param json {Array}
   *
   * @return data {Array}
   */
  _getData = function (json) {
    var data = [];

    if (Array.isArray(json)) {
      _removeNullVals(json);
      json.sort(_compare);

      json.forEach((eq = {}) => {
        var isoDate = (eq.Time || '').replace(' ', 'T') + 'Z',
            datetime = Luxon.DateTime.fromISO(isoDate),
            from = _mainshock.data.eq.latlon,
            name = (eq.Name || '').replace(/"/g, ''),
            title = 'M ' + AppUtil.round(eq.Magnitude || 0, 1),
            to = LatLon(eq.Lat || 0, eq.Lon || 0);

        if (name !== 'UK') {
          title += '—' + name;
        }

        data.push({
          deaths: parseInt(eq.TotalDeaths || 0, 10) || 0,
          depth: AppUtil.round(eq.Depth || 0, 1),
          direction: AppUtil.getDirection(from, to),
          distance: AppUtil.round(Number(eq.Distance), 0),
          injured: parseInt(eq.Injured || 0, 10) || 0,
          isoTime: datetime.toUTC().toISO(),
          mmi: AppUtil.romanize(parseInt(eq.MaxMMI, 10) || 0),
          population: AppUtil.roundThousands(eq.NumMaxMMI || 0),
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
   * Get the JSON feed's URL.
   *
   * @return url {String}
   */
  _getUrl = function () {
    var product = _mainshock.data.eq.products?.losspager || [],
        contents = product[0]?.contents || {},
        url = '';

    if (contents['json/historical_earthquakes.json']) {
      url = contents['json/historical_earthquakes.json']?.url || '';
    }

    return url;
  };

  /**
   * Remove null entries from the feed data.
   *
   * @param json {Array}
   */
  _removeNullVals = function (json) {
    json.forEach((eq, i) => {
      if (eq === null) delete json[i];
    });
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Destroy this Class.
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;
    _mainshock = null;

    _compare = null;
    _fetch = null;
    _getContent = null;
    _getData = null;
    _getUrl = null;
    _removeNullVals = null;

    _this = null;
  };

  /**
   * Render the Feature.
   *
   * @param json {Array} optional; default is []
   */
  _this.render = function (json = []) {
    if (_this.data.length === 0) { // initial render
      _this.data = _getData(json);
      _this.content = _getContent();
    }

    _app.SummaryPane.addContent(_this);
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = HistoricalEvents;
