/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
    LatLon = require('util/LatLon'),
    Luxon = require('luxon');


var _COLORS,
    _DEFAULTS;

_COLORS = {
  historical: '#dde',
  foreshocks: '#99a',
  mainshock: '#00f',
  pasthour: '#f00',
  pastday: '#f90',
  pastweek: '#ff0',
  older: '#ffffe6'
};
_DEFAULTS = {
  color: '#000', // stroke
  fillOpacity: 0.85,
  opacity: 0.6, // stroke
  weight: 1 // stroke width
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
 *       updateListeners: {Function}
 *     }
 */
var Earthquakes = function (options) {
  var _this,
      _initialize,

      _app,
      _catalog,
      _feature,
      _mainshock,
      _markerOptions,

      _addBubbles,
      _addListeners,
      _filter,
      _getAge,
      _getBubbles,
      _getData,
      _getDirection,
      _getDuration,
      _onEachFeature,
      _pointToLayer,
      _popupopen,
      _removeListeners,
      _setMainshock;


  _this = {};

  _initialize = function (options = {}) {
    var host = '';

    options = Object.assign({}, _DEFAULTS, options);

    _this.params = {
      now: Luxon.DateTime.utc()
    };

    _app = options.app;
    _catalog = AppUtil.getParam('catalog') || 'comcat';
    _feature = options.feature;
    _markerOptions = {
      color: options.color,
      fillOpacity: options.fillOpacity,
      opacity: options.opacity,
      weight: options.weight
    };

    if (_feature.id === 'mainshock' || _feature.id === 'catalog-search') {
      _catalog = 'comcat'; // always ComCat, despite catalog param
    } else { // Aftershocks, Foreshocks, or Historical Seismicity
      _mainshock = _app.Features.getFeature('mainshock');

      Object.assign(_this.params, {
        distance: _feature.params.distance,
        duration: _getDuration(),
        magnitude: _feature.params.magnitude
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
   * Add event listeners to a map popup.
   *
   * @param e {Event} optional
   * @param popup {Element} optional; default is null
   *
   * Note: either the Leaflet popupopen Event (e) or popup option is required.
   */
  _addListeners = function (e, popup = null) {
    var bubbles, button;

    popup = popup || e.popup.getContent();
    bubbles = popup.querySelectorAll('.impact-bubbles .feature');
    button = popup.querySelector('button');

    button.addEventListener('click', _setMainshock);

    if (_feature.id === 'mainshock') {
      bubbles.forEach(bubble =>
        bubble.addEventListener('click', _app.Features.showLightbox)
      );
    }
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
    var age = _feature.id.replace('dd-', ''), // default
        pastday = _this.params.now.minus({ days: 1 }),
        pasthour = _this.params.now.minus({ hours: 1 }),
        pastweek = _this.params.now.minus({ weeks: 1 });

    if (_feature.id.includes('aftershocks') || _feature.id === 'catalog-search') {
      if (datetime >= pasthour) {
        age = 'pasthour';
      } else if (datetime >= pastday) {
        age = 'pastday';
      } else if (datetime >= pastweek) {
        age = 'pastweek';
      } else {
        age = 'older';
      }
    }

    return age;
  };

  /**
   * Get the bubbles template.
   *
   * Wraps the Mainshock's DYFI, ShakeMap and PAGER bubbles in a <span>
   * containing CSS classes needed by their Lightboxes.
   *
   * @param eq {Object}
   *
   * @return bubbles {String}
   */
  _getBubbles = function (eq) {
    var bubbles = '{cdiBubble}{mmiBubble}{alertBubble}{tsunamiBubble}'; // default

    if (eq.featureId === 'mainshock') {
      bubbles = '';

      if (eq.cdiBubble) {
        bubbles += '<span class="dyfi feature">{cdiBubble}</span>';
      }
      if (eq.mmiBubble) {
        bubbles += '<span class="shakemap feature">{mmiBubble}</span>';
      }
      if (eq.alertBubble) {
        bubbles += '<span class="pager feature">{alertBubble}</span>';
      }

      bubbles += '{tsunamiBubble}';
    }

    return bubbles;
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
          status = props.status || '',
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
      if (status.toLowerCase() === 'reviewed') {
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
        distance = AppUtil.round(_mainshock.data.latlon.distanceTo(latlon) / 1000, 2);
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
        status: status,
        statusIcon: statusIcon || '',
        title: title,
        tsunami: props.tsunami || 0,
        url: props.url,
        userTimeDisplay: userTimeDisplay,
        utcTimeDisplay: utcTimeDisplay
      };

      // Add additional props that depend on other props being set first
      _addBubbles(eq);
      eq.timeDisplay = L.Util.template(template, eq);

      // Filter out eqs from NCEDC (DD) catalog that are outside search radius
      if (
        _feature.id === 'mainshock' ||
        _catalog === 'comcat' ||
        eq.distance <= Number(_this.params.distance) // DD Aftershocks, Foreshocks, Historical Seismicity
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
    var bearing = _mainshock.data.latlon.bearing(latlon),
        directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'],
        octant = Math.floor((22.5 + (360 + bearing) % 360) / 45);

    return directions[octant];
  };

  /**
   * Get the duration of an earthquake sequence.
   *
   * @return duration {Object}
   */
  _getDuration = function () {
    var interval,
        duration = {};

    if (_feature.id.includes('aftershocks')) {
      interval = Luxon.Interval
        .fromDateTimes(_mainshock.data.datetime, _this.params.now)
        .length('days');
      duration.days = Number(AppUtil.round(interval, 1));
    } else if (_feature.id.includes('foreshocks')) {
      duration.days = _feature.params.days;
    } else { // historical
      duration.years = _feature.params.years;
    }

    return duration;
  };

  /**
   * Add Leaflet popups and tooltips.
   *
   * @param feature {Object}
   *     geoJSON feature
   * @param layer {L.Layer}
   */
  _onEachFeature = function (feature, layer) {
    var div = L.DomUtil.create('div'),
        eq = _this.data.find(item => item.id === feature.id); // eqid

    div.innerHTML = _this.getContent(eq);

    layer.bindPopup(div, {
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
        opts = Object.assign({}, _markerOptions, {
          fillColor: eq.fillColor,
          pane: _feature.id, // controls stacking order
          radius: eq.radius
        });

    return L.circleMarker(latlng, opts);
  };

  /**
   * Leaflet event handler that is fired when a popup is opened.
   *
   * @param e {Event} optional
   */
  _popupopen = function (e) {
    var marker = e.layer;

    marker.openPopup(marker.getLatLng()); // position at marker center
    _addListeners(e);
  };

  /**
   * Remove event listeners from a map popup.
   *
   * @param e {Event} optional
   * @param popup {Element} optional; default is null
   *
   * Note: either the Leaflet popupclose Event (e) or popup option is required.
   */
  _removeListeners = function (e, popup = null) {
    var bubbles, button;

    popup = popup || e.popup.getContent();
    bubbles = popup.querySelectorAll('.impact-bubbles .feature');
    button = popup.querySelector('button');

    button.removeEventListener('click', _setMainshock);

    if (_feature.id === 'mainshock') {
      bubbles.forEach(bubble =>
        bubble.removeEventListener('click', _app.Features.showLightbox)
      );
    }
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
      popupopen: _popupopen,
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
    _feature = null;
    _mainshock = null;
    _markerOptions = null;

    _addListeners = null;
    _addBubbles = null;
    _filter = null;
    _getAge = null;
    _getBubbles = null;
    _getData = null;
    _getDirection = null;
    _getDuration = null;
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
    var data = Object.assign({}, eq);

    if (eq.featureId === 'mainshock') {
      data.id = ''; // not needed; removing it avoids duplicating it in the DOM
    }

    return L.Util.template(
      '<div id="{id}" class="earthquake {featureId}">' +
        '<h4>{title}</h4>' +
        '<div class="impact-bubbles">' +
          _getBubbles(eq) +
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
      distance: _this.params.distance,
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
      popupopen: _popupopen,
      popupclose: _removeListeners
    });
  };

  /**
   * Update the Mainshock's event listeners if its popup is open.
   *
   * Note: necessary when swapping between catalogs.
   */
  _this.updateListeners = function () {
    var popup = document.querySelector('.leaflet-popup-pane .mainshock');

    if (popup) {
      _removeListeners(null, popup);
      _addListeners(null, popup);
    }
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
