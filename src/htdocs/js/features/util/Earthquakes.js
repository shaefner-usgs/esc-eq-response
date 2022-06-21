/* global L */
'use strict';


require('leaflet/L.GeoJSON.DateLine');

var AppUtil = require('util/AppUtil'),
    LatLon = require('util/LatLon'),
    Luxon = require('luxon'),
    Plots = require('features/util/Plots');


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
  older: '#ffd'
};
_MARKER_DEFAULTS = {
  color: '#000',
  fillOpacity: 0.85,
  opacity: 0.6,
  weight: 1
};
_DEFAULTS = {
  json: {},
  markerOptions: _MARKER_DEFAULTS,
  sortByField: ''
};


/**
 * Parse an earthquake JSON feed and create the Leaflet map layer, Plotly params
 * and the components used to create the description, tables and range slider
 * for the SummaryPane.
 *
 * @param options {Object}
 *   {
 *     app: {Object} Application
 *     id: {String} Feature's id
 *     json: {Object} Feature's JSON data
 *     sortByField: {String} initial sortby field for table (optional)
 *   }
 *
 * @return _this {Object}
 *   {
 *     bins: {Object}
 *     count: {Integer}
 *     createBinTable: {Function}
 *     createDescription: {Function}
 *     createListTable: {Function}
 *     createSlider: {Function}
 *     data: {Array}
 *     mapLayer: {L.layer}
 *     plots: {Object}
 *   }
 */
