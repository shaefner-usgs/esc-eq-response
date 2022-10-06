/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
    LatLon = require('util/LatLon'),
    Luxon = require('luxon');


var _COLORS,
    _DEFAULTS,
    _MARKER;

_COLORS = {
  historical: '#dde',
  foreshocks: '#99a',
  mainshock: '#00f',
  pasthour: '#f00',
  pastday: '#f90',
  pastweek: '#ff0',
  older: '#ffd'
};
_MARKER = {
  color: '#000',
  fillOpacity: 0.85,
  opacity: 0.6,
  weight: 1
};
_DEFAULTS = {
  marker: _MARKER
};


/**
 * Fetch/parse an earthquake GeoJSON feed and create the Leaflet map layer for a
 * Feature. Also supply the data used to create the Feature's Summary and Plots.
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *       feature: {Object} Feature
 *     }
 *
 * @return _this {Object}
 *     {
 *       addData: {Function}
 *       addListeners: {Function}
 *       data: {Array}
 *       destroy: {Function}
 *       getContent: {Function}
 *       getDescription: {Function}
 *       getTooltip: {Function}
 *       mapLayer: {L.FeatureGroup}
 *       params: {Object}
 *       removeListeners: {Function}
 *     }
 */
var Earthquakes = function (options) {
  var _this,
      _initialize,

      _app,
      _catalog,
      _distance,
      _feature,
      _mainshock,
      _markerOptions,
      _periods,

      _addBubbles,
      _addListeners,
      _filter,
      _getAge,
      _getData,
      _getDirection,
      _getDuration,
      _getPrefix,
      _onEachFeature,
      _pointToLayer,
      _removeListeners,
      _setMainshock;


  _this = {};

  _initialize = function (options = {}) {
    var inputs,
        host = '';

    options = Object.assign({}, _DEFAULTS, options);

    _this.params = {
      now: Luxon.DateTime.utc()
    };

    _app = options.app;
    _catalog = AppUtil.getParam('catalog') || 'comcat';
    _feature = options.feature;
    _markerOptions = options.marker;
    _periods = {
      pastday: _this.params.now.minus({ days: 1 }),
      pasthour: _this.params.now.minus({ hours: 1 }),
      pastweek: _this.params.now.minus({ weeks: 1 })
    };

    if (_feature.id === 'mainshock' || _feature.id === 'search') {
      _catalog = 'comcat'; // always ComCat, despite catalog param
    } else { // Aftershocks, Foreshocks, or Historical Seismicity
      inputs = {
        dist: _getPrefix(_feature.id) + '-dist',
        mag: _getPrefix(_feature.id) + '-mag'
      };

      _distance = document.getElementById(inputs.dist).value;
      _mainshock = _app.Features.getFeature('mainshock');

      Object.assign(_this.params, {
        duration: _getDuration(),
        magnitude: document.getElementById(inputs.mag).value
      });
    }

    if (_catalog === 'dd') {
      host = 'ncedc.org'; // PHP script on localhost fetches data from ncedc.org
    }

    _this.mapLayer = L.geoJSON.async(_feature.url, {
      app: _app,
      feature: _feature,
      filter: _filter,
      host: host,
      onEachFeature: _onEachFeature,
      pointToLayer: _pointToLayer
    });
  };

  /**
   * Add the HTML for the given earthquake's 'impact bubbles', keyed by type.
   *
   * @param eq {Object}
   */
  _addBubbles = function (eq) {
    Object.assign(eq, { // defaults
      alertBubble: '',
      cdiBubble: '',
      mmiBubble: '',
      tsunamiBubble: ''
    });

    if (eq.alert) { // PAGER
      eq.alertBubble = L.Util.template(
        '<a href="{url}/pager" class="pager-alertlevel-{alert} impact-bubble" ' +
          'target="new" title="Estimated impact alert level">' +
          '<strong class="roman">{alert}</strong>' +
          '<abbr title="Prompt Assessment of Global Earthquakes for Response">PAGER</abbr>' +
        '</a>',
        eq
      );
    }

    if (eq.cdi) { // DYFI
      eq.cdiBubble = L.Util.template(
        '<a href="{url}/dyfi" class="mmi{cdi} impact-bubble" target="new" ' +
          'title="Maximum reported intensity ({felt} responses)">' +
          '<strong class="roman">{cdi}</strong>' +
          '<abbr title="Did You Feel It?">DYFI?</abbr>' +
        '</a>',
        eq
      );
    }

    if (eq.mmi) { // ShakeMap
      eq.mmiBubble = L.Util.template(
        '<a href="{url}/shakemap" class="mmi{mmi} impact-bubble" target="new" ' +
          'title="Maximum estimated intensity">' +
          '<strong class="roman">{mmi}</strong>' +
          '<abbr title="ShakeMap">ShakeMap</abbr>' +
        '</a>',
        eq
      );
    }

    if (eq.tsunami) {
      eq.tsunamiBubble =
        '<a href="https://www.tsunami.gov/" class="tsunami impact-bubble" ' +
          'target="new" title="Tsunami Warning Center">' +
          '<span class="hover"></span>' +
          '<img src="img/tsunami.png" alt="Tsunami Warning Center">' +
        '</a>';
    }
  };

  /**
   * Event handler that adds the "Select" button's listener.
   *
   * @param e {Event}
   */
  _addListeners = function (e) {
    var button = e.popup.getElement().querySelector('button');

    button.addEventListener('click', _setMainshock);
  };

  /**
   * Filter out eqs from the GeoJSON feed that aren't in _this.data, which was
   * already filtered in _getData().
   *
   * Note: the NCEDC (double difference) catalog does not support radius values
   * for defining a custom search region, so a rectangle is used as a proxy and
   * extraneous points must be subsequently removed.
   *
   * @param feature {Object}
   *     GeoJSON feature
   *
   * @return {Boolean}
   */
  _filter = function (feature) {
    if (_this.data.find(item => item.id === feature.id)) { // eqid
      return true;
    }

    return false;
  };

  /**
   * Get the 'age' of an earthquake (i.e. 'mainshock', 'historical', 'pastday',
   * etc).
   *
   * @param datetime {Object}
   *     Luxon datetime
   *
   * @return age {String}
   */
  _getAge = function (datetime) {
    var age = _feature.id.replace('dd-', ''); // remove prefix from DD Features

    if (_feature.id.includes('aftershocks') || _feature.id === 'search') {
      if (datetime >= _periods.pasthour) {
        age = 'pasthour';
      } else if (datetime >= _periods.pastday) {
        age = 'pastday';
      } else if (datetime >= _periods.pastweek) {
        age = 'pastweek';
      } else {
        age = 'older';
      }
    }

    return age;
  };

  /**
   * Get the formatted data (a list of earthquakes with convenience props set)
   * that is used to create the Feature.
   *
   * @param json {Object}
   *
   * @return data {Array}
   */
  _getData = function (json) {
    var data = [],
        features = json.features || [json];

    features.forEach(feature => {
      var direction, distance, distanceDisplay, eq, latlon, localTime, statusIcon,
          coords = feature.geometry.coordinates,
          props = feature.properties,
          datetime = Luxon.DateTime.fromMillis(props.time).toUTC(),
          format = 'LLL d, yyyy TT',
          magDisplay = AppUtil.round(props.mag, 1), // String
          mag = parseFloat(magDisplay) || 0,
          magType = props.magType || 'M',
          template = '<time datetime="{isoTime}" class="user">{userTimeDisplay}</time>' +
            '<time datetime="{isoTime}" class="utc">{utcTimeDisplay}</time>',
          title = magType + ' ' + magDisplay,
          userTimeDisplay = datetime.toLocal().toFormat(format) +
            ` <span class="tz">(${_app.utcOffset})</span>`,
          utcTimeDisplay = datetime.toFormat(format) +
            ' <span class="tz">(UTC)</span>';

      if (props.place) {
        title += '—' + props.place;
      }
      if (props.status === 'reviewed') {
        statusIcon = '<i class="icon-check"></i>';
      }

      // Add local time (at epicenter) if tz prop is included in feed
      if (props.tz) {
        localTime = datetime.toUTC(props.tz).toFormat('LLL d, yyyy tt') +
          ' <span class="tz">at the epicenter</span>';
        template += '<time datetime="{isoTime}" class="local">{localTime}</time>';
      }

      if (
        _feature.id.includes('aftershocks') ||
        _feature.id.includes('foreshocks') ||
        _feature.id.includes('historical')
      ) {
        latlon = LatLon(coords[1], coords[0]);
        direction = _getDirection(latlon);
        distance = AppUtil.round(_mainshock.latlon.distanceTo(latlon) / 1000, 2);
        distanceDisplay = AppUtil.round(distance, 1) + ' km ' +
          `<span>${direction}</span>`;
      }

      eq = {
        alert: props.alert || '', // PAGER
        catalog: _catalog,
        cdi: AppUtil.romanize(props.cdi), // DYFI
        coords: coords,
        datetime: datetime,
        depth: coords[2],
        depthDisplay: AppUtil.round(coords[2], 1) + '<span> km</span>',
        distance: distance || '',
        distanceDisplay: distanceDisplay || '',
        featureId: _feature.id,
        felt: AppUtil.addCommas(props.felt), // DYFI felt reports
        fillColor: _COLORS[_getAge(datetime)],
        id: feature.id, // eqid
        isoTime: datetime.toISO(),
        localTime: localTime || '',
        location: AppUtil.formatLatLon(coords),
        mag: mag,
        magDisplay: magDisplay,
        magInt: Math.floor(mag, 1),
        magType: magType,
        mmi: AppUtil.romanize(props.mmi), // ShakeMap
        radius: AppUtil.getRadius(mag),
        status: props.status || '',
        statusIcon: statusIcon || '',
        title: title,
        tsunami: props.tsunami || 0,
        url: props.url,
        userTimeDisplay: userTimeDisplay,
        utcTimeDisplay: utcTimeDisplay
      };

      // Add additional props that depend on other eq props already being set
      _addBubbles(eq);
      eq.timeDisplay = L.Util.template(template, eq);

      // Filter out eqs from NCEDC (DD) catalog that are outside search radius
      if (
        _feature.id === 'mainshock' ||
        _catalog === 'comcat' ||
        eq.distance <= Number(_distance) // DD Aftershocks, Foreshocks, Historical Seismicity
      ) {
        data.push(eq);
      }
    });

    return data;
  };

  /**
   * Get the direction from the Mainshock.
   *
   * @param latlon {Object}
   *
   * @return {String}
   */
  _getDirection = function (latlon) {
    var bearing = _mainshock.latlon.bearing(latlon),
        compassPoints = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'],
        octant = Math.floor((22.5 + (360 + bearing) % 360) / 45);

    return compassPoints[octant];
  };

  /**
   * Get the duration of an earthquake sequence.
   *
   * @return duration {Object}
   */
  _getDuration = function () {
    var duration, inputId, interval;

    if (_feature.id.includes('aftershocks')) {
      interval = Luxon.Interval
        .fromDateTimes(_mainshock.data.datetime, _this.params.now)
        .length('days');
      duration = {
        days: Number(AppUtil.round(interval, 1))
      };
    } else if (_feature.id.includes('foreshocks')) {
      inputId = _getPrefix(_feature.id) + '-days';
      duration = {
        days: Number(document.getElementById(inputId).value)
      };
    } else { // historical
      inputId = _getPrefix(_feature.id) + '-years';
      duration = {
        years: Number(document.getElementById(inputId).value)
      };
    }

    return duration;
  };

  /**
   * Get the URL parameter prefix of the given Feature.
   *
   * @param id {String}
   *     Feature id
   *
   * @return {String}
   */
  _getPrefix = function (id) {
    var prefix,
        lookup = {
          as: ['aftershocks', 'dd-aftershocks'],
          fs: ['foreshocks', 'dd-foreshocks'],
          hs: ['historical', 'dd-historical']
        };

    Object.keys(lookup).forEach(key => {
      if (lookup[key].indexOf(id) !== -1) {
        prefix = key;
      }
    });

    return prefix || '';
  };

  /**
   * Add Leaflet popups and tooltips.
   *
   * @param feature {Object}
   *     geoJSON feature
   * @param layer {L.Layer}
   */
  _onEachFeature = function (feature, layer) {
    var eq = _this.data.find(item => item.id === feature.id); // eqid

    layer.bindPopup(_this.getContent(eq), {
      maxWidth: 375,
      minWidth: 250
    }).bindTooltip(_this.getTooltip(eq));
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
    var eq = _this.data.find(item => item.id === feature.id), // eqid
        options = Object.assign({}, _markerOptions, {
          fillColor: eq.fillColor,
          pane: _feature.id, // controls stacking order
          radius: eq.radius
        });

    return L.circleMarker(latlng, options);
  };

  /**
   * Event handler that removes the "Select" button's listener.
   *
   * @param e {Event}
   */
  _removeListeners = function (e) {
    var button = e.popup.getElement().querySelector('button');

    button.removeEventListener('click', _setMainshock);
  };

  /**
   * Event handler that sets the selected earthquake as the Mainshock.
   *
   * @param e {Event}
   */
  _setMainshock = function (e) {
    var eqid = e.target.parentNode.id,
        input = document.getElementById('eqid');

    input.value = eqid;

    _app.MapPane.map.closePopup();

    // Input event not triggered when changed programmatically
    _app.SelectBar.setMainshock();
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add the JSON feed data.
   *
   * @param json {Object}
   */
  _this.addData = function (json) {
    _this.data = _getData(json);
  };

  /**
   * Add event listeners.
   */
  _this.addListeners = function () {
    _this.mapLayer.on({
      popupopen: _addListeners,
      popupclose: _removeListeners
    });
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;
    _catalog = null;
    _distance = null;
    _feature = null;
    _mainshock = null;
    _markerOptions = null;
    _periods = null;

    _addBubbles = null;
    _addListeners = null;
    _filter = null;
    _getAge = null;
    _getData = null;
    _getDirection = null;
    _getDuration = null;
    _getPrefix = null;
    _onEachFeature = null;
    _pointToLayer = null;
    _removeListeners = null;
    _setMainshock = null;

    _this = null;
  };

  /**
   * Get the HTML content for the given earthquake's Leaflet popup.
   *
   * @param eq {Object}
   *
   * @return {String}
   */
  _this.getContent = function (eq) {
    var data = eq;

    if (eq.featureId === 'mainshock') {
      data = Object.assign({}, eq, {
        id: '', // not needed and removing it avoids duplicating it in the DOM
      });
    }

    return L.Util.template(
      '<div id="{id}" class="earthquake {featureId}">' +
        '<h4>{title}</h4>' +
        '<div class="impact-bubbles">' +
          '{cdiBubble}{mmiBubble}{alertBubble}{tsunamiBubble}' +
        '</div>' +
        '<dl class="props">' +
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
      '</div>',
      data
    );
  };

  /**
   * Get the HTML content for the Feature's description.
   *
   * @return {String}
   */
  _this.getDescription = function () {
    var append, data,
        catalog = '', // default (ComCat, don't notate)
        period = Object.keys(_this.params.duration)[0],
        length = _this.params.duration[period];

    if (_feature.id.includes('aftershocks')) {
      append = '. The duration of the aftershock sequence is <strong>' +
        `${length} ${period}</strong>`;
    } else {
      append = ` in the prior <strong>${length} ${period}</strong>` +
        ' before the mainshock';
    }

    if (_catalog === 'dd') {
      catalog = 'double-difference';
    }

    data = {
      append: append,
      catalog: catalog,
      distance: _distance,
      magnitude: _this.params.magnitude
    };

    return L.Util.template(
      '<strong>M {magnitude}+</strong> {catalog} earthquakes within ' +
      '<strong>{distance} km</strong> of the mainshock’s epicenter{append}.',
      data
    );
  };

  /**
   * Get the HTML content for the given earthquake's Leaflet tooltip.
   *
   * @param eq {Object}
   *
   * @return {String}
   */
  _this.getTooltip = function(eq) {
    return L.Util.template(
      '{magType} {magDisplay}—' +
      '<time datetime="{isoTime}" class="user">{userTimeDisplay}</time>' +
      '<time datetime="{isoTime}" class="utc">{utcTimeDisplay}</time>',
      eq
    );
  };

  /**
   * Remove event listeners.
   */
  _this.removeListeners = function () {
    _this.mapLayer.off({
      popupopen: _addListeners,
      popupclose: _removeListeners
    });
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
 * @param type {String <event|search>} default is 'event'
 *     set to 'search' in Catalog Search Feature to always use ComCat
 *
 * @return {String}
 */
Earthquakes.getUrl = function (params, type = 'event') {
  var baseUri = 'https://earthquake.usgs.gov/fdsnws/event/1/query', // ComCat
      catalog = AppUtil.getParam('catalog'),
      pairs = [];

  Object.assign(params, {
    format: 'geojson',
    orderby: 'time-asc'
  });

  if (catalog === 'dd' && type === 'event') { // double-difference
    baseUri = location.origin + location.pathname + 'php/fdsn/search.json.php';
    params.format = 'text';
  }

  Object.keys(params).forEach(key => {
    var value = params[key];

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