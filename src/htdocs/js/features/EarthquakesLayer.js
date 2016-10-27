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
      _eqList,
      _lastAftershock,
      _mainshock,
      _markerOptions,
      _nowMoment,
      _pastDayMoment,
      _pastHourMoment,
      _pastWeekMoment,
      _threshold,

      _addEqToBin,
      _getAge,
      _getBinnedTable,
      _getBubbles,
      _getEqListTable,
      _getIntervals,
      _getSummary,
      _getTemplate,
      _onEachFeature,
      _pointToLayer,
      _romanize;


  _initialize = function (options) {
    options = Util.extend({}, _DEFAULTS, options);
    _markerOptions = Util.extend({}, _MARKER_DEFAULTS, options.markerOptions);

    _id = options.id;
    _bins = {};
    _mainshock = {
      mag: options.mainshock.properties.mag,
      moment: Moment.utc(options.mainshock.properties.time, 'x'),
      time: options.mainshock.properties.time
    };
    _nowMoment = Moment.utc();
    _pastDayMoment = _nowMoment.subtract(1, 'days');
    _pastHourMoment = _nowMoment.subtract(1, 'hours');
    _pastWeekMoment = _nowMoment.subtract(1, 'weeks');
    _eqList = '';

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
   * Bin earthquakes by magnitude and time period
   *
   * @param days {Integer}
   * @param mag {Float}
   * @param period {String}
   */
  _addEqToBin = function (days, mag, period) {
    var intervals,
        magInt;

    magInt = Math.floor(mag);

    if (!_bins[period]) {
      _bins[period] = [];
    }

    if (!_bins[period][magInt]) {
      intervals = _getIntervals();
      _bins[period][magInt] = intervals;
    }

    _bins[period][magInt][0] ++; // total
    if (days <= 365) { // bin eqs less than one year apart
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
   * @param period {String}
   *     'First', 'Past', or 'Prior' depending on type (aftershocks/historical)
   *
   * @return html {Html}
   */
  _getBinnedTable = function (period) {
    var cell,
        html,
        total;

    if (_bins[period].length > 0) {
      html = '<table>' +
        '<tr>' +
          '<th class="empty"></th>' +
          '<th>' + period + ' day</th>' +
          '<th>' + period + ' week</th>' +
          '<th>' + period + ' month</th>' +
          '<th>' + period + ' year</th>' +
          '<th>Total</th>' +
        '</tr>';
      _bins[period].forEach(function(cols, mag) {
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
  _getEqListTable = function (data) {
    var table;

    if (data) {
      table = '<table>' +
          '<tr>' +
            '<th>Mag</th>' +
            '<th>Time</th>' +
            '<th>Location</th>' +
            '<th>Depth</th>' +
          '</tr>' +
          data +
        '</table>';
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
    var duration,
        formValues,
        summary;

    summary = '';

    if (_id !== 'mainshock') {
      formValues = {
        aftershocksDist: document.getElementById('aftershocks-dist').value,
        historicalDist: document.getElementById('historical-dist').value,
        historicalYears: document.getElementById('historical-years').value
      };

      summary += '<p>Earthquakes <strong> within ' + formValues[_id + 'Dist'] +
        ' km</strong> of mainshock epicenter';

      if (_id === 'aftershocks') {
        duration = Math.round(Moment.duration(_nowMoment - _mainshock.moment)
          .asDays() * 10) / 10;

        summary += '. The duration of the aftershock sequence is <strong>' +
          duration + ' days</strong>.</p>';
        summary += _getBinnedTable('First');
        summary += _getBinnedTable('Past');
        summary += '<h3>Last Aftershock</h3>';
        summary += _getEqListTable(_lastAftershock);
      }
      else if (_id === 'historical') {
        summary += ' in the <strong>prior ' + formValues[_id + 'Years'] +
          ' years</strong>.</p>';
        summary += _getBinnedTable('Prior');
      }

      summary += '<h3>M ' + _threshold[_id] + '+ Earthquakes</h3>';
    }

    summary += _getEqListTable(_eqList);

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
        '<h2><a href="{url}" target="_blank">{magType} {mag} - {place}</a></h2>' +
        '<div class="impact-bubbles">{bubbles}</div>' +
        '<dl>' +
          '<dt>Time</dt>' +
          '<dd><time datetime="{isoTime}">{utcTime}</time></dd>' +
          '<dt>Location</dt>' +
          '<dd>{latlng}</dd>' +
          '<dt>Depth</dt>' +
          '<dd>{depth} km</dd>' +
          '<dt>Status</dt>' +
          '<dd>{status}</dd>' +
        '</dl>' +
      '</div>';
    }
    else if (type === 'summary') {
      template = '<tr>' +
        '<td>{magType} {mag}</td>' +
        '<td>{localTime}</td>' +
        '<td>{latlng}</td>' +
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
    var coords,
        data,
        days,
        eqMoment,
        label,
        labelTemplate,
        localTime,
        popup,
        popupTemplate,
        props,
        summaryTemplate,
        utcTime;

    coords = feature.geometry.coordinates;
    props = feature.properties;
    eqMoment = Moment.utc(props.time, 'x');
    utcTime = eqMoment.format('MMM D, YYYY HH:mm:ss') + ' UTC';

    // Calculate local time if tz prop included in feed; otherwise use UTC
    if (props.tz) {
      localTime = eqMoment.utcOffset(props.tz).format('MMM D, YYYY h:mm:ss A') +
        ' at epicenter';
    } else {
      localTime = utcTime;
    }

    data = {
      alert: props.alert, // PAGER
      cdi: _romanize(props.cdi), // DYFI
      depth: Math.round(coords[2] * 10) / 10,
      felt: props.felt,
      isoTime: eqMoment.toISOString(),
      latlng: Math.round(coords[1] * 1000) / 1000 + ', ' +
        Math.round(coords[0] * 1000) / 1000,
      localTime: localTime,
      mag: Math.round(props.mag * 10) / 10,
      magType: props.magType,
      mmi: _romanize(props.mmi), // ShakeMap
      place: props.place,
      status: props.status,
      url: props.url,
      utcTime: utcTime
    };
    data.bubbles = _getBubbles(data);

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
      minWidth: '250'
    }).bindLabel(label);

    // Create summary html
    if (!summaryTemplate) {
      summaryTemplate = _getTemplate('summary');
    }
    // Only add eq to summary if above magnitude threshold
    if ((props.time > _mainshock.time && props.mag > _threshold.aftershocks) ||
        (props.time < _mainshock.time && props.mag > _threshold.historical) ||
         props.time === _mainshock.time) {
      _eqList += L.Util.template(summaryTemplate, data);
    }

    // Bin eq totals by magnitude and time
    if (_id === 'aftershocks') {
      days = Math.floor(Moment.duration(eqMoment - _mainshock.moment).asDays());
      _addEqToBin(days, props.mag, 'First');

      days = Math.floor(Moment.duration(_nowMoment - eqMoment).asDays());
      _addEqToBin(days, props.mag, 'Past');

      // Last aftershock will be last in list; overwrite each time thru loop
      _lastAftershock = L.Util.template(summaryTemplate, data);
    }
    else if (_id === 'historical') {
      days = Math.floor(Moment.duration(_mainshock.moment - eqMoment).asDays());
      _addEqToBin(days, props.mag, 'Prior');
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

  /**
   * Convert number to roman numeral
   *
   * @param num {Number}
   *
   * @return {String}
   */
  _romanize = function (num) {
    var digits,
        i,
        key,
        roman;

    if (typeof num !== 'number') {
      return false;
    }
    num = Math.round(num) || 1; // return 'I' for values less than 1
    digits = String(num).split('');
    key = ['','C','CC','CCC','CD','D','DC','DCC','DCCC','CM',
           '','X','XX','XXX','XL','L','LX','LXX','LXXX','XC',
           '','I','II','III','IV','V','VI','VII','VIII','IX'];
    roman = '';
    i = 3;

    while (i--) {
      roman = (key[+digits.pop() + (i * 10)] || '') + roman;
    }

    return Array(+digits.join('') + 1).join('M') + roman;
  };


  _initialize(options);
  options = null;
  return _this;
};


L.earthquakesLayer = EarthquakesLayer;

module.exports = EarthquakesLayer;
