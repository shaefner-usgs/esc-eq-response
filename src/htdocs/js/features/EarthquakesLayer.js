/* global L */
'use strict';


var AppUtil = require('AppUtil'),
    LatLon = require('LatLon'),
    Moment = require('moment'),
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
  older: '#ffb'
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
 *     id: {String}, // 'mainshock', 'aftershocks', or 'historical'
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
      _eqList,
      _labelTemplate,
      _lastAftershock,
      _mainshock,
      _markerOptions,
      _nowMoment,
      _pastDayMoment,
      _pastHourMoment,
      _pastWeekMoment,
      _popupTemplate,
      _tableTemplate,
      _threshold,
      _utc,

      _addEqToBin,
      _getAge,
      _getBinnedTable,
      _getBubbles,
      _getEqListTable,
      _getIntervals,
      _getSummary,
      _getTemplate,
      _onEachFeature,
      _pointToLayer;


  _initialize = function (options) {
    var coords;

    options = Util.extend({}, _DEFAULTS, options);
    coords = options.mainshock.geometry.coordinates;

    _bins = {};
    _eqList = [];
    _id = options.id;
    _mainshock = Util.extend({}, options.mainshock, {
      latlon: LatLon(coords[1], coords[0]),
      moment: Moment.utc(options.mainshock.properties.time, 'x')
    });
    _markerOptions = Util.extend({}, _MARKER_DEFAULTS, options.markerOptions);

    _nowMoment = Moment.utc();
    _pastDayMoment = Moment.utc().subtract(1, 'days');
    _pastHourMoment = Moment.utc().subtract(1, 'hours');
    _pastWeekMoment = Moment.utc().subtract(1, 'weeks');

    // Mag threshold for list on summary pane
    _threshold = {
      aftershocks: Math.floor(_mainshock.properties.mag - 2.5),
      historical: Math.floor(_mainshock.properties.mag - 1)
    };

    // Flag for using utc (when local time at epicenter is not available in feed)
    _utc = false;

    _this = L.geoJson(options.data, {
      onEachFeature: _onEachFeature,
      pointToLayer: _pointToLayer
    });

    // Attach html summary to layer
    _this.summary = _getSummary();
  };

  /**
   * Bin earthquakes by magnitude and time period
   *
   * @param days {Integer}
   * @param mag {Float}
   * @param period {String}
   */
  _addEqToBin = function (days, magInt, period) {
    var intervals;

    if (!_bins[period]) {
      _bins[period] = [];
    }

    if (!_bins[period][magInt]) {
      intervals = _getIntervals();
      _bins[period][magInt] = intervals;
    }

    _bins[period][magInt][0] ++; // total
    if (days <= 365) { // bin eqs within one year of period
      _bins[period][magInt][365] ++;
      if (days <= 30) {
        _bins[period][magInt][30] ++;
        if (days <= 7) {
          _bins[period][magInt][7] ++;
          if (days <= 1) {
            _bins[period][magInt][1] ++;
          }
        }
      }
    }
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
    } else if (eqMoment.isSame(_mainshock.moment)) {
      age = 'mainshock';
    } else if (eqMoment.isSameOrAfter(_pastHourMoment)) {
      age = 'pasthour';
    } else if (eqMoment.isSameOrAfter(_pastDayMoment)) {
      age = 'pastday';
    } else if (eqMoment.isSameOrAfter(_pastWeekMoment)) {
      age = 'pastweek';
    } else {
      age = 'older';
    }

    return age;
  };

  /**
   * Get table containing binned earthquake data
   *
   * @param period {String}
   *     'First', 'Past', or 'Prior' depending on type (aftershocks/historical)
   *
   * @return html {Html}
   */
  _getBinnedTable = function (period) {
    var html,
        total;

    html = '';
    if (_bins[period] && _bins[period].length > 0) {
      html = '<table class="bin">' +
        '<tr>' +
          '<th class="period">' + period + ':</th>' +
          '<th>Day</th>' +
          '<th>Week</th>' +
          '<th>Month</th>' +
          '<th>Year</th>' +
          '<th class="total">Total</th>' +
        '</tr>';
      _bins[period].forEach(function(cols, mag) {
        html += '<tr><td class="rowlabel">M ' + mag + '</td>';
        cols.forEach(function(col, i) {
          if (i === 0) { // store total and add to table as last column
            total = '<td class="total">' + col + '</td>';
          } else {
            html += '<td>' + col + '</td>';
          }
        });
        html += total + '</tr>';
      });
      html += '</table>';
    }

    return html;
  };

  /**
   * Get USGS 'Bubbles' HTML for popups
   *
   * @param data {Object}
   *
   * @return bubbles {Html}
   */
  _getBubbles = function (data) {
    var bubbles,
        bubblesTemplate;

    bubblesTemplate = '';
    if (data.cdi) { // DYFI
      bubblesTemplate += '<a href="{url}#dyfi" class="mmi{cdi}"' +
        ' title="Did You Feel It? maximum reported intensity ({felt}' +
        ' responses)"><strong class="roman">{cdi}</strong><br>' +
        '<abbr title="Did You Feel It?">DYFI?</abbr></a>';
    }
    if (data.mmi) { // ShakeMap
      bubblesTemplate += '<a href="{url}#shakemap" class="mmi{mmi}"' +
        ' title="ShakeMap maximum estimated intensity"><strong class="roman">' +
        '{mmi}</strong><br><abbr title="ShakeMap">ShakeMap</abbr></a>';
    }
    if (data.alert) { // PAGER
      bubblesTemplate += '<a href="{url}#pager" class="pager-alertlevel-' +
      '{alert}" title="PAGER estimated impact alert level"><strong' +
      ' class="roman">{alert}</strong><br><abbr title="Prompt Assessment of' +
      ' Global Earthquakes for Response">PAGER</abbr></a>';
    }
    if (data.tsunami) {
      bubblesTemplate += '<a href="http://www.tsunami.gov/" class="tsunami"' +
      ' title="Tsunami Warning Center"><img src="/img/tsunami.jpg"' +
      ' alt="Tsunami Warning Center"></a>';
    }
    bubbles = L.Util.template(bubblesTemplate, data);

    return bubbles;
  };

  /**
   * Get table containing a list of earthquakes
   *
   * @param data {Html}
   *
   * @return table {Html}
   */
  _getEqListTable = function (rows) {
    var data,
        note,
        table;

    data = '';
    note = '<span class="star">* = local time at epicenter.</span>';
    if (_utc) {
      note += ' Using UTC when local time is not available.';
    }

    if (rows && rows.length > 0) {
      // Eqs are ordered ASC by time for Leaflet; reverse for summary table
      rows.reverse();
      rows.forEach(function(row) {
        data += row;
      });
      table = '<table>' +
          '<tr>' +
            '<th>Mag</th>' +
            '<th>Time</th>' +
            '<th>Location</th>' +
            '<th class="distance">' +
              '<abbr title="Distance and direction from mainshock">Distance</abbr>' +
            '</th>' +
            '<th>Depth</th>' +
          '</tr>' +
          data +
        '</table>';

      table += '<p class="note">' + note + '</p>';
    } else {
      table = '<p>None.</p>';
    }

    return table;
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
   * Get summary html for summary pane
   *
   * @return summary {Html}
   */
  _getSummary = function () {
    var count,
        duration,
        formValues,
        summary;

    count = _eqList.length;
    summary = '';

    if (_id === 'mainshock') {
      summary += _mainshock.details;
    }
    else {
      formValues = {
        aftershocksDist: document.getElementById('aftershocks-dist').value,
        aftershocksMinMag: document.getElementById('aftershocks-minmag').value,
        historicalDist: document.getElementById('historical-dist').value,
        historicalMinMag: document.getElementById('historical-minmag').value,
        historicalYears: document.getElementById('historical-years').value || 0
      };

      summary += '<p><strong>M ' + AppUtil.round(formValues[_id + 'MinMag'], 1) +
        '+ </strong> earthquakes <strong> within ' + AppUtil.round(formValues[_id +
        'Dist'], 0) + ' km</strong> of mainshock epicenter';

      if (_id === 'aftershocks') {
        duration = AppUtil.round(Moment.duration(_nowMoment - _mainshock.moment)
          .asDays(), 1);

        summary += '. The duration of the aftershock sequence is <strong>' +
          duration + ' days</strong>.</p>';
        summary += '<div class="bins">';
        summary += _getBinnedTable('First');
        summary += _getBinnedTable('Past');
        summary += '</div>';
        summary += '<h3>Most Recent Aftershock</h3>';
        summary += _getEqListTable(_lastAftershock);
      }
      else if (_id === 'historical') {
        summary += ' in the <strong>prior ' + formValues[_id + 'Years'] +
          ' years</strong>.</p>';
        summary += _getBinnedTable('Prior');
      }

      summary += '<h3>M ' + Math.max(_threshold[_id], AppUtil.round(formValues[_id +
        'MinMag'], 1)) + '+ Earthquakes (' + count + ')</h3>';
      summary += _getEqListTable(_eqList);
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
      template = 'M {mag} - {utcTime}';
    }
    else if (type === 'popup') {
      template = '<div class="popup eq">' +
        '<h4><a href="{url}">{magType} {mag} - {place}</a></h4>' +
        '<div class="impact-bubbles">{bubbles}</div>' +
        '<dl>' +
          '<dt>Time</dt>' +
          '<dd>{time}</dd>' +
          '<dt>Location</dt>' +
          '<dd>{latlng}</dd>' +
          '<dt>Depth</dt>' +
          '<dd>{depth} km</dd>' +
          '<dt>Status</dt>' +
          '<dd>{status}</dd>' +
        '</dl>' +
      '</div>';
    }
    else if (type === 'table') {
      template = '<tr class="m{magInt}">' +
        '<td class="mag">{magType} {mag}</td>' +
        '<td class="time">{localTime}</td>' + // set to UTC if no localTime
        '<td class="location">{latlng}</td>' +
        '<td class="distance">{distance} km <span>{distanceDir}</span></td>' +
        '<td class="depth">{depth} km</td>' +
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
    var bearing,
        bearingString,
        compassPoints,
        coords,
        data,
        days,
        distance,
        eqMoment,
        label,
        latlon,
        localTime,
        mainshockTime,
        magInt,
        popup,
        props,
        timeTemplate,
        utcTime;

    coords = feature.geometry.coordinates;
    props = feature.properties;

    latlon = LatLon(coords[1], coords[0]);
    distance = _mainshock.latlon.distanceTo(latlon) / 1000;
    bearing = _mainshock.latlon.bearing(latlon);
    compassPoints = [' N', 'NE', ' E', 'SE', ' S', 'SW', ' W', 'NW', ' N'];
    bearingString = compassPoints[Math.floor((22.5 + (360.0+bearing)%360.0) / 45.0)];

    eqMoment = Moment.utc(props.time, 'x');
    magInt = Math.floor(props.mag);
    utcTime = eqMoment.format('MMM D, YYYY HH:mm:ss') + '<span class="tz"> UTC</span>';

    // Calculate local time if tz prop included in feed; otherwise use UTC
    timeTemplate = ''; // Time value for leaflet _popupTemplate
    if (props.tz) {
      localTime = eqMoment.utcOffset(props.tz).format('MMM D, YYYY h:mm:ss A') +
        '<span class="star">*</span><span class="tz"> at epicenter</span>';
      timeTemplate += '<time class="localtime" datetime="{isoTime}">{localTime}</time>';
    } else {
      _utc = true;
      localTime = utcTime;
    }
    timeTemplate += '<time datetime="{isoTime}">{utcTime}</time>';

    data = {
      alert: props.alert, // PAGER
      cdi: AppUtil.romanize(props.cdi), // DYFI
      depth: AppUtil.round(coords[2], 1),
      distance: AppUtil.round(distance, 1),
      distanceDir: bearingString,
      felt: props.felt, // DYFI felt reports
      isoTime: eqMoment.toISOString(),
      latlng: AppUtil.round(coords[1], 3) + ', ' + AppUtil.round(coords[0], 3),
      localTime: localTime,
      mag: AppUtil.round(props.mag, 1),
      magInt: magInt,
      magType: props.magType || 'M',
      mmi: AppUtil.romanize(props.mmi), // ShakeMap
      place: props.place,
      status: props.status,
      url: props.url,
      utcTime: utcTime
    };
    data.bubbles = _getBubbles(data);
    data.time = L.Util.template(timeTemplate, data);

    // Create label
    if (!_labelTemplate) {
      _labelTemplate = _getTemplate('label');
    }
    label = L.Util.template(_labelTemplate, data);

    // Create popup html
    if (!_popupTemplate) {
      _popupTemplate = _getTemplate('popup');
    }
    popup = L.Util.template(_popupTemplate, data);
    if (_id === 'mainshock') {
      _mainshock.details = popup;
    }

    // Bind popup and label to marker
    layer.bindPopup(popup, {
      autoPanPadding: L.point(50, 50),
      minWidth: '250'
    }).bindLabel(label);

    // Add eq to array for summary table if it's above magnitude threshold
    if (!_tableTemplate) {
      _tableTemplate = _getTemplate('table');
    }
    mainshockTime = _mainshock.properties.time;
    if ((props.time > mainshockTime && props.mag >= _threshold.aftershocks) ||
        (props.time < mainshockTime && props.mag >= _threshold.historical) ||
         props.time === mainshockTime) {
      _eqList.push(L.Util.template(_tableTemplate, data));
    }

    // Bin eq totals by magnitude and time
    if (_id === 'aftershocks') {
      days = Math.floor(Moment.duration(eqMoment - _mainshock.moment).asDays());
      _addEqToBin(days, magInt, 'First');

      days = Math.floor(Moment.duration(_nowMoment - eqMoment).asDays());
      _addEqToBin(days, magInt, 'Past');

      // Last aftershock will be last in list; overwrite each time thru loop
      _lastAftershock = [L.Util.template(_tableTemplate, data)];
    }
    else if (_id === 'historical') {
      days = Math.floor(Moment.duration(_mainshock.moment - eqMoment).asDays());
      _addEqToBin(days, magInt, 'Prior');
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
