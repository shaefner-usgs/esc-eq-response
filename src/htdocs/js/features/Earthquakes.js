/* global L */
'use strict';


var AppUtil = require('AppUtil'),
    LatLon = require('LatLon'),
    Moment = require('moment'),
    Util = require('hazdev-webutils/src/util/Util');


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
  color: '#000',
  fillOpacity: 0.85,
  opacity: 0.6,
  weight: 1
};
_DEFAULTS = {
  json: {},
  markerOptions: _MARKER_DEFAULTS
};


/**
 * Parses an earthquake feed to create a Leaflet map layer as well as the data
 *   used on the plot and summary panes
 *
 * @param options {Object}
 *   {
 *     id: {String}, // 'mainshock', 'aftershocks', or 'historical'
 *     json: {Object}, // geojson data for feature
 *     mainshockJson: {Object}, // mainshock geojson: magnitude, time, etc.
 *   }
 */
var Earthquakes = function (options) {
  var _this,
      _initialize,

      _bins,
      _details,
      _eqList,
      _id,
      _lastId,
      _markerOptions,
      _mainshockLatlon,
      _mainshockMoment,
      _nowMoment,
      _pastDayMoment,
      _pastHourMoment,
      _pastWeekMoment,
      _plotdata,
      _popupTemplate,
      _tablerowTemplate,
      _tooltipTemplate,

      _addEqToBin,
      _getAge,
      _getBubbles,
      _getDescription,
      _getIntervals,
      _getTemplate,
      _onEachFeature,
      _pointToLayer;


  _this = {};

  _initialize = function (options) {
    var coords;

    options = Util.extend({}, _DEFAULTS, options);
    coords = options.mainshockJson.geometry.coordinates;

    _bins = {};
    _eqList = {};
    _plotdata = {
      color: [],
      depth: [],
      lat: [],
      lon: [],
      mag: [],
      size: [],
      text: [],
      time: []
    };

    _id = options.id;
    _markerOptions = Util.extend({}, _MARKER_DEFAULTS, options.markerOptions);

    _mainshockLatlon = LatLon(coords[1], coords[0]);

    _mainshockMoment = Moment.utc(options.mainshockJson.properties.time, 'x');
    _nowMoment = Moment.utc();
    _pastDayMoment = Moment.utc().subtract(1, 'days');
    _pastHourMoment = Moment.utc().subtract(1, 'hours');
    _pastWeekMoment = Moment.utc().subtract(1, 'weeks');

    // Templates for L.Util.template
    _tooltipTemplate = _getTemplate('tooltip');
    _popupTemplate = _getTemplate('popup');
    _tablerowTemplate = _getTemplate('tablerow');

    // Store feed description for aftershocks and historical
    if (_id === 'aftershocks' || _id === 'historical') {
      _details = _getDescription();
    }

    _this.mapLayer = L.geoJson(options.json, {
      onEachFeature: _onEachFeature,
      pointToLayer: _pointToLayer
    });
  };

  /**
   * Bin earthquakes by magnitude and time period
   *
   * @param days {Integer}
   * @param magInt {Integer}
   * @param period {String <First | Past | Prior>}
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
   * @param timestamp {Int}
   *     milliseconds since 1970
   *
   * @return age {String}
   */
  _getAge = function (timestamp) {
    var age,
        eqMoment;

    eqMoment = Moment.utc(timestamp, 'x'); // unix ms timestamp
    if (eqMoment.isBefore(_mainshockMoment)) {
      age = 'historical';
    } else if (eqMoment.isSame(_mainshockMoment)) {
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
   * Get USGS 'Bubbles' (DYFI, ShakeMap, etc) HTML for popups
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
      ' title="Tsunami Warning Center"><span class="hover"></span>' +
      '<img src="img/tsunami.png" alt="Tsunami Warning Center"></a>';
    }
    bubbles = L.Util.template(bubblesTemplate, data);

    return bubbles;
  };

  /**
   * Get feed description (aftershocks / historical)
   *
   * @return description {Html}
   */
  _getDescription = function () {
    var description,
        duration;

    description = '<p class="description"><strong>M ' +
      AppUtil.getParam(_id + '-minmag') + '+ </strong> earthquakes <strong> ' +
      'within ' + AppUtil.getParam(_id + '-dist') + ' km</strong> of the ' +
      'mainshock&rsquo;s epicenter';

    if (_id === 'aftershocks') {
      duration = AppUtil.round(Moment.duration(_nowMoment - _mainshockMoment)
        .asDays(), 1);

      description += '. The duration of the aftershock sequence is <strong>' +
        duration + ' days</strong>';
    }
    else if (_id === 'historical') {
      description += ' in the <strong>prior ' +
      AppUtil.getParam('historical-years') + ' years</strong>';
    }

    description += '.</p>';

    return description;
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
   * Get html template for displaying eq details
   *
   * @param type {String <popup | tablerow | tooltip>}
   *
   * @return template {Html}
   */
  _getTemplate = function (type) {
    var template;

    if (type === 'popup') {
      template = '<div class="earthquake">' +
        '<h4><a href="{url}">{magType} {mag} - {place}</a></h4>' +
        '<div class="impact-bubbles">{bubblesHtml}</div>' +
        '<dl>' +
          '<dt>Time</dt>' +
          '<dd>{timeHtml}</dd>' +
          '<dt>Location</dt>' +
          '<dd>{latlng}</dd>' +
          '<dt>Depth</dt>' +
          '<dd>{depth} km</dd>' +
          '<dt>Status</dt>' +
          '<dd>{status}</dd>' +
        '</dl>' +
      '</div>';
    }
    else if (type === 'tablerow') {
      template = '<tr class="m{magInt}">' +
        '<td class="mag" data-sort="{mag}">{magType} {mag}</td>' +
        '<td class="time" data-sort="{isoTime}">{utcTime}</td>' +
        '<td class="location">{latlng}</td>' +
        '<td class="distance" data-sort="{distance}">{distance} km <span>{distanceDir}</span></td>' +
        '<td class="depth" data-sort="{depth}">{depth} km</td>' +
      '</tr>';
    }
    else if (type === 'tooltip') {
      template = 'M {mag} - {utcTime}';
    }

    return template;
  };

  /**
   * Leaflet GeoJSON option: called once for each Marker, after it has been
   * created and styled. Creates popups, tooltips and data for summary/plots.
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
        eqid,
        eqMoment,
        latlon,
        localTime,
        mag,
        magInt,
        popup,
        props,
        timeTemplate,
        tooltip,
        utcTime;

    coords = feature.geometry.coordinates;
    eqid = feature.id;
    props = feature.properties;

    latlon = LatLon(coords[1], coords[0]);
    distance = _mainshockLatlon.distanceTo(latlon) / 1000;
    bearing = _mainshockLatlon.bearing(latlon);
    compassPoints = [' N', 'NE', ' E', 'SE', ' S', 'SW', ' W', 'NW', ' N'];
    bearingString = compassPoints[Math.floor((22.5 + (360.0+bearing)%360.0) / 45.0)];

    eqMoment = Moment.utc(props.time, 'x');
    mag = AppUtil.round(props.mag, 1);
    magInt = Math.floor(mag);

    // Time field for leaflet popup, etc.
    utcTime = eqMoment.format('MMM D, YYYY HH:mm:ss') + ' <span class="tz">UTC</span>';
    timeTemplate = '<time datetime="{isoTime}">{utcTime}</time>';
    if (props.tz) { // calculate local time if tz prop included in feed
      localTime = eqMoment.clone().utcOffset(props.tz).format('MMM D, YYYY h:mm:ss A') +
        ' <span class="tz">at epicenter</span>';
      timeTemplate += '<time datetime="{isoTime}">{localTime}</time>';
    }

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
      mag: mag,
      magInt: magInt,
      magType: props.magType || 'M',
      mmi: AppUtil.romanize(props.mmi), // ShakeMap
      place: props.place,
      status: props.status,
      tsunami: props.tsunami,
      url: props.url,
      utcTime: utcTime
    };
    data.bubblesHtml = _getBubbles(data);
    data.timeHtml = L.Util.template(timeTemplate, data);

    // Create popup/tooltip and bind to marker
    popup = L.Util.template(_popupTemplate, data);
    tooltip = L.Util.template(_tooltipTemplate, data);
    layer.bindPopup(popup, {
      autoPanPadding: L.point(50, 50),
      minWidth: '250'
    }).bindTooltip(tooltip);

    // Feed details (set to text description for aftershocks / historical)
    if (_id === 'mainshock') {
      _details = popup; // set to same text as map popup
    }

    // Last earthquake will be last in list; overwrite each time thru loop
    _lastId = eqid;

    // Add props to _plotdata (additional props are added in _pointToLayer)
    _plotdata.depth.push(coords[2] * -1); // return a negative number for depth
    _plotdata.lat.push(coords[1]);
    _plotdata.lon.push(coords[0]);
    _plotdata.mag.push(data.mag);
    _plotdata.text.push(props.title + '<br />' + utcTime);
    _plotdata.time.push(eqMoment.format());

    // Add eq to list for summary
    _eqList[eqid] = L.Util.template(_tablerowTemplate, data);

    // Bin eq totals by magnitude and time; store last aftershock
    if (_id === 'aftershocks') {
      days = Math.floor(Moment.duration(eqMoment - _mainshockMoment).asDays());
      _addEqToBin(days, magInt, 'First');

      days = Math.floor(Moment.duration(_nowMoment - eqMoment).asDays());
      _addEqToBin(days, magInt, 'Past');
    }
    else if (_id === 'historical') {
      days = Math.floor(Moment.duration(_mainshockMoment - eqMoment).asDays());
      _addEqToBin(days, magInt, 'Prior');
    }
  };

  /**
   * Leaflet GeoJSON option: creates markers and plot data from GeoJSON points
   *
   * @param feature {Object}
   * @param latlng {L.LatLng}
   *
   * @return {L.CircleMarker}
   */
  _pointToLayer = function (feature, latlng) {
    var age,
        fillColor,
        props,
        radius;

    props = feature.properties;

    age = _getAge(props.time);
    fillColor = _COLORS[age];
    radius = 3 * parseInt(Math.pow(10, (0.11 * props.mag)), 10);

    _markerOptions.fillColor = fillColor;
    _markerOptions.radius = radius;

    // Add props to _plotdata (additional props are added in _onEachFeature)
    _plotdata.color.push(fillColor);
    _plotdata.size.push(radius * 2); // plotly.js uses diameter

    return L.circleMarker(latlng, _markerOptions);
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Get binned earthquake data
   *
   * @return _bins {Object}
   */
  _this.getBinnedData = function () {
    return _bins;
  };

  /**
   * Get feed details (mainshock) / description (aftershocks, historical)
   *
   * @return _details {String}
   */
  _this.getDetails = function () {
    return _details;
  };

  /**
   * Get id of 'last' (most recent) earthquake in feed (ordered by time-asc)
   *
   * @return {String}
   */
  _this.getLastId = function () {
    return _lastId;
  };

  /**
   * Get a list of earthquakes in feed as html table rows
   *
   * @return _eqList {Object}
   */
  _this.getList = function () {
    return _eqList;
  };

  /**
   * Get data for 3d plot
   *
   * @return _plotdata {Object}
   */
  _this.getPlotData = function () {
    return _plotdata;
  };


  _initialize(options);
  options = null;
  return _this;
};


L.earthquakesLayer = Earthquakes;

module.exports = Earthquakes;
