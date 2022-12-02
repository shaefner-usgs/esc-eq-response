/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
    Luxon = require('luxon');


/**
 * Create the ShakeAlert Feature, a sub-Feature of the Mainshock.
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *     }
 *
 * @return _this {Object}
 *     {
 *       addData: {Function}
 *       data: {Object}
 *       destroy: {Function}
 *       id: {String}
 *       lightbox: {String}
 *       name: {String}
 *       url: {String}
 *     }
 */
var ShakeAlert = function (options) {
  var _this,
      _initialize,

      _app,

      _fetch,
      _getCities,
      _getContent,
      _getData,
      _getLocation,
      _getStatus,
      _getUrl,
      _getWeaAlert;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;

    _this.data = {};
    _this.id = 'shake-alert';
    _this.lightbox = '';
    _this.name = 'ShakeAlert<sup>®</sup>';
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
   * Get the HTML for the cities table.
   *
   * @return table {String}
   */
  _getCities = function () {
    var table =
      '<table>' +
        '<tr>' +
          '<th>City</th>' +
          '<th>Distance</th>' +
          '<th>Warning Time</th>' +
          '<th>Predicted MMI</th>' +
        '</tr>';

    _this.data.cities.forEach(city => {
      var props = city.properties;

      Object.assign(props, {
        citydist: AppUtil.round(props.citydist, 1) + ' km',
        warning_time: '~' + AppUtil.round(props.warning_time, 1) +  ' s',
        mmi: AppUtil.romanize(props.mmi)
      });

      table +=
        '<tr>' +
          `<td>${props.name}</td>` +
          `<td>${props.citydist}</td>` +
          `<td>${props.warning_time}</td>` +
          `<td>${props.mmi}</td>` +
        '</tr>';
    });

    table += '</table>';

    return table;
  };

  /**
   * Get the HTML content for the Lightbox.
   *
   * @return {String}
   */
  _getContent = function () {
    return L.Util.template(
      '<div class="details">' +
        '<p class="issued">Message issued ' +
          '<time datetime="{isoTime}" class="user">{userTime}{decimalSecs} ({utcOffset})</time>' +
          '<time datetime="{isoTime}" class="utc">{utcTime}{decimalSecs} (UTC)</time>' +
          '<br>Last updated ' +
          '<time datetime="{isoUpdateTime}" class="user">{userUpdateTime} ({utcOffset})</time>' +
          '<time datetime="{isoUpdateTime}" class="utc">{utcUpdateTime} (UTC)</time>' +
        '</p>' +
        '<h4>Alert Latency</h4>' +
        '<dl class="props alt">' +
          '<dt>Initial</dt>' +
          '<dd>{latencyInitial} after origin</dd>' +
          '<dt>Final</dt>' +
          '<dd>{latencyFinal} after origin</dd>' +
          '<dt>Late-alert Radius</dt>' +
          '<dd>{radius}</dd>' +
        '</dl>' +
        '<h4>Magnitude Accuracy</h4>' +
        '<dl class="props alt">' +
          '<dt>Initial</dt>' +
          '<dd>{magInitial}</dd>' +
          '<dt>Final</dt>' +
          '<dd>{magFinal}</dd>' +
          '<dt>ANSS Report</dt>' +
          '<dd>{magAnss} ({magSeconds} after origin)</dd>' +
        '</dl>' +
        '<h4>Location Accuracy <span>(relative to ANSS location)</span></h4>' +
        '<dl class="props alt">' +
          '<dt>Initial</dt>' +
          '<dd>{locationInitial}</dd>' +
          '<dt>Final</dt>' +
          '<dd>{locationFinal}</dd>' +
        '</dl>' +
        '<h4>Number of Stations Reporting</h4>' +
        '<ul>' +
          '<li>{numStations10} within 10 km of epicenter</li>' +
          '<li>{numStations100} within 100 km of epicenter</li>' +
          '<li><strong>{numStations} used in final udpate</strong></li>' +
        '</ul>' +
        '<h4>Nearby Cities</h4>' +
        _getCities() +
        _getWeaAlert() +
        '<p class="status"><span>{status}</span></p>' +
      '</div>' +
      '<div class="logo">' +
        '<img src="img/shake-alert.png" alt="ShakeAlert logo">' +
        '<p>' +
          '<a href="{url}" class="external" target="new">' +
            'Event Page ShakeAlert' +
            '<i class="icon-link"></i>' +
          '</a>' +
        '</p>' +
      '</div>',
      _this.data
    );
  };

  /**
   * Get the data used to create the content.
   *
   * @param json {Object}
   *
   * @return {Object}
   */
  _getData = function (json) {
    var props = json.properties,
        decimalSecs = props.time.match(/\.0*[^0]+/)[0],
        final = json.final_alert.properties,
        format = 'LLL d, yyyy TT',
        initial = json.initial_alert.properties,
        mainshock = _app.Features.getFeature('mainshock'),
        product = mainshock.data.products['shake-alert'][0],
        radius = '',
        time = props.time.substring(0, 19).replace(' ', 'T') + decimalSecs + 'Z',
        datetime = Luxon.DateTime.fromISO(time).toUTC(),
        updateTime = Luxon.DateTime.fromSeconds(product.updateTime/1000).toUTC();

    json.initial_alert.features.forEach(feature => {
      if (feature.id === 'acircle_0.0') {
        radius = feature.properties.radius;

        if (feature.properties.radiusunits === 'm') {
          radius = radius / 1000;
        }

        radius = AppUtil.round(radius, 1) + ' km';
      }
    });

    return {
      cities: json.cities.features,
      decimalSecs: AppUtil.round(decimalSecs, 1).substring(1),
      isoTime: datetime.toISO(),
      isoUpdateTime: updateTime.toISO(),
      latencyFinal: AppUtil.round(final.elapsed, 1) + ' s',
      latencyInitial: AppUtil.round(initial.elapsed, 1) + ' s',
      locationFinal: _getLocation(final),
      locationInitial: _getLocation(initial),
      magAnss: 'M ' + AppUtil.round(props.magnitude, 1),
      magFinal: 'M ' + AppUtil.round(final.magnitude, 1),
      magInitial: 'M ' + AppUtil.round(initial.magnitude, 1),
      magSeconds: AppUtil.round(props.elapsed, 0) + ' s',
      numStations: final.num_stations,
      numStations10: props.num_stations_10km,
      numStations100: props.num_stations_100km,
      radius: radius,
      status: _getStatus(product),
      url: mainshock.data.url + '/shake-alert',
      userTime: datetime.toLocal().toFormat(format),
      userUpdateTime: updateTime.toLocal().toFormat(format),
      utcOffset: _app.utcOffset,
      utcTime: datetime.toFormat(format),
      utcUpdateTime: updateTime.toFormat(format),
      wea: props.wea_report || ''
    };
  };

  /**
   * Get an alert's location description.
   *
   * @param alert {Object}
   *
   * @return {String}
   */
  _getLocation = function (alert) {
    var azimuth = alert.location_azimuth_error,
        compassPoints = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'],
        index = Math.floor((22.5 + (360 + azimuth) % 360) / 45),
        direction = compassPoints[index],
        distance = alert.location_distance_error,
        kms = AppUtil.round(distance, 1),
        miles = AppUtil.round(distance / 1.60934, 1);

    return `${kms} km (${miles} mi) ${direction}`;
  };

  /**
   * Get the review status.
   *
   * @param product {Object}
   *
   * @return status {String}
   */
  _getStatus = function (product) {
    var status = 'not reviewed'; // default

    status = (product.properties['review-status'] || status).toLowerCase();

    if (status === 'reviewed') {
      status += '<i class="icon-check"></i>';
    }

    return status;
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

    if (products['shake-alert']) {
      contents = products['shake-alert'][0].contents;

      if (contents['summary.json']) {
        url = contents['summary.json'].url;
      }
    }

    return url;
  };

  /**
   * Get the WEA alert.
   *
   * @return alert {String}
   */
  _getWeaAlert = function () {
    var alert = '';

    if (_this.data.wea) {
      alert =
        '<h4>Wireless Emergency Alert</h4>' +
        '<p>' +
          _this.data.wea + ' ' +
          'WEA alerts are distributed to the MMI 4+ area if ShakeAlert Peak M ≥ 5.0.' +
        '</p>';
    }

    return alert;
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
    _this.data = _getData(json);
    _this.lightbox = _getContent();
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    if (_this.lightbox) {
      _app.Features.getLightbox(_this.id).destroy();
    }

    _initialize = null;

    _app = null;

    _fetch = null;
    _getCities = null;
    _getContent = null;
    _getData = null;
    _getLocation = null;
    _getStatus = null;
    _getUrl = null;
    _getWeaAlert = null;

    _this = null;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = ShakeAlert;
