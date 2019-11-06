/* global L */
'use strict';


var Util = require('hazdev-webutils/src/util/Util');


var _COLORS,
    _DEFAULTS,
    _MARKER_DEFAULTS;

_COLORS = {
  historical: '#dde',
  foreshocks: '#99a',
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
 * Parse earthquakes json feed and create Leaflet map layer, Plotly.js traces
 *   and content (description, sliders and tables) for summary pane.
 *
 * @param options {Object}
 *   {
 *     app: {Object}, // Application
 *     id: {String}, // Feature id
 *     json: {Object} // Feature json data
 *   }
 *
 * @return _this {Object}
 *   {
 *     getBinnedTable: {Function},
 *     getDescription: {Function},
 *     getListTable: {Function},
 *     getSlider: {Function},
 *     list: {Object},
 *     magInclusive: {Array},
 *     mapLayer: {L.layer},
 *     mostRecentEqId: {String},
 *     plotTraces: {Object}
 *   }
 */
var Earthquakes = function (options) {
  var _this,
      _initialize,

      _app,
      _id,
      _mainshockLatlon,
      _mainshockMoment,
      _markerOptions,
      _nowMoment,
      _pastDayMoment,
      _pastHourMoment,
      _pastWeekMoment,
      _plotData,
      _popupTemplate,
      _tablerowTemplate,
      _tooltipTemplate,

      _addEqToBin,
      _filter,
      _getAge,
      _getBubbles,
      _getDuration,
      _getHtmlTemplate,
      _getIntervals,
      _getPlotlyTrace,
      _onEachFeature,
      _pointToLayer;


  _this = {};

  _initialize = function (options) {
    var coords,
        mainshock;

    options = Util.extend({}, _DEFAULTS, options);

    _app = options.app;
    _id = options.id;
    _markerOptions = options.markerOptions;
    _plotData = {
      color: [],
      date: [],
      depth: [],
      eqid: [],
      lat: [],
      lon: [],
      mag: [],
      size: [],
      text: [],
      time: []
    };
    // Templates for creating HTML using L.Util.template utility
    _popupTemplate = _getHtmlTemplate('popup');
    _tablerowTemplate = _getHtmlTemplate('tablerow');
    _tooltipTemplate = _getHtmlTemplate('tooltip');

    if (_id !== 'mainshock') {
      mainshock = _app.Features.getFeature('mainshock');
      coords = mainshock.json.geometry.coordinates;

      // Parameters used to calculate days and distance/direction from mainshock
      _mainshockLatlon = _app.AppUtil.LatLon(coords[1], coords[0]);
      _mainshockMoment = _app.AppUtil.Moment.utc(mainshock.json.properties.time, 'x');
      _nowMoment = _app.AppUtil.Moment.utc();
      _pastDayMoment = _app.AppUtil.Moment.utc().subtract(1, 'days');
      _pastHourMoment = _app.AppUtil.Moment.utc().subtract(1, 'hours');
      _pastWeekMoment = _app.AppUtil.Moment.utc().subtract(1, 'weeks');
    }

    _this.bins = {};
    _this.list = {};
    _this.mapLayer = L.geoJson(options.json, {
      filter: _filter,
      onEachFeature: _onEachFeature,
      pointToLayer: _pointToLayer
    });
    _this.plotTraces = {
      magtime: _getPlotlyTrace('magtime', 'scatter'),
      cumulative: _getPlotlyTrace('cumulative', 'scatter'),
      hypocenters: _getPlotlyTrace('hypocenters', 'scatter3d')
    };
    _this.magInclusive = _this.bins.total;
  };

  /**
   * Bin earthquakes by magnitude and time period (type)
   *   also bin mag totals (inclusive)
   *
   * @param days {Integer}
   * @param magInt {Integer}
   * @param type {String <first | past | prior | total>}
   */
  _addEqToBin = function (days, magInt, type) {
    var i,
        intervals;

    if (!_this.bins[type]) {
      _this.bins[type] = []; // initialize type array
    }

    if (type === 'total') { // all eqs binned by mag inclusive
      for (i = magInt; i >= 0; i --) {
        if (!_this.bins.total[i]) {
          _this.bins.total[i] = 0;
        }
        _this.bins.total[i] ++;
      }
    } else { // first, past, or prior
      if (!_this.bins[type][magInt]) {
        intervals = _getIntervals(); // get intervals Object template
        _this.bins[type][magInt] = intervals;
      }

      // Add eq to bins
      _this.bins[type][magInt].total ++;
      if (days <= 365) {
        _this.bins[type][magInt].year ++;
        if (days <= 30) {
          _this.bins[type][magInt].month ++;
          if (days <= 7) {
            _this.bins[type][magInt].week ++;
            if (days <= 1) {
              _this.bins[type][magInt].day ++;
            }
          }
        }
      }
    }
  };

  /**
   * Filter out eq mags below threshold - there might be some below threshold
   * b/c query thresholds are decreased by 0.05 to account for rounding mags to
   * nearest tenth
   *
   * @param feature {Object}
   *     geojson feature
   *
   * @return {Boolean}
   */
  _filter = function (feature) {
    var mag,
        threshold;

    mag = _app.AppUtil.round(feature.properties.mag, 1);
    threshold = _app.AppUtil.getParam(_app.AppUtil.lookup(_id) + '-mag');

    if (mag >= threshold || _id === 'mainshock') { // don't filter out mainshock
      return true;
    }
  };

  /**
   * Get 'age' of earthquake (mainshock, pasthour, pastday, historical, etc)
   *
   * @param timestamp {Int}
   *     milliseconds since 1970
   *
   * @return age {String}
   */
  _getAge = function (timestamp) {
    var age,
        eqMoment;

    age = _id; // for everything except aftershocks

    if (_id === 'aftershocks') {
      eqMoment = _app.AppUtil.Moment.utc(timestamp, 'x'); // unix ms timestamp
      if (eqMoment.isSameOrAfter(_pastHourMoment)) {
        age = 'pasthour';
      } else if (eqMoment.isSameOrAfter(_pastDayMoment)) {
        age = 'pastday';
      } else if (eqMoment.isSameOrAfter(_pastWeekMoment)) {
        age = 'pastweek';
      } else {
        age = 'older';
      }
    }

    return age;
  };

  /**
   * Get USGS 'Bubbles' (DYFI, ShakeMap, etc) HTML for popups
   *
   * @param data {Object}
   *
   * @return bubbles {String}
   */
  _getBubbles = function (data) {
    var bubbles,
        bubblesTemplate;

    bubblesTemplate = '';
    if (data.cdi) { // DYFI
      bubblesTemplate += '<a href="{url}/dyfi" class="mmi{cdi}" ' +
        'title="Did You Feel It? maximum reported intensity ({felt} ' +
        'responses)"><strong class="roman">{cdi}</strong><br>' +
        '<abbr title="Did You Feel It?">DYFI?</abbr></a>';
    }
    if (data.mmi) { // ShakeMap
      bubblesTemplate += '<a href="{url}/shakemap" class="mmi{mmi}" ' +
        'title="ShakeMap maximum estimated intensity"><strong class="roman">' +
        '{mmi}</strong><br><abbr title="ShakeMap">ShakeMap</abbr></a>';
    }
    if (data.alert) { // PAGER
      bubblesTemplate += '<a href="{url}/pager" class="pager-alertlevel-' +
        '{alert}" title="PAGER estimated impact alert level"><strong ' +
        'class="roman">{alert}</strong><br><abbr title="Prompt Assessment of ' +
        'Global Earthquakes for Response">PAGER</abbr></a>';
    }
    if (data.tsunami) {
      bubblesTemplate += '<a href="http://www.tsunami.gov/" class="tsunami" ' +
        'title="Tsunami Warning Center"><span class="hover"></span>' +
        '<img src="img/tsunami.png" alt="Tsunami Warning Center"></a>';
    }
    bubbles = L.Util.template(bubblesTemplate, data);

    return bubbles;
  };

  /**
   * Get the duration of an earthquake sequence
   *
   * @return duration {Object}
   */
  _getDuration = function () {
    var duration;

    if (_id === 'aftershocks') {
      duration = {
        'length': Number(_app.AppUtil.round(
          _app.AppUtil.Moment.duration(_nowMoment - _mainshockMoment).asDays(), 1
        )),
        'interval': 'days'
      };
    } else if (_id === 'foreshocks') {
      duration = {
        'length': Number(_app.AppUtil.getParam('fs-days')),
        'interval': 'days'
      };
    } else if (_id === 'historical') {
      duration = {
        'length': Number(_app.AppUtil.getParam('hs-years')),
        'interval': 'years'
      };
    }

    return duration;
  };

  /**
   * Get HTML template for content
   *   Leaflet's L.Util.template is used to populate values
   *
   * @param type {String <popup | tablerow | tooltip>}
   *
   * @return template {String}
   */
  _getHtmlTemplate = function (type) {
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
    } else if (type === 'tablerow') {
      template = '<tr class="m{magInt}">' +
        '<td class="mag" data-sort="{mag}">{magType} {mag}</td>' +
        '<td class="time" data-sort="{isoTime}">{utcTime}</td>' +
        '<td class="location">{latlng}</td>' +
        '<td class="depth" data-sort="{depth}">{depth} km</td>' +
        '<td class="distance" data-sort="{distance}">{distance} km <span>{distanceDir}</span></td>' +
        '<td class="eqid">{eqid}</td>' +
      '</tr>';
    } else if (type === 'tooltip') {
      template = 'M {mag} - {utcTime}';
    }

    return template;
  };

  /**
   * Get time intervals object template for storing binned eq data
   *
   * @return intervals {Object}
   */
  _getIntervals = function () {
    var intervals = {};

    intervals.day = 0;
    intervals.week = 0;
    intervals.month = 0;
    intervals.year = 0;
    intervals.total = 0;

    return intervals;
  };

  /**
   * Get plot's trace option for plotly.js
   *
   * @param plotId {String <cumulative | hypocenters | magtime>}
   * @param type {String <scatter | scatter3d>}
   *
   * @return trace {Object || null}
   */
  _getPlotlyTrace = function (plotId, type) {
    var date,
        eqid,
        mainshockId,
        mode,
        sizeref,
        text,
        trace,
        x,
        y,
        z;

    if (_plotData.date.length === 0) {
      return;
    }

    if (plotId === 'cumulative') {
      mode = 'lines+markers';

      // Copy data arrays so they can be modified w/o affecting orig. data
      date = _plotData.date.slice();
      eqid = _plotData.eqid.slice();
      x = _plotData.time.slice();

      // Fill y with values from 1 to length of x
      y = Array.from(new Array(x.length), function (val, i) {
        return i + 1;
      });

      // Add origin point (mainshock) to beginning of aftershocks trace
      if (_id === 'aftershocks') {
        mainshockId = _app.AppUtil.getParam('eqid');
        date.unshift(_mainshockMoment.format('MMM D, YYYY HH:mm:ss'));
        eqid.unshift(mainshockId);
        x.unshift(_mainshockMoment.format());
        y.unshift(0);
      }

      // Add date field to hover text
      text = y.map(function(val, i) {
        return val + '<br />' + date[i];
      });
    } else {
      eqid = _plotData.eqid;
      text = _plotData.text;
    }
    if (plotId === 'hypocenters') {
      mode = 'markers';
      sizeref = 0.79; // Plotly doesn't honor size value on 3d plots; adjust it.
      x = _plotData.lon;
      y = _plotData.lat;
      z = _plotData.depth;
    } else if (plotId === 'magtime') {
      mode = 'markers';
      sizeref = 1;
      x = _plotData.time;
      y = _plotData.mag;
    }

    trace = {
      eqid: eqid,
      feature: _id,
      hoverinfo: 'text',
      hoverlabel: {
        font: {
          size: 15
        }
      },
      mode: mode,
      plotid: plotId,
      text: text,
      type: type,
      x: x,
      y: y,
      z: z
    };

    if (mode === 'markers') { // hypocenters or magtime plot
      trace.marker = {
        color: _plotData.color, // fill
        line: { // stroke
          color: 'rgb(65, 65, 65)',
          width: 1
        },
        opacity: 0.85,
        size: _plotData.size,
        sizeref: sizeref
      };
    } else { // cumulative plot (mode = lines+markers)
      trace.line = {
        color: 'rgb(120, 186, 232)',
        width: 2
      };
      trace.marker = {
        color: 'rgb(120, 186, 232)', // fill
        line: { // stroke
          color: 'rgb(31, 119, 180)',
          width: 1
        },
        size: 3
      };
    }

    return trace;
  };

  /**
   * Create Leaflet popups, tooltips and data for summary, plots; add earthquake
   *   to bins
   *
   * @param feature {Object}
   *     geojson feature
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
        eqMomentLocal,
        latlon,
        localTime,
        mag,
        magInt,
        popup,
        props,
        timeTemplate,
        tooltip,
        utcTime;

    props = feature.properties;

    coords = feature.geometry.coordinates;
    eqid = feature.id;
    eqMoment = _app.AppUtil.Moment.utc(props.time, 'x');
    eqMomentLocal = eqMoment.clone().utcOffset(props.tz);
    mag = _app.AppUtil.round(props.mag, 1);
    magInt = Math.floor(mag);

    // Time field for leaflet popup, etc.
    utcTime = eqMoment.format('MMM D, YYYY HH:mm:ss') + ' <span class="tz">UTC</span>';
    timeTemplate = '<time datetime="{isoTime}">{utcTime}</time>';
    if (props.tz) { // calculate local time if tz prop included in feed
      localTime = eqMomentLocal.format('MMM D, YYYY h:mm:ss A') +
        ' <span class="tz">at epicenter</span>';
      timeTemplate += '<time datetime="{isoTime}">{localTime}</time>';
    }

    if (_id === 'mainshock') { // add time props to mainshock
      _this.localTime = eqMomentLocal.format('dddd MMMM D, YYYY h:mm:ss A');
      _this.utcTime = eqMoment.format('dddd MMMM D, YYYY HH:mm:ss.SSS');
    } else { // calculate distance/direction from mainshock
      compassPoints = [' N', 'NE', ' E', 'SE', ' S', 'SW', ' W', 'NW', ' N'];
      latlon = _app.AppUtil.LatLon(coords[1], coords[0]);
      distance = _mainshockLatlon.distanceTo(latlon) / 1000;
      bearing = _mainshockLatlon.bearing(latlon);
      bearingString = compassPoints[Math.floor((22.5 + (360.0 + bearing) % 360.0) / 45.0)];
    }

    data = {
      alert: props.alert, // PAGER
      cdi: _app.AppUtil.romanize(props.cdi), // DYFI
      depth: _app.AppUtil.round(coords[2], 1),
      distance: _app.AppUtil.round(distance, 1),
      distanceDir: bearingString,
      eqid: eqid,
      felt: props.felt, // DYFI felt reports
      isoTime: eqMoment.toISOString(),
      latlng: _app.AppUtil.round(coords[1], 3) + ', ' + _app.AppUtil.round(coords[0], 3),
      localTime: localTime,
      mag: mag,
      magInt: magInt,
      magType: props.magType || 'M',
      mmi: _app.AppUtil.romanize(props.mmi), // ShakeMap
      place: props.place,
      status: props.status,
      tsunami: props.tsunami,
      url: props.url,
      utcTime: utcTime
    };

    // Set additional props that depend on other props already being set
    data.bubblesHtml = _getBubbles(data);
    data.timeHtml = L.Util.template(timeTemplate, data);

    // Create popup/tooltip and bind to marker
    popup = L.Util.template(_popupTemplate, data);
    tooltip = L.Util.template(_tooltipTemplate, data);
    layer.bindPopup(popup, {
      autoPanPaddingTopLeft: L.point(50, 50),
      autoPanPaddingBottomRight: L.point(60, 40),
      maxWidth: 350,
      minWidth: 250
    }).bindTooltip(tooltip);

    _this.list[eqid] = data; // store eq details for summary table
    _this.mostRecentEqId = eqid; // most recent (last) earthquake in feed

    // Add props to plotData (additional props are added in _pointToLayer)
    _plotData.date.push(utcTime);
    _plotData.depth.push(coords[2] * -1); // return a negative number for depth
    _plotData.eqid.push(data.eqid);
    _plotData.lat.push(coords[1]);
    _plotData.lon.push(coords[0]);
    _plotData.mag.push(data.mag);
    _plotData.text.push(props.title + '<br />' + utcTime);
    _plotData.time.push(eqMoment.format());

    // Bin eq totals by magnitude and time / period
    if (_id === 'aftershocks') {
      days = Math.ceil(_app.AppUtil.Moment.duration(eqMoment -
        _mainshockMoment).asDays());
      _addEqToBin(days, magInt, 'first');

      days = Math.ceil(_app.AppUtil.Moment.duration(_nowMoment -
        eqMoment).asDays());
      _addEqToBin(days, magInt, 'past');
    }
    else if (_id === 'historical' || _id === 'foreshocks') {
      days = Math.ceil(_app.AppUtil.Moment.duration(_mainshockMoment -
        eqMoment).asDays());
      _addEqToBin(days, magInt, 'prior');
    }

    // Total number of eqs by magnitude (inclusive)
    _addEqToBin(null, magInt, 'total');
  };

  /**
   * Create Leaflet markers and add additional properties to plot data
   *
   * @param feature {Object}
   *     geojson feature
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
    radius = _app.AppUtil.getRadius(props.mag);

    _markerOptions.fillColor = fillColor;
    _markerOptions.pane = _id; // put markers in custom Leaflet map pane
    _markerOptions.radius = radius;

    // Add props to plotData (additional props are added in _onEachFeature)
    _plotData.color.push(fillColor);
    _plotData.size.push(radius * 2); // plotly.js uses diameter

    return L.circleMarker(latlng, _markerOptions);
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Get a table containing binned earthquake data
   *
   * @param type {String <first | past | prior>}
   *
   * @return html {String}
   */
  _this.getBinnedTable = function (type) {
    var cssClasses,
        days,
        duration,
        html,
        intervalTotals,
        value;

    cssClasses = ['bin'];
    duration = _getDuration(_id);
    html = '';
    intervalTotals = _getIntervals(); // get intervals Object template

    days = _app.AppUtil.Moment.duration(duration.length, duration.interval).asDays();
    if (days <= 30) {
      cssClasses.push('hide-year');
    }

    if (_this.bins[type] && _this.bins[type].length > 0) {
      html = '<table class="' + cssClasses.join(' ') + '">' +
        '<tr>' +
          '<th class="period">' + type + ':</th>' +
          '<th class="day">Day</th>' +
          '<th class="week">Week</th>' +
          '<th class="month">Month</th>' +
          '<th class="year">Year</th>' +
          '<th class="total">Total</th>' +
        '</tr>';

      _this.bins[type].forEach(function(intervals, mag) { // loop thru magnitude groups
        html += '<tr><th class="rowlabel">M ' + mag + '</th>';

        Object.keys(intervals).forEach(function(interval) {
          value = intervals[interval];
          intervalTotals[interval] += value;
          html += '<td class="' + interval + '">' + value + '</td>';
        });

        html += '</tr>'; // add row total as last column
      });

      // Add column total as last row
      html += '<tr><th class="rowlabel">Total</th>';

      Object.keys(intervalTotals).forEach(function(interval) {
        value = intervalTotals[interval];
        html += '<td class="' + interval + ' total">' + value + '</td>';
      });

      html += '</tr>';
      html += '</table>';
    }

    return html;
  };

  /**
   * Get a description (summary of user-set parameters, etc.) of feature
   *
   * @return description {String}
   */
  _this.getDescription = function () {
    var description,
        distance,
        duration,
        mag;

    distance = _app.AppUtil.getParam(_app.AppUtil.lookup(_id) + '-dist');
    duration = _getDuration(_id);
    mag = _app.AppUtil.getParam(_app.AppUtil.lookup(_id) + '-mag');

    description = '<p class="description"><strong>M ' + mag + '+</strong> ' +
      'earthquakes within <strong>' + distance + ' km</strong> of the ' +
      'mainshock&rsquo;s epicenter';

    if (_id === 'aftershocks') {
      description += '. The duration of the aftershock sequence is <strong>' +
        duration.length + ' ' + duration.interval + '</strong>';
    } else {
      description += ' in the prior <strong>' + duration.length + ' ' +
        duration.interval +  '</strong> before the mainshock';
    }

    description += '.</p>';

    return description;
  };

  /**
   * Get a table containing a list of earthquakes
   *   only displays eqs larger than threshold (if supplied) by default
   *
   * @param data {Object}
   *     earthquake details keyed by eqid
   * @param magThreshold {Number}
   *     optional; magnitude threshold
   *
   * @return html {String}
   */
  _this.getListTable = function (data, magThreshold) {
    var cssClasses,
        html,
        magInt,
        tableData,
        threshold,
        tr;

    cssClasses = ['eqlist'];
    threshold = magThreshold || 0;
    tableData = '';

    Object.keys(data).forEach(function(key) {
      magInt = data[key].magInt;
      tr = L.Util.template(_tablerowTemplate, data[key]);

      if (magInt >= threshold && cssClasses.indexOf('m' + magInt) === -1) {
        cssClasses.push('m' + magInt);
      }

      tableData += tr;
    });

    if (Object.keys(data).length > 1) {
      cssClasses.push('sortable');
    }

    html = '<table class="' + cssClasses.join(' ') + '">' +
        '<tr class="no-sort">' +
          '<th data-sort-method="number" data-sort-order="desc">Mag</th>' +
          '<th data-sort-order="desc" class="sort-default">Time (UTC)</th>' +
          '<th class="location">Location</th>' +
          '<th data-sort-method="number">Depth</th>' +
          '<th data-sort-method="number">' +
            '<abbr title="Distance and direction from mainshock">Distance</abbr>' +
          '</th>' +
          '<th class="eqid">Event ID</th>' +
        '</tr>' +
        tableData +
      '</table>';

    return html;
  };

  /**
   * Get a range slider (filter) when there's at least two magnitude bins w/ eqs
   *
   * @param mag {Number}
   *
   * @return html {String}
   */
  _this.getSlider = function (mag) {
    var html,
        mags,
        max,
        min,
        singleMagBin;

    html = '';
    singleMagBin = _this.bins.total.every(function(value, i, array) {
      return array[0] === value;
    });

    if (!singleMagBin) {
      mags = Object.keys(_this.bins.total);
      max = Math.max.apply(null, mags);
      min = Math.floor(_app.AppUtil.getParam(_app.AppUtil.lookup(_id) + '-mag'));

      html = '<div class="filter">' +
          '<h4>Filter earthquakes by magnitude</h4>' +
          '<div class="min">' + min + '</div>' +
          '<div class="inverted slider" style="--min: ' + min + '; --max: ' +
            max + '; --val: ' + mag + ';">' +
            '<input id="' + _id + '" type="range" min="' + min + '" max="' +
            max + '" value="' + mag + '"/>' +
            '<output for="'+ _id + '">' + mag + '</output>' +
          '</div>' +
          '<div class="max">' + max + '</div>' +
        '</div>';
    }

    return html;
  };


  _initialize(options);
  options = null;
  return _this;
};


/**
 * Static method: get the feed url for Earthquakes Features
 *
 * @param params {Object}
 *     See API Documentation at https://earthquake.usgs.gov/fdsnws/event/1/
 *
 * @return {String}
 */
Earthquakes.getFeedUrl = function (params) {
  var baseUri,
      pairs,
      queryString;

  baseUri = 'https://earthquake.usgs.gov/fdsnws/event/1/query';

  pairs = ['format=geojson', 'orderby=time-asc'];
  Object.keys(params).forEach(function(key) {
    pairs.push(key + '=' + params[key]);
  });
  queryString = '?' + pairs.join('&');

  return baseUri + queryString;
};


L.earthquakesLayer = Earthquakes;

module.exports = Earthquakes;
