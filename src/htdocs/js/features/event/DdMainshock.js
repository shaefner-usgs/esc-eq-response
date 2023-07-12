/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
    LatLon = require('util/LatLon'),
    Luxon = require('luxon');


/**
 * Create the double-difference Mainshock Feature, an optional, co-Feature of
 * the (ComCat) Mainshock.
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *     }
 *
 * @return _this {Object}
 *     {
 *       addData: {Function}
 *       destroy: {Function}
 *       id: {String}
 *       name: {String}
 *       url: {String}
 *     }
 */
var DdMainshock = function (options) {
  var _this,
      _initialize,

      _app,
      _mainshock,

      _fetch,
      _getData,
      _getUrl;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;
    _mainshock = _app.Features.getFeature('mainshock'); // ComCat Mainshock

    _this.id = 'dd-mainshock';
    _this.name = 'Mainshock';
    _this.url = _getUrl();

    _fetch();
  };

  /**
   * Fetch the feed data.
   */
  _fetch = function () {
    L.geoJSON.async(_this.url, {
      app: _app,
      feature: _this,
      host: 'ncedc.org' // a PHP script on localhost fetches data from ncedc.org
    });
  };

  /**
   * Get the formatted data used to update the Mainshock with its double-
   * difference properties.
   *
   * @param json {Object}
   *
   * @return data {Object}
   */
  _getData = function (json) {
    var data,
        feature = json.features[0],
        coords = feature.geometry?.coordinates || [0, 0, 0],
        props = feature.properties || {},
        datetime = Luxon.DateTime.fromMillis(Number(props.time)),
        format = 'cccc',
        mag = AppUtil.round(props.mag, 1),
        magType = props.magType || 'M',
        template =
          '<time datetime="{isoTime}" class="utc">{utcTimeDisplay}</time>' +
          '<time datetime="{isoTime}" class="user">{userTimeDisplay}</time>',
        title = _mainshock.data.eq.title,
        utcOffset = datetime.toFormat('Z'),
        userTimeDisplay = datetime.toFormat(_app.dateFormat) +
          ` <span class="tz">(UTC${utcOffset})</span>`,
        utcTimeDisplay = datetime.toUTC().toFormat(_app.dateFormat) +
          ' <span class="tz">(UTC)</span>';

    data = {
      catalog: 'dd',
      coords: coords,
      datetime: datetime,
      depthDisplay: AppUtil.round(coords[2], 1) + '<span> km</span>',
      isoTime: datetime.toUTC().toISO(),
      latLng: L.latLng(coords[1], coords[0]), // for map marker
      latlon: LatLon(coords[1], coords[0]), // for distance, direction
      location: AppUtil.formatLatLon(coords),
      magDisplay: mag,
      magType: magType,
      title: title.replace(/^[\w ]+\s+\d\.\d/, magType + ' ' + mag),
      userDate: datetime.toLocaleString(Luxon.DateTime.DATE_MED),
      userDayofweek: datetime.toFormat(format),
      userTime: datetime.toLocaleString(Luxon.DateTime.TIME_24_WITH_SECONDS),
      userTimeDisplay: userTimeDisplay,
      utcDate: datetime.toUTC().toLocaleString(Luxon.DateTime.DATE_MED),
      utcDayofweek: datetime.toUTC().toFormat(format),
      utcTime: datetime.toUTC().toLocaleString(Luxon.DateTime.TIME_24_WITH_SECONDS),
      utcTimeDisplay: utcTimeDisplay
    };

    // Add timeDisplay prop that depends on other props being set first
    data.timeDisplay = L.Util.template(template, data);

    return data;
  };

  /**
   * Get the JSON feed's URL.
   *
   * @return {String}
   */
  _getUrl = function () {
    var eqid = AppUtil.getParam('eqid') || '',
        id = eqid.replace(/[A-Za-z]{0,2}(\d+)/, '$1');

    return location.origin + location.pathname + 'php/fdsn/search.json.php' +
      `?eventid=${id}&format=text`;
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
    var data;

    if (json.features?.length >= 1) {
      data = _getData(json);

      // Add DD data to existing Mainshock
      _mainshock.addDdData(data);
    }
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;
    _mainshock = null;

    _fetch = null;
    _getData = null;
    _getUrl = null;

    _this = null;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = DdMainshock;
