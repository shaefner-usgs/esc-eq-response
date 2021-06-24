/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
    LatLon = require('util/LatLon'),
    Moment = require('moment');


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
 * Parse earthquakes JSON feed and create Leaflet map layer, Plotly.js traces
 *   and content for SummaryPane (description, slider and tables).
 *
 * @param options {Object}
 *   {
 *     app: {Object} Application
 *     id: {String} Feature's id
 *     json: {Object} Feature's JSON data
 *     sortByField: {String} Default sort field for table
 *   }
 *
 * @return _this {Object}
 *   {
 *     bins: {Object}
 *     createBinTable: {Function}
 *     createDescription: {Function}
 *     createListTable: {Function}
 *     createSlider: {Function}
 *     list: {Array}
 *     mapLayer: {L.layer}
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
      _minMag,
      _nowMoment,
      _pastDayMoment,
      _pastHourMoment,
      _pastWeekMoment,
      _plotData,
      _sortByField,

      _addEqToBin,
      _createBubbles,
      _getAge,
      _getDuration,
      _getIntervals,
      _getLocation,
      _getPlotlyTrace,
      _getTemplate,
      _getThreshold,
      _initBins,
      _onEachFeature,
      _pointToLayer;


  _this = {};

  _initialize = function (options) {
    var coords,
        mainshock;

    options = Object.assign({}, _DEFAULTS, options);

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
    _sortByField = options.sortByField;

    if (_id !== 'mainshock') {
      mainshock = _app.Features.getFeature('mainshock');
      coords = mainshock.json.geometry.coordinates;

      _mainshockLatlon = LatLon(coords[1], coords[0]);
      _mainshockMoment = Moment.utc(mainshock.json.properties.time, 'x');
      _minMag = AppUtil.getParam(AppUtil.lookupPrefix(_id) + '-mag');
      _nowMoment = Moment.utc();
      _pastDayMoment = Moment.utc().subtract(1, 'days');
      _pastHourMoment = Moment.utc().subtract(1, 'hours');
      _pastWeekMoment = Moment.utc().subtract(1, 'weeks');
    }

    _this.bins = {};
    _this.list = [];
    _this.mapLayer = L.geoJson(options.json, {
      onEachFeature: _onEachFeature,
      pointToLayer: _pointToLayer
    });
    _this.plotTraces = {
      magtime: _getPlotlyTrace('magtime', 'scatter'),
      cumulative: _getPlotlyTrace('cumulative', 'scatter'),
      hypocenters: _getPlotlyTrace('hypocenters', 'scatter3d')
    };
  };

  /**
   * Bin earthquakes by magnitude and time period; bin number of eqs by mag.
   *
   * @param days {Integer}
   * @param magInt {Integer}
   * @param type {String <first | past | prior>}
   */
  _addEqToBin = function (days, magInt, type) {
    var i;

    _initBins(magInt, type);

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

    // Number eqs by magnitude, inclusive (M i+ eqs)
    if (type !== 'past') { // don't calculate totals 2x for aftershocks
      for (i = magInt; i >= 0; i --) {
        _this.bins.mag[i] ++;
      }
    }
  };

  /**
   * Create USGS 'impact bubbles' HTML.
   *
   * @param data {Object}
   *
   * @return html {String}
   */
  _createBubbles = function (data) {
    var html,
        template;

    html = '';
    template = '';

    if (data.cdi) { // DYFI
      template += '<a href="{url}/dyfi" class="mmi{cdi}" ' +
        'title="Did You Feel It? maximum reported intensity ({felt} ' +
        'responses)"><strong class="roman">{cdi}</strong>' +
        '<abbr title="Did You Feel It?">DYFI?</abbr></a>';
    }
    if (data.mmi) { // ShakeMap
      template += '<a href="{url}/shakemap" class="mmi{mmi}" ' +
        'title="ShakeMap maximum estimated intensity"><strong class="roman">' +
        '{mmi}</strong><abbr title="ShakeMap">ShakeMap</abbr></a>';
    }
    if (data.alert) { // PAGER
      template += '<a href="{url}/pager" class="pager-alertlevel-' +
        '{alert}" title="PAGER estimated impact alert level"><strong ' +
        'class="roman">{alert}</strong><abbr title="Prompt Assessment of ' +
        'Global Earthquakes for Response">PAGER</abbr></a>';
    }
    if (data.tsunami) { // Tsunami
      template += '<a href="http://www.tsunami.gov/" class="tsunami" ' +
        'title="Tsunami Warning Center"><span class="hover"></span>' +
        '<img src="img/tsunami.png" alt="Tsunami Warning Center"></a>';
    }

    if (template) {
      template = '<div class="impact-bubbles">' + template + '</div>';
      html = L.Util.template(template, data);
    }

    return html;
  };

  /**
   * Get the 'age' of an earthquake (i.e. mainshock, historical, pastday, etc).
   *
   * @param timestamp {Int}
   *     milliseconds since 1970
   *
   * @return age {String}
   */
  _getAge = function (timestamp) {
    var age,
        eqMoment;

    age = _id; // everything but aftershocks

    if (_id === 'aftershocks') {
      eqMoment = Moment.utc(timestamp, 'x'); // unix ms timestamp

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
   * Get the duration of an earthquake sequence.
   *
   * @return duration {Object}
   */
  _getDuration = function () {
    var duration;

    if (_id === 'aftershocks') {
      duration = {
        length: Number(AppUtil.round(
          Moment.duration(_nowMoment - _mainshockMoment).asDays(), 1
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
   * Get time intervals object template. Creating it via a method allows
   *   multiple copies to coexist.
   *
   * @return {Object}
   */
  _getIntervals = function () {
    return {
      day: 0,
      week: 0,
      month: 0,
      year: 0,
      total: 0
    };
  };

  /**
   * Get a formatted lat/lng coordinate pair.
   *
   * @param coords {Array}
   *
   * @return {String}
   */
  _getLocation = function (coords) {
    var lat,
        lng;

    lat = [Math.abs(coords[1]).toFixed(3), '&deg;', (coords[1] < 0 ? 'S':'N')].join('');
    lng = [Math.abs(coords[0]).toFixed(3), '&deg;', (coords[0] < 0 ? 'W':'E')].join('');

    return lat + ', ' + lng;
  };

  /**
   * Get a plot's trace option for plotly.js.
   *
   * @param plotId {String <cumulative | hypocenters | magtime>}
   * @param type {String <scatter | scatter3d>}
   *
   * @return trace {Object || null}
   */
  _getPlotlyTrace = function (plotId, type) {
    var date,
        eqid,
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

    if (plotId === 'cumulative') { // cumulative plot
      mode = 'lines+markers';

      // Copy data arrays so they can be modified w/o affecting orig. data
      date = _plotData.date.slice();
      eqid = _plotData.eqid.slice();
      x = _plotData.time.slice();

      // Fill y with values from 1 to length of x and date field
      y = Array.from(new Array(x.length), function (val, i) {
        return i + 1;
      });

      // Add date field to hover text
      text = y.map(function(val, i) {
        return val + '<br />' + date[i];
      });

      // Add origin point (mainshock) to beginning of aftershocks trace
      if (_id === 'aftershocks') {
        date.unshift(_mainshockMoment.format('MMM D, YYYY HH:mm:ss'));
        eqid.unshift(AppUtil.getParam('eqid'));
        x.unshift(_mainshockMoment.format());
        y.unshift(0);
      }
    } else { // hypocenters, magtime plots
      eqid = _plotData.eqid;
      text = _plotData.text;
    }

    if (plotId === 'hypocenters') {
      mode = 'markers';
      sizeref = 0.79; // adjust eq size for consistency with magtime plots
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

    if (mode === 'markers') { // hypocenters, magtime plots
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
    } else { // cumulative plot
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
   * Get the template HTML for a given type of content.
   *
   * @param type {String <binTable | description | listRow | listTable | popup | slider | subheader>}
   *
   * @return template {String}
   */
  _getTemplate = function (type) {
    var template;

    if (type === 'binTable') {
      template = '<table class="{cssClasses}">' +
          '<tr>' +
            '<th class="period">{type}:</th>' +
            '<th class="day">Day</th>' +
            '<th class="week">Week</th>' +
            '<th class="month">Month</th>' +
            '<th class="year">Year</th>' +
            '<th class="total">Total</th>' +
          '</tr>' +
          '{rows}' +
        '</table>';
    } else if (type === 'description') {
      template = '<p class="description">' +
          '<strong>M {mag}+</strong> earthquakes within <strong>{distance} km</strong> ' +
          'of the mainshock&rsquo;s epicenter{ending}.' +
        '</p>';
    } else if (type === 'listRow') {
      template = '<tr class="m{magInt}" title="View earthquake on map">' +
          '<td class="mag" data-sort="{mag}">{magDisplay}</td>' +
          '<td class="utcTime" data-sort="{isoTime}">{utcTime}</td>' +
          '<td class="location">{location}</td>' +
          '<td class="depth" data-sort="{depth}">{depthDisplay}</td>' +
          '<td class="distance" data-sort="{distance}">{distanceDisplay}</td>' +
          '<td class="eventId">{eqid}</td>' +
        '</tr>';
    } else if (type === 'listTable') {
      template = '<table class="{cssClasses}">' +
          '<tr class="no-sort">' +
            '<th class="{mag}" data-sort-method="number" data-sort-order="desc">Mag</th>' +
            '<th class="{utcTime}" data-sort-order="desc">Time (UTC)</th>' +
            '<th class="{location}">Location</th>' +
            '<th class="{depth}" data-sort-method="number">Depth</th>' +
            '<th class="{distance}" data-sort-method="number">' +
              '<abbr title="Distance and direction from mainshock">Distance</abbr>' +
            '</th>' +
            '<th class="{eventId}">Event ID</th>' +
          '</tr>' +
          '{rows}' +
        '</table>';
    } else if (type === 'popup') { // Leaflet popups, mainshock details on edit/summary panes
      template = '<div class="earthquake {cssClass}">' +
          '<h4><a href="{url}">{title}</a></h4>' +
          '{bubblesHtml}' +
          '<dl>' +
            '<dt>Time</dt>' +
            '<dd>{timeHtml}</dd>' +
            '<dt>Location</dt>' +
            '<dd>{location}</dd>' +
            '<dt>Depth</dt>' +
            '<dd>{depthDisplay}</dd>' +
            '<dt class="distance">' +
              '<abbr title="Distance and direction from mainshock">Distance</abbr>' +
            '</dt>' +
            '<dd class="distance">{distanceDisplay}</dd>' +
            '<dt>Status</dt>' +
            '<dd class="status">{status}</dd>' +
          '</dl>' +
        '</div>';
    } else if (type === 'slider') {
      template = _getTemplate('subheader') +
        '<div class="filter">' +
          '<label for="{id}">Filter by magnitude</label>' +
          '<div class="slider-container">' +
            '<div class="min">{min}</div>' +
            '<div class="inverted slider" style="--min:{min}; --max:{max}; --val:{mag};">' +
              '<input id="{id}" type="range" min="{min}" max="{max}" value="{mag}"/>' +
              '<output for="{id}">{mag}</output>' +
            '</div>' +
            '<div class="max">{max}</div>' +
          '</div>' +
        '</div>';
    } else if (type === 'subheader') {
      template = '<h3>' +
          'M <span class="mag">{mag}</span>+ Earthquakes <span class="count">{count}</span>' +
        '</h3>';
    }

    return template;
  };

  /**
   * Get the magnitude threshold where no more than maxNumEqs will be visible by
   *   default.
   *
   * @return threshold {Number}
   */
  _getThreshold = function () {
    var magBins,
        maxMag,
        maxNumEqs,
        threshold;

    magBins = _this.bins.mag;
    maxMag = magBins.length - 1; // 0-based Array
    maxNumEqs = 25; // max number to display by default
    threshold = maxMag; // default

    magBins.some(function(number, magInt) {
      if (number <= maxNumEqs) {
        threshold = magInt;
        return true;
      }
    });

    if (threshold < _minMag) { // happens when there's no smaller mag eqs
      threshold = Math.floor(_minMag);
    }

    return threshold;
  };

  /**
   * Initialize the object templates for storing binned data.
   *
   * @param magInt {Integer}
   * @param type {String}
   */
  _initBins = function (magInt, type) {
    var i;

    // Range slider (filter)
    if (!_this.bins.mag) {
      _this.bins.mag = [];
    }
    for (i = magInt; i >= 0; i --) {
      if (!_this.bins.mag[i]) {
        _this.bins.mag[i] = 0;
      }
    }

    // Tables (all rows, including total)
    if (!_this.bins[type]) {
      _this.bins[type] = {
        total: _getIntervals()
      };
    }
    if (!_this.bins[type]['m ' + magInt]) {
      _this.bins[type]['m ' + magInt] = _getIntervals();
    }
  };

  /**
   * Create Leaflet popups, tooltips and data for summary, plots; add earthquake
   *   to bins.
   *
   * @param feature {Object}
   *     geoJSON feature
   * @param layer (L.Layer)
   */
  _onEachFeature = function (feature, layer) {
    var bearing,
        bearingString,
        compassPoints,
        coords,
        cssClass,
        days,
        distance,
        eq,
        eqMoment,
        eqMomentLocal,
        latlon,
        localTime,
        magDisplay,
        magType,
        popup,
        props,
        template,
        tooltip,
        utcTime;

    coords = feature.geometry.coordinates;
    props = feature.properties;
    eqMoment = Moment.utc(props.time, 'x');
    magType = props.magType || 'M';
    magDisplay = magType + ' ' + AppUtil.round(props.mag, 1);
    template = '<time datetime="{isoTime}">{utcTime}</time>';
    utcTime = eqMoment.format('MMM D, YYYY HH:mm:ss') + ' <span class="tz">UTC</span>';
    tooltip = magDisplay + ' - ' + utcTime;

    // Add local time if tz prop included in feed
    if (props.tz) {
      eqMomentLocal = eqMoment.clone().utcOffset(props.tz);
      localTime = eqMomentLocal.format('MMM D, YYYY h:mm:ss A') +
        ' <span class="tz">at the epicenter</span>';
      template += '<time datetime="{isoTime}">{localTime}</time>';
    }

    if (_id === 'mainshock') {
      cssClass = 'selected';
    } else { // calculate distance/direction from Mainshock
      compassPoints = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'];
      cssClass = '';
      latlon = LatLon(coords[1], coords[0]);
      bearing = _mainshockLatlon.bearing(latlon);
      bearingString = compassPoints[Math.floor((22.5 + (360.0 + bearing) % 360.0) / 45.0)];
      distance = _mainshockLatlon.distanceTo(latlon) / 1000;
    }

    eq = {
      alert: props.alert, // PAGER
      cdi: AppUtil.romanize(props.cdi), // DYFI
      cssClass: cssClass,
      depth: coords[2],
      depthDisplay: AppUtil.round(coords[2], 1) + ' km',
      distance: distance,
      distanceDisplay: AppUtil.round(distance, 1) + ' km <span>' +
        bearingString + '</span>',
      eqid: feature.id,
      felt: props.felt, // DYFI felt reports
      isoTime: eqMoment.toISOString(),
      location: _getLocation(coords),
      localTime: localTime,
      mag: parseFloat(AppUtil.round(props.mag, 1)),
      magInt: Math.floor(props.mag, 1),
      magDisplay: magDisplay,
      mmi: AppUtil.romanize(props.mmi), // ShakeMap
      status: props.status,
      title: magDisplay + ' - ' + props.place,
      tsunami: props.tsunami,
      url: props.url,
      utcTime: utcTime
    };

    // Set additional props that depend on other eq props already being set
    eq.bubblesHtml = _createBubbles(eq);
    eq.timeHtml = L.Util.template(template, eq);

    _this.list.push(eq);

    popup = L.Util.template(_getTemplate('popup'), eq);
    layer.bindPopup(popup, {
      autoPanPaddingTopLeft: L.point(50, 50),
      autoPanPaddingBottomRight: L.point(60, 40),
      maxWidth: 375,
      minWidth: 250
    }).bindTooltip(tooltip);

    // Note: additional plotData props are added in _pointToLayer
    _plotData.date.push(eq.utcTime);
    _plotData.depth.push(coords[2] * -1); // set to negative for 3d plots
    _plotData.eqid.push(eq.eqid);
    _plotData.lat.push(coords[1]);
    _plotData.lon.push(coords[0]);
    _plotData.mag.push(eq.mag);
    _plotData.text.push(eq.title + '<br />' + eq.utcTime);
    _plotData.time.push(eqMoment.format());

    // Bin eq totals by magnitude and time / period
    if (_id === 'aftershocks') {
      days = Math.ceil(Moment.duration(eqMoment - _mainshockMoment).asDays());
      _addEqToBin(days, eq.magInt, 'first');

      days = Math.ceil(Moment.duration(_nowMoment - eqMoment).asDays());
      _addEqToBin(days, eq.magInt, 'past');
    }
    else if (_id === 'historical' || _id === 'foreshocks') {
      days = Math.ceil(Moment.duration(_mainshockMoment - eqMoment).asDays());
      _addEqToBin(days, eq.magInt, 'prior');
    }
  };

  /**
   * Create Leaflet markers and add additional properties to plot data.
   *
   * @param feature {Object}
   *     geoJSON feature
   * @param latlng {L.LatLng}
   *
   * @return {L.CircleMarker}
   */
  _pointToLayer = function (feature, latlng) {
    var fillColor,
        props,
        radius;

    props = feature.properties;
    fillColor = _COLORS[_getAge(props.time)];
    radius = AppUtil.getRadius(AppUtil.round(props.mag, 1));

    _markerOptions.fillColor = fillColor;
    _markerOptions.pane = _id; // put markers in custom Leaflet map pane
    _markerOptions.radius = radius;

    // Note: additional plotData props are added in _onEachFeature
    _plotData.color.push(fillColor);
    _plotData.size.push(radius * 2); // plotly.js uses diameter

    return L.circleMarker(latlng, _markerOptions);
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Create binned earthquake data table HTML.
   *
   * @param type {String <first | past | prior>}
   *
   * @return {String}
   */
  _this.createBinTable = function (type) {
    var data,
        days,
        duration,
        rows,
        tableClasses,
        td,
        tdClasses;

    duration = _getDuration(_id);
    days = Moment.duration(duration.length, duration.interval).asDays();
    rows = '';
    tableClasses = ['bin'];

    if (days <= 30) {
      tableClasses.push('hide-year');
    }

    if (_this.bins[type]) {
      Object.keys(_this.bins[type]).sort().forEach(function(th) {
        rows += '<tr><th class="rowlabel">' + th + '</th>';

        Object.keys(_this.bins[type][th]).forEach(function(period) {
          td = _this.bins[type][th][period];
          tdClasses = [period];

          if (th === 'total') {
            tdClasses.push('total');
          }

          rows += '<td class="' + tdClasses.join(' ') + '">' + td + '</td>';
        });

        rows += '</tr>';
      });
    }

    data = {
      cssClasses: tableClasses.join(' '),
      rows: rows,
      type: type
    };

    return L.Util.template(_getTemplate('binTable'), data);
  };

  /**
   * Create description HTML.
   *
   * @return {String}
   */
  _this.createDescription = function () {
    var data,
        duration,
        ending;

    duration = _getDuration(_id);

    if (_id === 'aftershocks') {
      ending = '. The duration of the aftershock sequence is <strong>' +
        duration.length + ' ' + duration.interval + '</strong>';
    } else {
      ending = ' in the prior <strong>' + duration.length + ' ' +
        duration.interval +  '</strong> before the mainshock';
    }

    data = {
      distance: AppUtil.getParam(AppUtil.lookupPrefix(_id) + '-dist'),
      ending: ending,
      mag: _minMag
    };

    return L.Util.template(_getTemplate('description'), data);
  };

  /**
   * Create earthquake list table HTML.
   *
   * @param type {String}
   *     'all' or 'mostRecent' (Aftershocks only); default is 'all'
   *
   * @return {String}
   */
  _this.createListTable = function (type) {
    var data,
        eqs,
        fields,
        magInt,
        magThreshold,
        rows,
        tableClasses,
        thClasses,
        tr;

    eqs = _this.list;
    fields = ['depth', 'distance', 'eventId', 'location', 'mag', 'utcTime'];
    magThreshold = _getThreshold();
    rows = '';
    tableClasses = ['eqlist'];
    thClasses = {};
    type = type || 'all';

    fields.forEach(function(field) {
      thClasses[field] = [field];

      if (_sortByField && field === _sortByField) {
        thClasses[field].push('sort-default');
      }
    });

    if (type === 'mostRecent') {
      eqs = [_this.list[_this.list.length - 1]];
      magThreshold = 0; // always show most recent eq
    }

    if (eqs.length > 1) {
      tableClasses.push('sortable');
    }

    // Add row (eq) to table data
    eqs.forEach(function(eq) {
      magInt = eq.magInt;
      tr = L.Util.template(_getTemplate('listRow'), eq);

      if (magInt >= magThreshold && tableClasses.indexOf('m' + magInt) === -1) {
        tableClasses.push('m' + magInt); // flag to display mag level by default
      }
      rows += tr;
    });

    data = {
      cssClasses: tableClasses.join(' '),
      rows: rows
    };
    fields.forEach(function(field) {
      data[field] = thClasses[field].join(' ');
    });

    return L.Util.template(_getTemplate('listTable'), data);
  };

  /**
   * Create magnitude range slider (filter) and/or sub header HTML.
   *
   * @return html {String}
   */
  _this.createSlider = function () {
    var data,
        html,
        magThreshold,
        singleMagBin;

    magThreshold = _getThreshold();
    data = {
      count: _this.bins.mag[magThreshold],
      id: _id,
      mag: magThreshold,
      max: _this.bins.mag.length - 1,
      min: Math.floor(_minMag)
    };
    html = '';
    singleMagBin = _this.bins.mag.every(function(value, i, array) {
      return array[0] === value; // all values are the same
    });

    if (!singleMagBin) {
      html = L.Util.template(_getTemplate('slider'), data);
    } else {
      html = L.Util.template(_getTemplate('subheader'), data);
    }

    return html;
  };


  _initialize(options);
  options = null;
  return _this;
};


/**
 * Static method: get the URL for the JSON feed.
 *
 * @param params {Object}
 *     see API Documentation at https://earthquake.usgs.gov/fdsnws/event/1/
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


module.exports = Earthquakes;
