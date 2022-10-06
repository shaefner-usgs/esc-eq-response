/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
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
var Mainshock = function (options) {
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
   * @return {Object}
   */
  _getData = function (json) {
    var format = 'cccc',
        feature = json.features[0],
        coords = feature.geometry.coordinates,
        props = feature.properties,
        datetime = Luxon.DateTime.fromMillis(props.time).toUTC(),
        mag = AppUtil.round(props.mag, 1);

    return {
      catalog: 'dd',
      coords: coords,
      depthDisplay: AppUtil.round(coords[2], 1) + '<span> km</span>',
      latLng: L.latLng(coords[1], coords[0]),
      location: AppUtil.formatLatLon(coords),
      magDisplay: mag,
      title: _mainshock.data.title.replace(/\d\.\d/, mag),
      userDate: datetime.toLocal().toLocaleString(Luxon.DateTime.DATE_MED),
      userDayofweek: datetime.toLocal().toFormat(format),
      userTime: datetime.toLocal().toLocaleString(Luxon.DateTime.TIME_24_WITH_SECONDS),
      utcDate: datetime.toLocaleString(Luxon.DateTime.DATE_MED),
      utcDayofweek: datetime.toFormat(format),
      utcTime: datetime.toLocaleString(Luxon.DateTime.TIME_24_WITH_SECONDS)
    };
  };

  /**
   * Get the JSON feed's URL.
   *
   * @return {String}
   */
  _getUrl = function () {
    var eqid = AppUtil.getParam('eqid'),
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
   * @param json {Object}
   */
  _this.addData = function (json) {
    var data;

    if (json.features.length !== 0) {
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


module.exports = Mainshock;
