/* global L */
'use strict';


var AppUtil = require('AppUtil'),
    Util = require('hazdev-webutils/src/util/Util');


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
 *     bins: {Object}
 *     getBinnedTable: {Function},
 *     getDescription: {Function},
 *     getListTable: {Function},
 *     getSlider: {Function},
 *     list: {Object},
 *     mapLayer: {L.layer},
 *     plotTraces: {Object}
 *   }
 */
var Earthquakes = function (options) {
  var _this,
      _initialize,

      _app,
      _id,
      _json,
      _listTemplate,
      _mainshockLatlon,
      _mainshockMoment,
      _markerOptions,
      _nowMoment,
      _pastDayMoment,
      _pastHourMoment,
      _pastWeekMoment,
      _plotData,
      _popupTemplate,

      _addEqToBin,
      _filter,
      _getAge,
      _getBubbles,
      _getDuration,
      _getHtmlTemplate,
      _getIntervals,
      _getPlotlyTrace,
      _getRange,
      _onEachFeature,
      _pointToLayer;


  _this = {};

  _initialize = function (options) {
    var coords,
        mainshock;

    options = Util.extend({}, _DEFAULTS, options);

    _app = options.app;
    _id = options.id;
    _json = options.json;
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
    _listTemplate = _getHtmlTemplate('list');
    _popupTemplate = _getHtmlTemplate('popup');

    if (_id !== 'mainshock') {
      mainshock = _app.Features.getFeature('mainshock');
      coords = mainshock.json.geometry.coordinates;

      // Parameters used to calculate days and distance/direction from mainshock
      _mainshockLatlon = AppUtil.LatLon(coords[1], coords[0]);
      _mainshockMoment = AppUtil.Moment.utc(mainshock.json.properties.time, 'x');
      _nowMoment = AppUtil.Moment.utc();
      _pastDayMoment = AppUtil.Moment.utc().subtract(1, 'days');
      _pastHourMoment = AppUtil.Moment.utc().subtract(1, 'hours');
      _pastWeekMoment = AppUtil.Moment.utc().subtract(1, 'weeks');
    }

    _this.bins = {};
    _this.list = [];
    _this.mapLayer = L.geoJson(_json, {
      filter: _filter,
      onEachFeature: _onEachFeature,
      pointToLayer: _pointToLayer
    });
    _this.plotTraces = {
      magtime: _getPlotlyTrace('magtime', 'scatter'),
      cumulative: _getPlotlyTrace('cumulative', 'scatter'),
      hypocenters: _getPlotlyTrace('hypocenters', 'scatter3d')
    };
    _this.range = _getRange();
  };

  /**
   * Bin earthquakes by magnitude / time period; set cumulative earthquakes
   *
   * @param days {Integer}
   * @param magInt {Integer}
   * @param type {String <first | past | prior>}
   */
  _addEqToBin = function (days, magInt, type) {
    var i;

    // Initialize template for storing binned data (if necessary)
    if (!_this.bins.cumulative) {
      _this.bins.cumulative = []; // slider data
    }
    if (!_this.bins[type]) {
      _this.bins[type] = {
        total: _getIntervals() // total row
      };
    }
    if (!_this.bins[type]['m ' + magInt]) {
      _this.bins[type]['m ' + magInt] = _getIntervals(); // magInt row
    }

    // Add eq to appropriate bin(s)
    _this.bins[type]['m ' + magInt].total ++;
    _this.bins[type].total.total ++;
    if (days <= 365) {
      _this.bins[type]['m ' + magInt].year ++;
      _this.bins[type].total.year ++;
      if (days <= 30) {
        _this.bins[type]['m ' + magInt].month ++;
        _this.bins[type].total.month ++;
        if (days <= 7) {
          _this.bins[type]['m ' + magInt].week ++;
          _this.bins[type].total.week ++;
          if (days <= 1) {
            _this.bins[type]['m ' + magInt].day ++;
            _this.bins[type].total.day ++;
          }
        }
      }
    }

    // Cumulative eqs by magnitude (inclusive) for sliders
    if (type !== 'past') { // don't calculate totals 2x for aftershocks
      for (i = magInt; i >= 0; i --) {
        if (!_this.bins.cumulative[i]) {
          _this.bins.cumulative[i] = 0;
        }
        _this.bins.cumulative[i] ++;
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

    mag = AppUtil.round(feature.properties.mag, 1);
    threshold = AppUtil.getParam(AppUtil.lookup(_id) + '-mag');

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
      eqMoment = AppUtil.Moment.utc(timestamp, 'x'); // unix ms timestamp
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
        template;

    bubbles = '';
    template = '';

    if (data.cdi) { // DYFI
      template += '<a href="{url}/dyfi" class="mmi{cdi}" ' +
        'title="Did You Feel It? maximum reported intensity ({felt} ' +
        'responses)"><strong class="roman">{cdi}</strong><br>' +
        '<abbr title="Did You Feel It?">DYFI?</abbr></a>';
    }
    if (data.mmi) { // ShakeMap
      template += '<a href="{url}/shakemap" class="mmi{mmi}" ' +
        'title="ShakeMap maximum estimated intensity"><strong class="roman">' +
        '{mmi}</strong><br><abbr title="ShakeMap">ShakeMap</abbr></a>';
    }
    if (data.alert) { // PAGER
      template += '<a href="{url}/pager" class="pager-alertlevel-' +
        '{alert}" title="PAGER estimated impact alert level"><strong ' +
        'class="roman">{alert}</strong><br><abbr title="Prompt Assessment of ' +
        'Global Earthquakes for Response">PAGER</abbr></a>';
    }
    if (data.tsunami) { // Tsunami
      template += '<a href="http://www.tsunami.gov/" class="tsunami" ' +
        'title="Tsunami Warning Center"><span class="hover"></span>' +
        '<img src="img/tsunami.png" alt="Tsunami Warning Center"></a>';
    }

    if (template) {
      template = '<div class="impact-bubbles">' + template + '</div>';
      bubbles = L.Util.template(template, data);
    }

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
        length: Number(AppUtil.round(
          AppUtil.Moment.duration(_nowMoment - _mainshockMoment).asDays(), 1
        )),
        interval: 'days'
      };
    } else if (_id === 'foreshocks') {
      duration = {
        length: Number(AppUtil.getParam('fs-days')),
        interval: 'days'
      };
    } else if (_id === 'historical') {
      duration = {
        length: Number(AppUtil.getParam('hs-years')),
        interval: 'years'
      };
    }

    return duration;
  };

  /**
   * Get HTML template for content
   *   Leaflet's L.Util.template is used to populate values
   *
   * @param type {String <list | popup>}
   *
   * @return template {String}
   */
  _getHtmlTemplate = function (type) {
    var template;

    if (type === 'list') { // lists on summary pane
      template = '<tr class="m{magInt}">' +
        '<td class="mag" data-sort="{mag}">{displayMag}</td>' +
        '<td class="utcTime" data-sort="{isoTime}">{utcTime}</td>' +
        '<td class="latlng">{latlng}</td>' +
        '<td class="depth" data-sort="{depth}">{displayDepth}</td>' +
        '<td class="distance" data-sort="{distance}">{displayDistance}</td>' +
        '<td class="eqid">{eqid}</td>' +
      '</tr>';
    } else if (type === 'popup') { // Leaflet popups, mainshock details on edit/summary panes
      template = '<div class="earthquake">' +
        '<h4><a href="{url}">{title}</a></h4>' +
        '{bubblesHtml}' +
        '<dl>' +
          '<dt>Time</dt>' +
          '<dd>{timeHtml}</dd>' +
          '<dt>Location</dt>' +
          '<dd>{latlng}</dd>' +
          '<dt>Depth</dt>' +
          '<dd>{displayDepth} km</dd>' +
          '<dt>Status</dt>' +
          '<dd>{status}</dd>' +
        '</dl>' +
      '</div>';
    }

    return template;
  };

  /**
   * Get time intervals object template for storing binned eq data
   *
   * @return intervals {Object}
   */
  _getIntervals = function () {
    var intervals = {
      day: 0,
      week: 0,
      month: 0,
      year: 0,
      total: 0
    };

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
        mainshockId = AppUtil.getParam('eqid');
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
   * Get the magnitude range for the list of earthquakes, including the initial
   *   'cutoff' magnitude for which smaller events are not displayed by default
   *
   * @return {Object}
   *   {
   *     initial: {Integer},
   *     max: {Integer},
   *     min: {Integer}
   *   }
   */
  _getRange = function () {
    var cumulativeEqs,
        initial,
        max,
        maxNumberEqs,
        min;

    if (_id === 'mainshock' || _json.metadata.count === 0) { // not applicable
      return;
    }

    cumulativeEqs = _this.bins.cumulative; // cumulative eqs indexed by mag
    max = cumulativeEqs.length - 1;
    initial = max; // default to highest mag eq in list
    maxNumberEqs = 25; // max number of eqs to display by default
    min = Math.floor(AppUtil.getParam(AppUtil.lookup(_id) + '-mag'));

    // Find the mag level where the number of eqs is less than maxNumberEqs
    cumulativeEqs.some(function(number, magInt) {
      if (number <= maxNumberEqs) {
        initial = magInt;
        return true; // stop looking
      }
    });

    // Can get set to less than minimum value when there's no smaller mag events
    if (initial < min) {
      initial = min;
    }

    return {
      initial: initial,
      max: max,
      min: min
    };
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
        displayMag,
        distance,
        eqMoment,
        eqMomentLocal,
        latlon,
        localTime,
        magType,
        popup,
        props,
        timeTemplate,
        tooltip,
        utcTime;

    props = feature.properties;
    magType = props.magType || 'M';
    coords = feature.geometry.coordinates;
    displayMag = magType + ' ' + AppUtil.round(props.mag, 1);
    eqMoment = AppUtil.Moment.utc(props.time, 'x');

    // Time field for leaflet popup, etc.
    utcTime = eqMoment.format('MMM D, YYYY HH:mm:ss') + ' <span class="tz">UTC</span>';
    timeTemplate = '<time datetime="{isoTime}">{utcTime}</time>';
    if (props.tz) { // calculate local time if tz prop included in feed
      eqMomentLocal = eqMoment.clone().utcOffset(props.tz);
      localTime = eqMomentLocal.format('MMM D, YYYY h:mm:ss A') +
        ' <span class="tz">at the epicenter</span>';
      timeTemplate += '<time datetime="{isoTime}">{localTime}</time>';
    }

    if (_id === 'mainshock') { // add verbose time props to mainshock
      if (eqMomentLocal) {
        _this.localTime = eqMomentLocal.format('dddd MMMM D, YYYY h:mm:ss A');
      }
      _this.utcTime = eqMoment.format('dddd MMMM D, YYYY HH:mm:ss.SSS');
    } else { // calculate distance/direction from mainshock
      compassPoints = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'];
      latlon = AppUtil.LatLon(coords[1], coords[0]);
      distance = _mainshockLatlon.distanceTo(latlon) / 1000;
      bearing = _mainshockLatlon.bearing(latlon);
      bearingString = compassPoints[Math.floor((22.5 + (360.0 + bearing) % 360.0) / 45.0)];
    }

    data = {
      alert: props.alert, // PAGER
      cdi: AppUtil.romanize(props.cdi), // DYFI
      depth: coords[2],
      displayDepth: AppUtil.round(coords[2], 1) + ' km',
      displayDistance: AppUtil.round(distance, 1) + ' km <span>' +
        bearingString + '</span>',
      displayMag: displayMag,
      distance: distance,
      eqid: feature.id,
      felt: props.felt, // DYFI felt reports
      isoTime: eqMoment.toISOString(),
      latlng: AppUtil.round(coords[1], 3) + ', ' + AppUtil.round(coords[0], 3),
      localTime: localTime,
      mag: parseFloat(AppUtil.round(props.mag, 1)),
      magInt: Math.floor(AppUtil.round(props.mag, 1)),
      mmi: AppUtil.romanize(props.mmi), // ShakeMap
      status: props.status,
      title: displayMag + ' - ' + props.place,
      tsunami: props.tsunami,
      url: props.url,
      utcTime: utcTime
    };

    // Set additional props that depend on other data props already being set
    data.bubblesHtml = _getBubbles(data);
    data.timeHtml = L.Util.template(timeTemplate, data);

    // Create popup/tooltip and bind to marker
    popup = L.Util.template(_popupTemplate, data);
    tooltip = data.displayMag + ' - ' + data.utcTime;
    layer.bindPopup(popup, {
      autoPanPaddingTopLeft: L.point(50, 50),
      autoPanPaddingBottomRight: L.point(60, 40),
      maxWidth: 350,
      minWidth: 250
    }).bindTooltip(tooltip);

    _this.list.push(data); // store eq details for summary table

    // Add props to plotData (additional props are added in _pointToLayer)
    _plotData.date.push(utcTime);
    _plotData.depth.push(coords[2] * -1); // return a negative number for depth
    _plotData.eqid.push(data.eqid);
    _plotData.lat.push(coords[1]);
    _plotData.lon.push(coords[0]);
    _plotData.mag.push(data.mag);
    _plotData.text.push(data.title + '<br />' + utcTime);
    _plotData.time.push(eqMoment.format());

    // Bin eq totals by magnitude and time / period
    if (_id === 'aftershocks') {
      days = Math.ceil(AppUtil.Moment.duration(eqMoment -
        _mainshockMoment).asDays());
      _addEqToBin(days, data.magInt, 'first');

      days = Math.ceil(AppUtil.Moment.duration(_nowMoment -
        eqMoment).asDays());
      _addEqToBin(days, data.magInt, 'past');
    }
    else if (_id === 'historical' || _id === 'foreshocks') {
      days = Math.ceil(AppUtil.Moment.duration(_mainshockMoment -
        eqMoment).asDays());
      _addEqToBin(days, data.magInt, 'prior');
    }
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
    radius = AppUtil.getRadius(props.mag);

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
        td;

    cssClasses = ['bin'];
    duration = _getDuration(_id);
    html = '';

    days = AppUtil.Moment.duration(duration.length, duration.interval).asDays();
    if (days <= 30) {
      cssClasses.push('hide-year');
    }

    if (_this.bins[type]) {
      html = '<table class="' + cssClasses.join(' ') + '">' +
        '<tr>' +
          '<th class="period">' + type + ':</th>' +
          '<th class="day">Day</th>' +
          '<th class="week">Week</th>' +
          '<th class="month">Month</th>' +
          '<th class="year">Year</th>' +
          '<th class="total">Total</th>' +
        '</tr>';

      Object.keys(_this.bins[type]).sort().forEach(function(th) {
        html += '<tr><th class="rowlabel">' + th + '</th>';

        Object.keys(_this.bins[type][th]).forEach(function(period) {
          cssClasses = [period];
          if (th === 'total') {
            cssClasses.push('total');
          }
          td = _this.bins[type][th][period];
          html += '<td class="' + cssClasses.join(' ') + '">' + td + '</td>';
        });

        html += '</tr>';
      });

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

    distance = AppUtil.getParam(AppUtil.lookup(_id) + '-dist');
    duration = _getDuration(_id);
    mag = AppUtil.getParam(AppUtil.lookup(_id) + '-mag');

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
   * Get an html table containing a list of earthquakes
   *   eqs smaller than magThreshold are not displayed by default
   *
   * @param eqs {Array}
   *     list of earthquake objects
   * @param magThreshold {Number}
   *     optional; magnitude threshold for default display
   *
   * @return html {String}
   */
  _this.getListTable = function (eqs, magThreshold) {
    var cssClasses,
        html,
        magInt,
        tableData,
        threshold,
        tr;

    cssClasses = ['eqlist'];
    tableData = '';
    threshold = magThreshold || 0;

    eqs.forEach(function(eq) {
      magInt = eq.magInt;
      tr = L.Util.template(_listTemplate, eq);

      if (magInt >= threshold && cssClasses.indexOf('m' + magInt) === -1) {
        cssClasses.push('m' + magInt); // flag to display mag level by default
      }

      tableData += tr;
    });

    if (eqs.length > 1) {
      cssClasses.push('sortable');
    }

    html = '<table class="' + cssClasses.join(' ') + '">' +
        '<tr class="no-sort">' +
          '<th class="mag" data-sort-method="number" data-sort-order="desc">Mag</th>' +
          '<th class="utcTime sort-default" data-sort-order="desc">Time (UTC)</th>' +
          '<th class="latlng">Location</th>' +
          '<th class="depth" data-sort-method="number">Depth</th>' +
          '<th class="distance" data-sort-method="number">' +
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
   * @return html {String}
   */
  _this.getSlider = function () {
    var html,
        singleMagBin;

    html = '';
    singleMagBin = _this.bins.cumulative.every(function(value, i, array) {
      return array[0] === value; // all values are the same
    });

    if (!singleMagBin) {
      html = '<div class="filter">' +
          '<h4>Filter earthquake list by magnitude</h4>' +
          '<div class="min">' + _this.range.min + '</div>' +
          '<div class="inverted slider" style="--min: ' + _this.range.min +
            '; --max: ' + _this.range.max + '; --val: ' + _this.range.initial +
            ';"><input id="' + _id + '" type="range" min="' + _this.range.min +
            '" max="' + _this.range.max + '" value="' + _this.range.initial +
            '"/><output for="'+ _id + '">' + _this.range.initial + '</output>' +
          '</div>' +
          '<div class="max">' + _this.range.max + '</div>' +
        '</div>';
    }

    return html;
  };

  /**
   * Get header for magnitude range slider (filter)
   *
   * @return {String}
   */
  _this.getSubHeader = function () {
    var mag,
        num;

    mag = _this.range.initial;
    num = _this.bins.cumulative[mag];

    return '<h3>M <span class="mag">' + mag + '</span>+ Earthquakes ' +
      '(<span class="num">' + num + '</span>)</h3>';
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