var Earthquakes = function (options) {
  var _this,
      _initialize,

      _app,
      _catalog,
      _distanceParam,
      _duration,
      _featureId,
      _magParam,
      _mainshock,
      _markerOptions,
      _now,
      _pastDay,
      _pastHour,
      _pastWeek,
      _sortByField,

      _addEqToBin,
      _addListeners,
      _filter,
      _getAge,
      _getBubbles,
      _getData,
      _getDirection,
      _getDuration,
      _getIntervals,
      _getPopup,
      _getPrefix,
      _getTemplate,
      _getThreshold,
      _getTooltip,
      _initBins,
      _onEachFeature,
      _pointToLayer;


  _this = {};

  _initialize = function (options) {
    var inputIdDist, inputIdMag;

    options = Object.assign({}, _DEFAULTS, options);

    _app = options.app;
    _catalog = AppUtil.getParam('catalog') || 'comcat';
    _featureId = options.id;
    _markerOptions = options.markerOptions;
    _now = Luxon.DateTime.utc();
    _pastDay = _now.minus({ days: 1 }),
    _pastHour = _now.minus({ hours: 1 }),
    _pastWeek = _now.minus({ weeks: 1 });
    _sortByField = options.sortByField;

    if (_featureId === 'search') {
      _catalog = 'comcat'; // search layer always ComCat, despite catalog param
    }

    if (_featureId !== 'mainshock' && _featureId !== 'search') {
      inputIdDist = _getPrefix(_featureId) + '-dist';
      inputIdMag = _getPrefix(_featureId) + '-mag';

      _distanceParam = document.getElementById(inputIdDist).value;
      _mainshock = _app.Features.getFeature('mainshock');
      _duration = _getDuration();
      _magParam = document.getElementById(inputIdMag).value;

      if (!_mainshock.Latlon) {
        _mainshock.Latlon = LatLon(_mainshock.data.lat, _mainshock.data.lon);
      }
    }

    _this.bins = {};
    _this.count = 0;
    _this.data = _getData(options.json);
    _this.mapLayer = L.geoJSON.dateLine(options.json, {
      filter: _filter,
      onEachFeature: _onEachFeature,
      pointToLayer: _pointToLayer
    });

    if (_featureId !== 'foreshocks' && _featureId !== 'search') {
      _this.plots = Plots({
        app: _app,
        data: _this.data,
        featureId: _featureId
      });
    }
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
   * @param layer {L.layer}
   */
  _addListeners = function(el, eqid, layer) {
    var button = el.querySelector('button'),
        input = document.getElementById('eqid');

    button.addEventListener('click', () => {
      input.value = eqid;

      layer.closePopup();

      // Input event is not triggered when it's changed programmatically
      _app.SelectBar.handleMainshock();
    });
  };

  /**
   * Filter out earthquakes from NCEDC that are outside the search radius.
   *
   * The NCEDC (double difference) catalog does not support radius values
   * for limiting search results, so a rectangle is used instead as a proxy.
   *
   * @param feature {Object}
   *     geoJSON feature
   */
  _filter = function (feature) {
    var eq;

    // Search layer is always from ComCat, not NCEDC
    if (_featureId === 'mainshock' || _featureId === 'search') {
      return ++ _this.count;
    } else if (_catalog === 'dd') {
      eq = _this.data.find(item => item.eqid === feature.id);

      if (eq.distance <= _distanceParam) {
        return ++ _this.count;
      }
    } else {
      return ++ _this.count;
    }
  };

  /**
   * Get the 'age' of an earthquake (i.e. mainshock, historical, pastday, etc).
   *
   * @param time {Luxon datetime}
   *
   * @return age {String}
   */
  _getAge = function (time) {
    var age = _featureId; // everything but Aftershocks, Search

    if (_featureId === 'aftershocks' || _featureId === 'search') {
      if (time >= _pastHour) {
        age = 'pasthour';
      } else if (time >= _pastDay) {
        age = 'pastday';
      } else if (time >= _pastWeek) {
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
        '<a href="{url}/dyfi" class="mmi{cdi} impact-bubble" target="new" ' +
          'title="Maximum reported intensity ({felt} responses)">' +
          '<strong class="roman">{cdi}</strong>' +
          '<abbr title="Did You Feel It?">DYFI?</abbr>' +
        '</a>', data
      );
    }

    if (data.mmi) { // ShakeMap
      bubbles.shakemap = L.Util.template(
        '<a href="{url}/shakemap" class="mmi{mmi} impact-bubble" target="new" ' +
          'title="Maximum estimated intensity">' +
          '<strong class="roman">{mmi}</strong>' +
          '<abbr title="ShakeMap">ShakeMap</abbr>' +
        '</a>', data
      );
    }

    if (data.alert) { // PAGER
      bubbles.pager = L.Util.template(
        '<a href="{url}/pager" class="pager-alertlevel-{alert} impact-bubble" ' +
          'target="new" title="Estimated impact alert level">' +
          '<strong class="roman">{alert}</strong>' +
          '<abbr title="Prompt Assessment of Global Earthquakes for Response">PAGER</abbr>' +
        '</a>', data
      );
    }

    if (data.tsunami) {
      bubbles.tsunami = L.Util.template(
        '<a href="https://www.tsunami.gov/" class="tsunami impact-bubble" ' +
          'target="new" title="Tsunami Warning Center">' +
          '<span class="hover"></span>' +
          '<img src="img/tsunami.png" alt="Tsunami Warning Center">' +
        '</a>', data
      );
    }

    return bubbles;
  };

  /**
   * Get the data used to create the Feature.
   *
   * @param json {Object}
   *
   * @return data {Object}
   *     earthquakes keyed by id
   */
  _getData = function (json) {
    var eq,
        data = [],
        features = json.features || [json];

    features.forEach(feature => {
      var direction, distance, distanceDisplay, latlon, localTime,
          coords = feature.geometry.coordinates,
          props = feature.properties,
          datetime = Luxon.DateTime.fromMillis(props.time).toUTC(),
          format = 'LLL d, yyyy TT',
          magDisplay = AppUtil.round(props.mag, 1),
          mag = parseFloat(magDisplay),
          magType = props.magType || 'M',
          statusIcon = '',
          template = '<time datetime="{isoTime}" class="user">{userTime}</time>' +
            '<time datetime="{isoTime}" class="utc">{utcTime}</time>',
          title = magType + ' ' + magDisplay,
          userTime = datetime.toLocal().toFormat(format) +
            ` <span class="tz">(${_app.utcOffset})</span>`,
          utcTime = datetime.toFormat(format) +
            ' <span class="tz">(UTC)</span>';

      if (_featureId !== 'mainshock' && _featureId !== 'search') {
        latlon = LatLon(coords[1], coords[0]);
        direction = _getDirection(latlon);
        distance = AppUtil.round(_mainshock.Latlon.distanceTo(latlon) / 1000, 2);
        distanceDisplay = AppUtil.round(distance, 1) + ' km ' +
          `<span>${direction}</span>`;
      }

      if (props.place) {
        title += '—' + props.place;
      }

      if (props.status === 'reviewed') {
        statusIcon += '<i class="icon-check"></i>';
      }

      // Add local time (at epicenter) if tz prop is included in feed
      if (props.tz) {
        localTime = datetime.toUTC(props.tz).toFormat('LLL d, yyyy tt') +
          ' <span class="tz">at the epicenter</span>';
        template += '<time datetime="{isoTime}" class="local">{localTime}</time>';
      }

      eq = {
        alert: props.alert || '', // PAGER
        catalog: _catalog,
        cdi: AppUtil.romanize(props.cdi), // DYFI
        datetime: datetime,
        depth: coords[2],
        depthDisplay: AppUtil.round(coords[2], 1) + ' km',
        distance: distance || '',
        distanceDisplay: distanceDisplay || '',
        eqid: feature.id,
        feature: _featureId,
        felt: AppUtil.addCommas(props.felt), // DYFI felt reports
        fillColor: _COLORS[_getAge(datetime)],
        isoTime: datetime.toISO(),
        lat: coords[1],
        localTime: localTime || '',
        location: AppUtil.formatLatLon(coords),
        lon: coords[0],
        mag: mag,
        magDisplay: magDisplay,
        magInt: Math.floor(mag, 1),
        magType: magType,
        mmi: AppUtil.romanize(props.mmi), // ShakeMap
        radius: AppUtil.getRadius(AppUtil.round(props.mag, 1)),
        status: props.status || '',
        statusIcon: statusIcon,
        title: title,
        tsunami: props.tsunami,
        url: props.url,
        userTime: userTime,
        utcTime: utcTime
      };

      // Set additional props that depend on other eq props already being set
      eq.bubbles = _getBubbles(eq);
      eq.timeDisplay = L.Util.template(template, eq);

      data.push(eq);
    });

    return data;
  };

  /**
   * Calculate the direction from the Mainshock.
   *
   * @param latlon {Object}
   *
   * @return {String}
   */
  _getDirection = function (latlon) {
    var bearing = _mainshock.Latlon.bearing(latlon),
        compassPoints = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'],
        octant = Math.floor((22.5 + (360.0 + bearing) % 360.0) / 45.0);

    return compassPoints[octant];
  };

  /**
   * Get the duration of an earthquake sequence.
   *
   * @return duration {Object}
   */
  _getDuration = function () {
    var duration, inputId, interval;

    if (_featureId === 'aftershocks') {
      interval = Luxon.Interval
        .fromDateTimes(_mainshock.data.datetime, _now)
        .length('days');
      duration = {
        days: Number(AppUtil.round(interval, 1))
      };
    } else if (_featureId === 'foreshocks') {
      inputId = _getPrefix(_featureId) + '-days';
      duration = {
        days: Number(document.getElementById(inputId).value)
      };
    } else if (_featureId === 'historical') {
      inputId = _getPrefix(_featureId) + '-years';
      duration = {
        years: Number(document.getElementById(inputId).value)
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
   * Get the Leaflet popup content for a given earthquake.
   *
   * @param eq {Object}
   * @param layer {L.layer}
   *
   * @return div {Element}
   */
  _getPopup = function (eq, layer) {
    var popup,
        bubbles = '',
        div = L.DomUtil.create('div');

    Object.keys(eq.bubbles).forEach(type =>
      bubbles += eq.bubbles[type]
    );

    popup = L.Util.template(_getTemplate('popup'),
      Object.assign({}, eq, {
        bubbles: bubbles
      })
    );
    div.innerHTML = popup;

    _addListeners(div, eq.eqid, layer);

    return div;
  };

  /**
   * Get the URL parameter prefix for a given Feature 'id'.
   *
   * @param id {String}
   *
   * @return {String}
   */
  _getPrefix = function (id) {
    var lookup = {
      aftershocks: 'as',
      foreshocks: 'fs',
      historical: 'hs'
    };

    return lookup[id] || '';
  };

  /**
   * Get the template HTML for a given 'type' of content.
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
          '<td class="userTime" data-sort="{isoTime}">{userTime}</td>' +
          '<td class="utcTime" data-sort="{isoTime}">{utcTime}</td>' +
          '<td class="depth" data-sort="{depth}">{depthDisplay}</td>' +
          '<td class="location">{location}</td>' +
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
                `<th class="{userTime}" data-sort-order="desc">Time <em>(${_app.utcOffset})</em></th>` +
                '<th class="{utcTime}" data-sort-order="desc">Time <em>(UTC)</em></th>' +
                '<th class="{depth}" data-sort-method="number">Depth</th>' +
                '<th class="{location}">Location</th>' +
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
        '<div class="{feature} {catalog} earthquake">' +
          '<h4>{title}</h4>' +
          '<div class="impact-bubbles">{bubbles}</div>' +
          '<dl class="params">' +
            '<dt class="time">Time</dt>' +
            '<dd class="time">{timeDisplay}</dd>' +
            '<dt>Depth</dt>' +
            '<dd>{depthDisplay}</dd>' +
            '<dt>Location</dt>' +
            '<dd>{location}</dd>' +
            '<dt class="distance">' +
              '<abbr title="Distance and direction from mainshock">Distance</abbr>' +
            '</dt>' +
            '<dd class="distance">{distanceDisplay}</dd>' +
            '<dt class="status">Status</dt>' +
            '<dd class="status">{status}{statusIcon}</dd>' +
          '</dl>' +
          '<button type="button">Select</button>' +
        '</div>';
    } else if (type === 'slider') {
      template = _getTemplate('subheader') +
        '<div class="filter">' +
          '<label for="{id}">Filter by magnitude</label>' +
          '<div class="slider-container">' +
            '<div class="min">{min}</div>' +
            '<div class="slider inverted" style="--min:{min}; --max:{max}; --val:{mag};">' +
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
    var magBins = _this.bins.mag,
        maxMag = magBins.length - 1, // 0-based Array
        maxNumEqs = 25, // max number to display by default
        threshold = maxMag; // default

    magBins.some((number, magInt) => {
      if (number <= maxNumEqs) {
        threshold = magInt;

        return true;
      }
    });

    if (threshold < _magParam) { // happens when there's no smaller mag eqs
      threshold = Math.floor(_magParam);
    }

    return threshold;
  };

  /**
   * Get the Leaflet tooltip content for a given earthquake.
   *
   * @param eq {Object}
   *
   * @return tooltip {String}
   */
  _getTooltip = function(eq) {
    var tooltip = eq.magType + ' ' + eq.magDisplay + '—';

    tooltip += `<time datetime="${eq.isoTime}" class="user">${eq.userTime}</time>`;
    tooltip += `<time datetime="${eq.isoTime}" class="utc">${eq.utcTime}</time>`;

    return tooltip;
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
   * Add Leaflet popups and tooltips; add earthquake to bins.
   *
   * @param feature {Object}
   *     geoJSON feature
   * @param layer {L.Layer}
   */
  _onEachFeature = function (feature, layer) {
    var days,
        eq = _this.data.find(item => item.eqid === feature.id);

    layer.bindPopup(_getPopup(eq, layer), {
      maxWidth: 375,
      minWidth: 250
    }).bindTooltip(_getTooltip(eq));

    // Bin eq totals by magnitude and time / period
    if (_featureId === 'aftershocks') {
      days = Math.ceil(
        Luxon.Interval
          .fromDateTimes(_mainshock.data.datetime, eq.datetime)
          .length('days')
      );
      _addEqToBin(days, eq.magInt, 'first');

      days = Math.ceil(
        Luxon.Interval
          .fromDateTimes(eq.datetime, _now)
          .length('days')
      );
      _addEqToBin(days, eq.magInt, 'past');
    } else if (_featureId === 'historical' || _featureId === 'foreshocks') {
      days = Math.ceil(
        Luxon.Interval
          .fromDateTimes(eq.datetime, _mainshock.data.datetime)
          .length('days')
      );
      _addEqToBin(days, eq.magInt, 'prior');
    }
  };

  /**
   * Create Leaflet markers.
   *
   * @param feature {Object}
   *     geoJSON feature
   * @param latlng {L.LatLng}
   *
   * @return {L.CircleMarker}
   */
  _pointToLayer = function (feature, latlng) {
    var eq = _this.data.find(item => item.eqid === feature.id),
        options = Object.assign({}, _markerOptions, {
          fillColor: eq.fillColor,
          pane: _featureId, // controls stacking order
          radius: eq.radius
        });

    return L.circleMarker(latlng, options);
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
    var data, td, tdClasses,
        days = Luxon.Duration.fromObject(_duration).as('days'),
        rows = '',
        tableClasses = ['bin'];

    if (days <= 7) {
      tableClasses.push('hide-month');
    }
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
    var data, ending,
        interval = Object.keys(_duration)[0],
        length = _duration[interval];

    if (_featureId === 'aftershocks') {
      ending = '. The duration of the aftershock sequence is <strong>' +
        `${length} ${interval}</strong>`;
    } else {
      ending = ` in the prior <strong>${length} ${interval} ` +
        '</strong> before the mainshock';
    }

    data = {
      distance: _distanceParam,
      ending: ending,
      mag: _magParam
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
  _this.createListTable = function (type = 'all') {
    var data, magInt, tr,
        eqs = _this.data,
        fields = ['depth', 'distance', 'eqid', 'location', 'mag', 'userTime', 'utcTime'],
        magThreshold = _getThreshold(),
        rows = '',
        tableClasses = ['list'],
        thClasses = {};

    if (type === 'mostRecent') {
      eqs = [eqs[eqs.length - 1]];
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
    var magThreshold = _getThreshold(),
        data = {
          count: _this.bins.mag[magThreshold],
          id: _featureId,
          mag: magThreshold,
          max: _this.bins.mag.length - 1,
          min: Math.floor(_magParam)
        },
        html = '',
        singleMagBin = _this.bins.mag.every(
          (value, i, array) => array[0] === value // all values are the same
        );

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
 * @param type {String <feature|search>} default is 'feature'
 *
 * @return {String}
 */
Earthquakes.getFeedUrl = function (params, type = 'feature') {
  var value,
      baseUri = 'https://earthquake.usgs.gov/fdsnws/event/1/query',
      pairs = [];

  Object.assign(params, { // always set these options
    format: 'geojson',
    orderby: 'time-asc'
  });

  if (AppUtil.getParam('catalog') === 'dd' && type !== 'search') { // DD catalog
    baseUri = location.origin + location.pathname + 'php/fdsn/search.json.php';
  }

  Object.keys(params).forEach(key => {
    value = params[key];

    if (key === 'minmagnitude') {
      value -= 0.05; // account for rounding to tenths
    } else if (key === 'latitude' || key === 'longitude') {
      value = AppUtil.round(value, 3);
    }

    pairs.push(key + '=' + value);
  });

  return baseUri + '?' + pairs.join('&');
};


module.exports = Earthquakes;
