/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
    LatLon = require('util/LatLon'),
    Luxon = require('luxon');


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
  older: '#ffc'
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
 * Parse a JSON feed containing a list of earthquakes and create a Leaflet map
 * layer, Plotly traces and components for creating the description,
 * range slider and tables).
 *
 * @param options {Object}
 *   {
 *     app: {Object} Application
 *     id: {String} Feature's id
 *     json: {Object} Feature's JSON data
 *     sortByField: {String} initial sortby field for table - optional; default is ''
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
      _duration,
      _featureId,
      _mainshockLatlon,
      _mainshockTime,
      _mainshockTitle,
      _markerOptions,
      _minMag,
      _now,
      _pastDay,
      _pastHour,
      _pastWeek,
      _plotData,
      _sortByField,

      _addEqToBin,
      _addListeners,
      _getAge,
      _getBubbles,
      _getDuration,
      _getIntervals,
      _getLocation,
      _getPlotlyTrace,
      _getPopup,
      _getTemplate,
      _getThreshold,
      _initBins,
      _onEachFeature,
      _pointToLayer;


  _this = {};

  _initialize = function (options) {
    var coords,
        inputId,
        mainshock,
        type;

    options = Object.assign({}, _DEFAULTS, options);
    type = options.type;

    _app = options.app;
    _featureId = options.id;
    _markerOptions = options.markerOptions;
    _now = Luxon.DateTime.utc();
    _pastDay = _now.minus({ days: 1 });
    _pastHour = _now.minus({ hours: 1 });
    _pastWeek = _now.minus({ weeks: 1 });
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
      title: [],
      time: []
    };
    _sortByField = options.sortByField || '';

    if (_featureId !== 'mainshock' && type !== 'search') {
      inputId = AppUtil.getPrefix(_featureId) + '-mag';
      mainshock = _app.Features.getFeature('mainshock');
      coords = mainshock.json.geometry.coordinates;

      _mainshockLatlon = LatLon(coords[1], coords[0]);
      _mainshockTime = Luxon.DateTime.fromMillis(mainshock.json.properties.time).toUTC();
      _mainshockTitle = mainshock.details.title;
      _minMag = document.getElementById(inputId).value;
      _duration = _getDuration();
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
   * @param type {String <first|past|prior>}
   */
  _addEqToBin = function (days, magInt, type) {
    _initBins(magInt, type);

    // Add eq to appropriate bin(s) for tables
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

    // Number of eqs by magnitude, inclusive (M i+ eqs) for range slider
    if (type !== 'past') { // don't calculate totals 2x for Aftershocks
      for (var i = magInt; i >= 0; i --) {
        _this.bins.mag[i] ++;
      }
    }
  };

  /**
   * Add event listener for 'Select' button in popups.
   *
   * @param el {Element}
   * @param eqid {String}
   */
  _addListeners = function(el, eqid) {
    var button,
        input;

    button = el.querySelector('button');
    input = document.getElementById('eqid');

    button.addEventListener('click', () => {
      input.value = eqid;

      // Input event is not triggered when it's changed programmatically
      _app.SelectBar.handleMainshock();
    });
  };

  /**
   * Get the 'age' of an earthquake (i.e. mainshock, historical, pastday, etc).
   *
   * @param timestamp {Int}
   *
   * @return age {String}
   */
  _getAge = function (timestamp) {
    var age,
        eqTime;

    age = _featureId; // everything but Aftershocks, Search

    if (_featureId === 'aftershocks' || _featureId === 'search') {
      eqTime = Luxon.DateTime.fromMillis(timestamp).toUTC();

      if (eqTime >= _pastHour) {
        age = 'pasthour';
      } else if (eqTime >= _pastDay) {
        age = 'pastday';
      } else if (eqTime >= _pastWeek) {
        age = 'pastweek';
      } else {
        age = 'older';
      }
    }

    return age;
  };

  /**
   * Get the USGS 'impact bubbles' HTML templates.
   *
   * @param data {Object}
   *
   * @return bubbles {Object}
   */
  _getBubbles = function (data) {
    var bubbles = {};

    if (data.cdi) { // DYFI
      bubbles.dyfi = L.Util.template(
        '<a href="{url}/dyfi" class="mmi{cdi}" title="Maximum reported ' +
          'intensity ({felt} responses)">' +
          '<strong class="roman">{cdi}</strong>' +
          '<abbr title="Did You Feel It?">DYFI?</abbr>' +
        '</a>', data
      );
    }

    if (data.mmi) { // ShakeMap
      bubbles.shakemap = L.Util.template(
        '<a href="{url}/shakemap" class="mmi{mmi}" title="Maximum estimated intensity">' +
          '<strong class="roman">{mmi}</strong>' +
          '<abbr title="ShakeMap">ShakeMap</abbr>' +
        '</a>', data
      );
    }

    if (data.alert) { // PAGER
      bubbles.pager = L.Util.template(
        '<a href="{url}/pager" class="pager-alertlevel-{alert}" title="' +
          'Estimated impact alert level">' +
          '<strong class="roman">{alert}</strong>' +
          '<abbr title="Prompt Assessment of Global Earthquakes for Response">PAGER</abbr>' +
        '</a>', data
      );
    }

    if (data.tsunami) {
      bubbles.tsunami = L.Util.template(
        '<a href="http://www.tsunami.gov/" class="tsunami" title="Tsunami ' +
          'Warning Center">' +
          '<span class="hover"></span>' +
          '<img src="img/tsunami.png" alt="Tsunami Warning Center">' +
        '</a>', data
      );
    }

    return bubbles;
  };

  /**
   * Get the duration of an earthquake sequence.
   *
   * @return duration {Object}
   */
  _getDuration = function () {
    var duration,
        fsInputId,
        hsInputId,
        interval;

    if (_featureId === 'aftershocks') {
      interval = Luxon.Interval.fromDateTimes(_mainshockTime, _now).length('days');
      duration = {
        days: Number(AppUtil.round(interval, 1))
      };
    } else if (_featureId === 'foreshocks') {
      fsInputId = AppUtil.getPrefix(_featureId) + '-days';
      duration = {
        days: Number(document.getElementById(fsInputId).value)
      };
    } else if (_featureId === 'historical') {
      hsInputId = AppUtil.getPrefix(_featureId) + '-years';
      duration = {
        years: Number(document.getElementById(hsInputId).value)
      };
    }

    return duration;
  };

  /**
   * Get time intervals Object template for binned data. Creating it via a
   * method allows multiple copies to coexist.
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

    lat = [Math.abs(coords[1]).toFixed(3), '°', (coords[1] < 0 ? 'S':'N')].join('');
    lng = [Math.abs(coords[0]).toFixed(3), '°', (coords[0] < 0 ? 'W':'E')].join('');

    return lat + ', ' + lng;
  };

  /**
   * Get a plot's trace option for Plotly.
   *
   * @param plotId {String <cumulative|hypocenters|magtime>}
   * @param type {String <scatter|scatter3d>}
   *
   * @return trace {Object|undefined}
   */
  _getPlotlyTrace = function (plotId, type) {
    var date,
        eqid,
        mode,
        sizeref,
        text,
        title,
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
      title = _plotData.title.slice();
      x = _plotData.time.slice();

      // Fill y with values from 1 to length of x and date field
      y = Array.from(new Array(x.length), (val, i) => {
        return i + 1;
      });

      // Add origin point (Mainshock) to beginning of Aftershocks trace
      if (_featureId === 'aftershocks') {
        date.unshift(_mainshockTime.toFormat('LLL d, yyyy TT'));
        eqid.unshift(AppUtil.getParam('eqid'));
        title.unshift(_mainshockTitle);
        x.unshift(_mainshockTime.toISO());
        y.unshift(0);
      } else if (_featureId === 'historical') { // and to end of Historical trace
        date.push(_mainshockTime.toFormat('LLL d, yyyy TT'));
        eqid.push(AppUtil.getParam('eqid'));
        title.push(_mainshockTitle);
        x.push(_mainshockTime.toISO());
        y.push(y.length + 1);
      }

      // Add date field to hover text
      text = y.map((val, i) => {
        if (
          (i === 0 && _featureId === 'aftershocks') ||
          (i === y.length - 1 && _featureId === 'historical')
        ) {
          val = 'Mainshock';
        }

        return `${title[i]} (${val})<br />${date[i]}`;
      });
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
      feature: _featureId,
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
   * Get the Leaflet popup content for a given earthquake.
   *
   * @param eq {Object}
   *
   * @return div {Element}
   */
  _getPopup = function (eq) {
    var bubbles,
        div,
        popup;

    bubbles = '';
    div = L.DomUtil.create('div');

    Object.keys(eq.bubbles).forEach(type => {
      bubbles += eq.bubbles[type];
    });

    popup = L.Util.template(_getTemplate('popup'),
      Object.assign({}, eq, {
        bubbles: bubbles
      })
    );
    div.innerHTML = popup;

    _addListeners(div, eq.eqid);

    return div;
  };

  /**
   * Get the template HTML for a given type of content.
   *
   * @param type {String <binTable|description|listRow|listTable|popup|slider|subheader>}
   *
   * @return template {String}
   */
  _getTemplate = function (type) {
    var template = '';

    if (type === 'binTable') {
      template =
        '<table class="{classNames}">' +
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
      template =
        '<p class="description">' +
          '<strong>M {mag}+</strong> earthquakes within <strong>{distance} ' +
          'km</strong> of the mainshock’s epicenter{ending}.' +
        '</p>';
    } else if (type === 'listRow') {
      template =
        '<tr class="m{magInt}" title="View earthquake on map">' +
          '<td class="mag" data-sort="{mag}"><span>{magType} </span>{magDisplay}</td>' +
          '<td class="utcTime" data-sort="{isoTime}">{utcTime}</td>' +
          '<td class="location">{location}</td>' +
          '<td class="depth" data-sort="{depth}">{depthDisplay}</td>' +
          '<td class="distance" data-sort="{distance}">{distanceDisplay}</td>' +
          '<td class="eqid">{eqid}</td>' +
        '</tr>';
    } else if (type === 'listTable') {
      template =
        '<div class="wrapper">' +
          '<table class="{classNames}">' +
            '<thead>' +
              '<tr class="no-sort">' +
                '<th class="{mag}" data-sort-method="number" data-sort-order="desc">Mag</th>' +
                '<th class="{utcTime}" data-sort-order="desc">Time (UTC)</th>' +
                '<th class="{location}">Location</th>' +
                '<th class="{depth}" data-sort-method="number">Depth</th>' +
                '<th class="{distance}" data-sort-method="number">' +
                  '<abbr title="Distance and direction from mainshock">Distance</abbr>' +
                '</th>' +
                '<th class="{eqid}">Event ID</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>' +
              '{rows}' +
            '</tbody>' +
          '</table>' +
        '</div>';
    } else if (type === 'popup') {
      template =
        '<div class="earthquake {className}">' +
          '<h4>{title}</h4>' +
          '<div class="impact-bubbles">{bubbles}</div>' +
          '<dl>' +
            '<dt>Time</dt>' +
            '<dd>{htmlTime}</dd>' +
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
          '<button type="button">Select</button>' +
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
      template =
        '<h3>' +
          'M <span class="mag">{mag}</span>+ Earthquakes <span class="count">{count}</span>' +
        '</h3>';
    }

    return template;
  };

  /**
   * Get the magnitude threshold where no more than maxNumEqs will be visible by
   * default.
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

    magBins.some((number, magInt) => {
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
   * Initialize the Object templates for storing binned data.
   *
   * @param magInt {Integer}
   * @param type {String}
   */
  _initBins = function (magInt, type) {
    // Range slider (filter)
    if (!_this.bins.mag) {
      _this.bins.mag = [];
    }
    for (var i = magInt; i >= 0; i --) {
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
   * Create Leaflet popups, tooltips and data for summary and plots; add
   * earthquake to bins.
   *
   * @param feature {Object}
   *     geoJSON feature
   * @param layer {L.Layer}
   */
  _onEachFeature = function (feature, layer) {
    var bearing,
        bearingString,
        className,
        compassPoints,
        coords,
        days,
        distance,
        distanceDisplay,
        eq,
        eqTime,
        eqTimeLocal,
        latlon,
        localTime,
        mag,
        magDisplay,
        magType,
        props,
        template,
        tooltip,
        utcTime;

    className = _featureId;
    coords = feature.geometry.coordinates;
    props = feature.properties;
    eqTime = Luxon.DateTime.fromMillis(props.time).toUTC();
    magDisplay = AppUtil.round(props.mag, 1);
    mag = parseFloat(magDisplay);
    magType = props.magType || 'M';
    template = '<time datetime="{isoTime}">{utcTime}</time>';
    utcTime = eqTime.toFormat('LLL d, yyyy TT') + ' <span class="tz">UTC</span>';
    tooltip = magType + ' ' + magDisplay + ' - ' + utcTime;

    // Add local time if tz prop is included in feed
    if (props.tz) {
      eqTimeLocal = eqTime().toUTC(props.tz);
      localTime = eqTimeLocal.toFormat('LLL d, yyyy tt') +
        ' <span class="tz">at the epicenter</span>';
      template += '<time datetime="{isoTime}">{localTime}</time>';
    }

    // Calculate distance/direction from Mainshock
    if (_featureId !== 'mainshock' && _featureId !== 'search') {
      compassPoints = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'];
      latlon = LatLon(coords[1], coords[0]);
      bearing = _mainshockLatlon.bearing(latlon);
      bearingString = compassPoints[Math.floor((22.5 + (360.0 + bearing) % 360.0) / 45.0)];
      distance = _mainshockLatlon.distanceTo(latlon) / 1000;
      distanceDisplay = AppUtil.round(distance, 1) + ' km <span>' +
        bearingString + '</span>';
    }

    eq = {
      alert: props.alert || '', // PAGER
      cdi: AppUtil.romanize(props.cdi), // DYFI
      className: className,
      depth: coords[2],
      depthDisplay: AppUtil.round(coords[2], 1) + ' km',
      distance: distance || '',
      distanceDisplay: distanceDisplay || '',
      eqid: feature.id,
      felt: AppUtil.addCommas(props.felt), // DYFI felt reports
      isoTime: eqTime.toISO(),
      location: _getLocation(coords),
      localTime: localTime || '',
      mag: mag,
      magInt: Math.floor(mag, 1),
      magDisplay: magDisplay,
      magType: magType,
      mmi: AppUtil.romanize(props.mmi), // ShakeMap
      status: props.status,
      title: magType + ' ' + magDisplay + ' - ' + props.place,
      tsunami: props.tsunami,
      url: props.url,
      utcTime: utcTime
    };

    // Set additional props that depend on other eq props already being set
    eq.bubbles = _getBubbles(eq);
    eq.htmlTime = L.Util.template(template, eq);

    _this.list.push(eq);

    layer.bindPopup(_getPopup(eq), {
      autoPanPaddingTopLeft: L.point(50, 130),
      autoPanPaddingBottomRight: L.point(50, 50),
      maxWidth: 375,
      minWidth: 250
    }).bindTooltip(tooltip);

    // Note: additional plotData props are added in _pointToLayer()
    _plotData.date.push(eq.utcTime);
    _plotData.depth.push(coords[2] * -1); // set to negative for 3d plots
    _plotData.eqid.push(eq.eqid);
    _plotData.lat.push(coords[1]);
    _plotData.lon.push(coords[0]);
    _plotData.mag.push(eq.mag);
    _plotData.text.push(eq.title + '<br />' + eq.utcTime);
    _plotData.title.push(eq.title);
    _plotData.time.push(eqTime.toISO());

    // Bin eq totals by magnitude and time / period
    if (_featureId === 'aftershocks') {
      days = Math.ceil(Luxon.Interval.fromDateTimes(_mainshockTime, eqTime).length('days'));
      _addEqToBin(days, eq.magInt, 'first');

      days = Math.ceil(Luxon.Interval.fromDateTimes(eqTime, _now).length('days'));
      _addEqToBin(days, eq.magInt, 'past');
    }
    else if (_featureId === 'historical' || _featureId === 'foreshocks') {
      days = Math.ceil(Luxon.Interval.fromDateTimes(eqTime, _mainshockTime).length('days'));
      _addEqToBin(days, eq.magInt, 'prior');
    }
  };

  /**
   * Create Leaflet markers and data for plots.
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
    _markerOptions.pane = _featureId; // custom Leaflet pane to control stacking order
    _markerOptions.radius = radius;

    // Note: additional plotData props are added in _onEachFeature
    _plotData.color.push(fillColor);
    _plotData.size.push(radius * 2); // Plotly uses diameter

    return L.circleMarker(latlng, _markerOptions);
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Create binned earthquake data table HTML.
   *
   * @param type {String <first|past|prior>}
   *
   * @return {String}
   */
  _this.createBinTable = function (type) {
    var data,
        days,
        rows,
        tableClasses,
        td,
        tdClasses;

    days = Luxon.Duration.fromObject(_duration).as('days');
    rows = '';
    tableClasses = ['bin'];

    if (days <= 30) {
      tableClasses.push('hide-year');
    }

    if (_this.bins[type]) {
      Object.keys(_this.bins[type]).sort().forEach(th => {
        rows += `<tr><th class="rowlabel">${th}</th>`;

        Object.keys(_this.bins[type][th]).forEach(period => {
          td = _this.bins[type][th][period];
          tdClasses = [period];

          if (th === 'total') {
            tdClasses.push('total');
          }

          rows += `<td class="${tdClasses.join(' ')}">${td}</td>`;
        });

        rows += '</tr>';
      });
    }

    data = {
      classNames: tableClasses.join(' '),
      rows: rows,
      type: type
    };

    return L.Util.template(_getTemplate('binTable'), data);
  };

  /**
   * Create Feature description HTML.
   *
   * @return {String}
   */
  _this.createDescription = function () {
    var data,
        distance,
        ending,
        inputId,
        interval,
        length;

    inputId = AppUtil.getPrefix(_featureId) + '-dist';
    distance = document.getElementById(inputId).value;
    interval = Object.keys(_duration)[0];
    length = _duration[interval];

    if (_featureId === 'aftershocks') {
      ending = '. The duration of the aftershock sequence is <strong>' +
        `${length} ${interval}</strong>`;
    } else {
      ending = ` in the prior <strong>${length} ${interval} ` +
        '</strong> before the mainshock';
    }

    data = {
      distance: distance,
      ending: ending,
      mag: _minMag
    };

    return L.Util.template(_getTemplate('description'), data);
  };

  /**
   * Create earthquake list table HTML.
   *
   * @param type {String <all|mostRecent>} default is 'all'
   *     'mostRecent' is for Aftershocks only
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

    data = {};
    eqs = _this.list;
    fields = ['depth', 'distance', 'eqid', 'location', 'mag', 'utcTime'];
    magThreshold = _getThreshold();
    rows = '';
    tableClasses = ['list'];
    thClasses = {};
    type = type || 'all';

    if (type === 'mostRecent') {
      eqs = [_this.list[_this.list.length - 1]];
      magThreshold = 0; // always show most recent eq
    }
    if (eqs.length > 1) {
      tableClasses.push('sortable');
    }

    // Add row (eq) to table
    eqs.forEach(eq => {
      magInt = eq.magInt;
      tr = L.Util.template(_getTemplate('listRow'), eq);
      rows += tr;

      if (magInt >= magThreshold && tableClasses.indexOf('m' + magInt) === -1) {
        tableClasses.push('m' + magInt); // flag to display mag level by default
      }
    });

    data = {
      classNames: tableClasses.join(' '),
      rows: rows
    };

    fields.forEach(field => {
      thClasses[field] = [field];

      if (_sortByField && field === _sortByField) {
        thClasses[field].push('sort-default');
      }

      data[field] = thClasses[field].join(' ');
    });

    return L.Util.template(_getTemplate('listTable'), data);
  };

  /**
   * Create magnitude range slider (filter) and/or subheader HTML.
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
      id: _featureId,
      mag: magThreshold,
      max: _this.bins.mag.length - 1,
      min: Math.floor(_minMag)
    };
    html = '';
    singleMagBin = _this.bins.mag.every((value, i, array) => {
      return array[0] === value; // all values are the same
    });

    if (singleMagBin) {
      html = L.Util.template(_getTemplate('subheader'), data);
    } else {
      html = L.Util.template(_getTemplate('slider'), data); // includes subheader
    }

    return html;
  };


  _initialize(options);
  options = null;
  return _this;
};


/**
 * Static method to get the URL of the earthquakes JSON feed.
 *
 * @param params {Object}
 *     see API Documentation at https://earthquake.usgs.gov/fdsnws/event/1/
 *
 * @return {String}
 */
Earthquakes.getFeedUrl = function (params) {
  var baseUri,
      defaults,
      pairs;

  baseUri = 'https://earthquake.usgs.gov/fdsnws/event/1/query';
  defaults = {
    format: 'geojson',
    orderby: 'time-asc'
  };
  pairs = [];
  params = Object.assign({}, defaults, params);

  delete params.period; // internal property (search API rejects 'foreign' props)

  Object.keys(params).forEach(key => {
    pairs.push(key + '=' + params[key]);
  });

  return baseUri + '?' + pairs.join('&');
};


module.exports = Earthquakes;
