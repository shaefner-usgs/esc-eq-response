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
      _mainshock,
      _product,

      _fetch,
      _getCities,
      _getData,
      _getLightbox,
      _getLocation,
      _getRadius,
      _getStatus,
      _getUrl,
      _getWeaAlert,
      _parseAlerts;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;
    _mainshock = _app.Features.getFeature('mainshock');
    _product = _mainshock.data.eq.products?.['shake-alert']?.[0] || {};

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
        mmi: AppUtil.romanize(Number(props.mmi))
      });

      table +=
        '<tr>' +
          `<td>${props.name}</td>` +
          `<td>${props.citydist}</td>` +
          `<td>${props.warning_time}</td>` +
          '<td>' +
            `<span class="mmi${props.mmi} impact-bubble">` +
              `<strong class="roman">${props.mmi}</strong>` +
            '</span>' +
          '</td>' +
        '</tr>';
    });

    table += '</table>';

    return table;
  };

  /**
   * Get the data used to create the content.
   *
   * @param json {Object}
   *
   * @return {Object}
   */
  _getData = function (json) {
    var alerts = _parseAlerts(json),
        millis = Number(_product.updateTime) || 0,
        datetime = Luxon.DateTime.fromMillis(millis),
        props = json.properties || {},
        decimalSecs = props.time?.match(/\.0*[^0]+/)[0],
        final = alerts.final.properties || {},
        initial = alerts.initial.properties || {},
        time = props.time?.substring(0, 19).replace(' ', 'T') + decimalSecs + 'Z',
        issueTime = Luxon.DateTime.fromISO(time);

    return {
      cities: json.cities?.features || [],
      decimalSecs: AppUtil.round(decimalSecs, 1).substring(1),
      isoIssueTime: issueTime.toUTC().toISO() || '',
      isoTime: datetime.toUTC().toISO() || '',
      latencyFinal: AppUtil.round(final.elapsed, 1) + ' s',
      latencyInitial: AppUtil.round(initial.elapsed, 1) + ' s',
      locationFinal: _getLocation(final),
      locationInitial: _getLocation(initial),
      magAnss: 'M ' + AppUtil.round(props.magnitude, 1),
      magFinal: 'M ' + AppUtil.round(final.magnitude, 1),
      magInitial: 'M ' + AppUtil.round(initial.magnitude, 1),
      magSeconds: Math.round(props.elapsed) + ' s',
      numStations: Number(final.num_stations),
      numStations10: Number(props.num_stations_10km),
      numStations100: Number(props.num_stations_100km),
      radius: _getRadius(alerts),
      status: _getStatus(),
      url: _mainshock.data.eq.url + '/shake-alert',
      userIssueTime: issueTime.toFormat(_app.dateFormat),
      userTime: datetime.toFormat(_app.dateFormat),
      utcIssueTime: issueTime.toUTC().toFormat(_app.dateFormat),
      utcIssueOffset: Number(issueTime.toFormat('Z')),
      utcOffset: Number(datetime.toFormat('Z')),
      utcTime: datetime.toUTC().toFormat(_app.dateFormat),
      wea: props.wea_report || ''
    };
  };

  /**
   * Get the HTML content for the Lightbox.
   *
   * @return {String}
   */
  _getLightbox = function () {
    return L.Util.template(
      '<div class="wrapper">' +
        '<div class="details">' +
          '<p class="issued">Message issued ' +
            '<time datetime="{isoIssueTime}" class="user">' +
              '{userIssueTime}{decimalSecs} (UTC{utcIssueOffset})' +
            '</time>' +
            '<time datetime="{isoIssueTime}" class="utc">' +
              '{utcIssueTime}{decimalSecs} (UTC)' +
            '</time>' +
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
          '<h4>Nearby Cities</h4>' +
          _getCities() +
          '<h4>Number of Stations Reporting</h4>' +
          '<ul>' +
            '<li>{numStations10} within 10 km of epicenter</li>' +
            '<li>{numStations100} within 100 km of epicenter</li>' +
            '<li><strong>{numStations} used in final udpate</strong></li>' +
          '</ul>' +
        '</div>' +
        '<div class="logo">' +
          '<a href="{url}" class="external" target="new">' +
            '<img src="img/shake-alert.png" alt="ShakeAlert logo">' +
          '</a>' +
          _getWeaAlert() +
        '</div>' +
      '</div>' +
      '<dl class="props">' +
        '<dt>Status</dt>' +
        '<dd class="status">{status}</dd>' +
        '<dt>Updated</dt>' +
        '<dd>' +
          '<time datetime="{isoTime}" class="user">' +
            '{userTime} (UTC{utcOffset})' +
          '</time>' +
          '<time datetime="{isoTime}" class="utc">{utcTime} (UTC)</time>' +
        '</dd>' +
      '</dl>',
      _this.data
    );
  };

  /**
   * Get an alert's location description.
   *
   * @param alert {Object}
   *
   * @return {String}
   */
  _getLocation = function (alert) {
    var bearing = Number(alert.location_azimuth_error),
        directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'],
        distance = Number(alert.location_distance_error),
        kms = AppUtil.round(distance, 1),
        miles = AppUtil.round(distance / 1.60934, 1),
        octant = Math.floor((22.5 + (360 + bearing) % 360) / 45);

    return `${kms} km (${miles} mi) ${directions[octant]}`;
  };

  /**
   * Get the alert radius.
   *
   * @param alerts {Object}
   *
   * @return radius {String}
   */
  _getRadius = function (alerts) {
    var radius = '';

    alerts.initial.features?.forEach(feature => {
      if (feature.id === 'acircle_0.0') {
        radius = feature.properties.radius;

        if (feature.properties.radiusunits === 'm') {
          radius = radius / 1000;
        }

        radius = AppUtil.round(radius, 1) + ' km';
      }
    });

    return radius;
  };

  /**
   * Get the review status.
   *
   * @return status {String}
   */
  _getStatus = function () {
    var status = 'not reviewed'; // default

    status = (_product.properties?.['review-status'] || status).toLowerCase();

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
    var contents = _product.contents || {},
        url = '';

    if (contents['summary.json']) {
      url = contents['summary.json'].url || '';
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
        '<p class="wea">' +
          _this.data.wea + ' ' +
          'WEA alerts are distributed to the MMI 4+ area if ShakeAlert Peak M ≥ 5.0.' +
        '</p>';
    }

    return alert;
  };

  /**
   * Parse the alerts, which are stored in disparate formats in the JSON feed.
   *
   * @param json {Object}
   *
   * @return alerts {Object}
   */
  _parseAlerts = function (json) {
    var alerts = {};

    if (json.alerts) {
      json.alerts.forEach((alert, i) => {
        var name = alert.id.match(/(.+)AlertCollection/)[1];
        alerts[name] = json.alerts[i];
      });
    } else {
      alerts = {
        final: json.final_alert,
        initial: json.initial_alert,
      };
    }

    return alerts;
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
    _this.lightbox = _getLightbox();
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
    _mainshock = null;
    _product = null;

    _fetch = null;
    _getCities = null;
    _getData = null;
    _getLightbox = null;
    _getLocation = null;
    _getRadius = null;
    _getStatus = null;
    _getUrl = null;
    _getWeaAlert = null;
    _parseAlerts = null;

    _this = null;
  };

  _initialize(options);
  options = null;
  return _this;
};


module.exports = ShakeAlert;
