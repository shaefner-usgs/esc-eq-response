/* global L */
'use strict';


var Moment = require('moment'),
    Util = require('util/Util');

require('leaflet.label');


var _COLORS,
    _DEFAULTS,
    _MARKER_DEFAULTS;

_COLORS = {
  historical: '#ccd',
  mainshock: '#00f',
  pasthour: '#f00',
  pastday: '#f90',
  pastweek: '#ff0',
  older: '#ffe'
};
_MARKER_DEFAULTS = {
  weight: 1,
  opacity: 0.5,
  fillOpacity: 0.7,
  color: '#333'
};
_DEFAULTS = {
  data: {},
  markerOptions: _MARKER_DEFAULTS
};


/**
 * Factory for creating earthquakes overlay, summary
 *
 * @param options {Object}
 *   {
 *     data: {Object}, // Geojson data
 *     mainshock: {Object} // magnitude, time, etc.
 *   }
 *
 * @return {L.FeatureGroup}
 */
var EarthquakesLayer = function (options) {
  var _this,
      _initialize,

      _id,
      _bins,
      _mainshock,
      _markerOptions,
      _pastDayMoment,
      _pastHourMoment,
      _pastWeekMoment,
      _period,
      _summary,
      _threshold,

      _getAge,
      _getBinnedData,
      _getIntervals,
      _getPeriod,
      _getSummary,
      _getTemplate,
      _onEachFeature,
      _pointToLayer;


  _initialize = function (options) {
    options = Util.extend({}, _DEFAULTS, options);
    _markerOptions = Util.extend({}, _MARKER_DEFAULTS, options.markerOptions);

    _id = options.id;
    _bins = [];
    _mainshock = {
      mag: options.mainshock.properties.mag,
      moment: Moment.utc(options.mainshock.properties.time, 'x'),
      time: options.mainshock.properties.time
    };
    _pastDayMoment = Moment.utc().subtract(1, 'days');
    _pastHourMoment = Moment.utc().subtract(1, 'hours');
    _pastWeekMoment = Moment.utc().subtract(1, 'weeks');
    _summary = '';

    // Mag threshold for list on summary pane
    _threshold = {
      aftershocks: Math.floor(_mainshock.mag - 2.5),
      historical: Math.floor(_mainshock.mag - 1)
    };

    _this = L.geoJson(options.data, {
      onEachFeature: _onEachFeature,
      pointToLayer: _pointToLayer
    });

    // Attach html summary to layer
    _this.summary = _getSummary();
  };

  /**
   * Get 'age' of earthquake (pasthour, pastday, etc)
   *
   * @param timestamp {Int} milliseconds since 1970
   *
   * @return age {String}
   */
  _getAge = function (timestamp) {
    var age,
        eqMoment;

    eqMoment = Moment.utc(timestamp, 'x'); // unix ms timestamp
    if (eqMoment.isBefore(_mainshock.moment)) {
      age = 'historical';
    } else if (eqMoment.isSameOrAfter(_pastHourMoment)) {
      age = 'pasthour';
    } else if (eqMoment.isSameOrAfter(_pastDayMoment)) {
      age = 'pastday';
    } else if (eqMoment.isSameOrAfter(_pastWeekMoment)) {
      age = 'pastweek';
    } else if (eqMoment.isSame(_mainshock.moment)) {
      age = 'mainshock';
    } else {
      age = 'older';
    }

    return age;
  };

  /**
   * Get table containing binned earthquake data
   *
   * @return table {Html}
   */
  _getBinnedData = function () {
    var cell,
        html,
        total;

    if (_bins.length > 0) {
      html = '<table>' +
        '<tr>' +
          '<th class="empty"></th>' +
          '<th>' + _period + ' day</th>' +
          '<th>' + _period + ' week</th>' +
          '<th>' + _period + ' month</th>' +
          '<th>' + _period + ' year</th>' +
          '<th>Total</th>' +
        '</tr>';
      _bins.forEach(function(cols, mag) {
        html += '<tr><td>M ' + mag + '+</td>';
        cols.forEach(function(col, i) {
          cell = '<td>' + col + '</td>';
          if (i === 0) { // store total and add to table as last column
            total = cell;
          } else {
            html += cell;
          }
        });
        html += total + '</tr>';
      });
      html += '</table>';
    } else {
      html = '<p>None.</p>';
    }

    return html;
  };

  /**
   * Get intervals to store binned data in
   *
   * @return intervals {Array}
   */
  _getIntervals = function () {
    var intervals = [];

    intervals[0] = 0;
    intervals[1] = 0;
    intervals[7] = 0;
    intervals[30] = 0;
    intervals[365] = 0;

    return intervals;
  };

  /**
   * Get nomenclature depending on type (aftershock, historical) of event
   *
   * @param days {Number}
   *
   * @return period {String}
   */
  _getPeriod = function (days) {
    var period;

    if (days > 0) { // aftershock
      period = 'First';
    } else { // historical
      period = 'Prior';
    }

    return period;
  };

  /**
   * Get summary html for summary pane
   *
   * @return summary {Html}
   */
  _getSummary = function () {
    var formValues,
        summary;

    summary = '';
    if (_id !== 'mainshock') {
      formValues = {
        aftershocksDist: document.getElementById('aftershocks-dist').value,
        historicalDist: document.getElementById('historical-dist').value,
        historicalYears: document.getElementById('historical-years').value
      };

      summary += '<p>Earthquakes within ' + formValues[_id + 'Dist'] + ' km of ' +
        'mainshock epicenter</p>';
      summary += _getBinnedData();
      summary += '<h4>M ' + _threshold[_id] + '+ Earthquakes</h4>';
    }

    if (_summary) {
      summary += '<table>' +
          '<tr>' +
            '<th>Mag</th>' +
            '<th>Time</th>' +
            '<th>Cooordinates</th>' +
            '<th>Depth</th>' +
          '</tr>' +
          _summary +
        '</table>';
    } else {
      summary += '<p>None.</p>';
    }

    return summary;
  };

  /**
   * Get html template for displaying eq details
   *
   * @param type {String}
   *
   * @return template {Html}
   */
  _getTemplate = function (type) {
    var template;

    if (type === 'label') {
      template = 'M{mag} - {utcTime}';
    }
    else if (type === 'popup') {
      template = '<div class="popup eq">' +
        '<h2><a href="{url}" target="_blank">M {mag} - {place}</a></h2>' +
        '<dl>' +
          '<dt>Time</dt><dd><time>{utcTime}</time></dd>' +
          '<dt>Location (depth)</dt><dd>{lat}, {lng} ({depth} km)</dd>' +
          '<dt>Magnitude ({magType})</dt><dd>{mag}</dd>' +
          '<dt>Status</dt><dd>{status}</dd>' +
        '</dl>' +
      '</div>';
    }
    else if (type === 'summary') {
      template = '<tr>' +
        '<td>{magType} {mag}</td>' +
        '<td>{time} {tz}</td>' +
        '<td>{lat}, {lng}</td>' +
        '<td>{depth} km</td>' +
      '</tr>';
    }

    return template;
  };

  /**
   * Leaflet GeoJSON option: called on each created feature layer. Useful for
   * attaching events and popups to features.
   *
   * @param feature {Object}
   * @param layer (L.Layer)
   */
  _onEachFeature = function (feature, layer) {
    var data,
        days,
        decimalDays,
        eqMoment,
        intervals,
        label,
        labelTemplate,
        magInt,
        popup,
        popupTemplate,
        props,
        summaryTemplate,
        time,
        tz,
        utcTime;

    props = feature.properties;
    eqMoment = Moment.utc(props.time, 'x');
    utcTime = eqMoment.format('MMM D, YYYY HH:mm:ss') + ' UTC';

    // Calculate local time if tz prop included in feed; otherwise use UTC
    if (props.tz) {
      time = eqMoment.utcOffset(props.tz).format('MMM D, YYYY h:mm:ss A');
      tz = 'at epicenter';
    } else {
      time = utcTime;
      tz = 'UTC';
    }

    data = {
      depth: Math.round(feature.geometry.coordinates[2] * 10) / 10,
      lat: feature.geometry.coordinates[1],
      lng: feature.geometry.coordinates[0],
      mag: Math.round(props.mag * 10) / 10,
      magType: props.magType,
      place: props.place,
      status: props.status,
      time: time,
      tz: tz,
      url: props.url,
      utcTime: utcTime
    };

    // Create label
    if (!labelTemplate) {
      labelTemplate = _getTemplate('label');
    }
    label = L.Util.template(labelTemplate, data);

    // Create popup html
    if (!popupTemplate) {
      popupTemplate = _getTemplate('popup');
    }
    popup = L.Util.template(popupTemplate, data);

    // Bind popup and label to marker
    layer.bindPopup(popup, {
      autoPanPadding: L.point(50, 50),
      maxWidth: '265'
    }).bindLabel(label);

    // Create summary html
    if (!summaryTemplate) {
      summaryTemplate = _getTemplate('summary');
    }
    // Only add eq to summary if above magnitude threshold
    if ((props.time > _mainshock.time && props.mag > _threshold.aftershocks) ||
        (props.time < _mainshock.time && props.mag > _threshold.historical) ||
         props.time === _mainshock.time) {
      _summary += L.Util.template(summaryTemplate, data);
    }

    // Bin eq totals by magnitude and time
    if (_id !== 'mainshock') {
      decimalDays = Moment.duration(eqMoment - _mainshock.moment).asDays();
      if (!_period) {
        _period = _getPeriod(decimalDays);
      }

      magInt = Math.floor(props.mag);
      if (!_bins[magInt]) {
        intervals = _getIntervals();
        _bins[magInt] = intervals;
      }

      _bins[magInt][0] ++; // total
      days = Math.floor(Math.abs(decimalDays));
      if (days <= 365) { // bin eqs less than one year apart
        _bins[magInt][365] ++;
        if (days <= 30) {
          _bins[magInt][30] ++;
          if (days <= 7) {
            _bins[magInt][7] ++;
            if (days <= 1) {
              _bins[magInt][1] ++;
            }
          }
        }
      }
    }
  };

  /**
   * Leaflet GeoJSON option: used for creating layers for GeoJSON points
   *
   * @param feature {Object}
   * @param latlng {L.LatLng}
   *
   * @return marker {L.CircleMarker}
   */
  _pointToLayer = function (feature, latlng) {
    var age,
        fillColor,
        radius;

    age = _getAge(feature.properties.time);
    fillColor = _COLORS[age];
    radius = 3 * parseInt(Math.pow(10, (0.11 * feature.properties.mag)), 10);

    _markerOptions.fillColor = fillColor;
    _markerOptions.radius = radius;

    return L.circleMarker(latlng, _markerOptions);
  };


  _initialize(options);
  options = null;
  return _this;
};


L.earthquakesLayer = EarthquakesLayer;

module.exports = EarthquakesLayer;
