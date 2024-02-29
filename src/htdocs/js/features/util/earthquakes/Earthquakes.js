/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
    LatLon = require('util/LatLon'),
    Luxon = require('luxon');


var _COLORS,
    _MARKERS;

_COLORS = {
  foreshocks: '#99a',
  historical: '#dde',
  mainshock: '#00f',
  older: '#ffffe6',
  pasthour: '#f00',
  pastday: '#f90',
  pastweek: '#ff0'
};
_MARKERS = {
  color: '#000', // stroke
  fillOpacity: 0.85,
  opacity: 0.6, // stroke
  weight: 1 // stroke
};


/**
 * Fetch/parse an earthquake GeoJSON feed and create the Leaflet map layer for
 * the Catalog Search, Mainshock, Aftershocks, Foreshocks, and Historical
 * Seismicity Features.
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
 *       data: {Object}
 *       destroy: {Function}
 *       getPopup: {Function}
 *       mapLayer: {L.GeoJSON}
 *       removeListeners: {Function}
 *     }
 */
var Earthquakes = function (options) {
  var _this,
      _initialize,

      _app,
      _catalog,
      _feature,
      _mainshock,

      _addBubbles,
      _addListeners,
      _filter,
      _getAge,
      _getBubbles,
      _getEqs,
      _getTooltip,
      _onEachFeature,
      _onPopupClose,
      _onPopupOpen,
      _pointToLayer,
      _removeListeners,
      _setMainshock;


  _this = {};

  _initialize = function (options = {}) {
    var host = '';

    _app = options.app;
    _catalog = AppUtil.getParam('catalog') || 'comcat';
    _feature = options.feature;

    if (_feature.type === 'mainshock' || _feature.id === 'catalog-search') {
      _catalog = 'comcat'; // always ComCat, despite catalog param
    } else { // Aftershocks, Foreshocks, or Historical Seismicity
      _mainshock = _app.Features.getMainshock();

      if (_catalog === 'dd') {
        host = 'ncedc.org'; // PHP script on localhost fetches data from ncedc.org
      }
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
   * Add the the given earthquake's relevant 'impact bubbles' HTML, keyed by
   * type.
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
   * Add event listeners to the given Popup.
   *
   * @param popup {Element}
   */
  _addListeners = function (popup) {
    var bubbles = popup.querySelectorAll('.impact-bubbles .feature'),
        button = popup.querySelector('button');

    button.addEventListener('click', _setMainshock);

    if (_feature.type === 'mainshock') {
      bubbles.forEach(bubble =>
        bubble.addEventListener('click', e => {
          var id = Array.from(bubble.classList).find(item => item !== 'feature'),
              feature = _app.Features.getFeature(id);

          if (feature.lightbox) {
            e.preventDefault();
            feature.lightbox.show();
          }
        })
      );
    }
  };

  /**
   * Filter out non-matching NCEDC (double-difference) earthquakes. The NCEDC
   * API doesn't support radius values for a custom search region, so a
   * rectangle is used as a proxy.
   *
   * Note: _this.data.eqs gets filtered by _getEqs(), but the map layer is
   * created before filtering happens.
   *
   * @param feature {Object}
   *     GeoJSON feature
   *
   * @return {Boolean}
   */
  _filter = function (feature) {
    if (_this.data.eqs.find(item => item.id === feature.id)) { // eqid
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
    var now, pastday, pasthour, pastweek,
        age = _feature.type; // default

    if (_feature.type === 'aftershocks' || _feature.id === 'catalog-search') {
      now = _feature.params.now;
      pastday = now.minus({ days: 1 }),
      pasthour = now.minus({ hours: 1 }),
      pastweek = now.minus({ weeks: 1 });

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
   * Get the 'impact bubbles' template.
   *
   * Note: wraps the Mainshock's DYFI, ShakeMap and PAGER bubbles in a <span>
   * containing CSS classes needed for their Lightbox links.
   *
   * @param eq {Object}
   *
   * @return bubbles {String}
   */
  _getBubbles = function (eq) {
    var bubbles = '{cdiBubble}{mmiBubble}{alertBubble}{tsunamiBubble}'; // default

    if (eq.featureId.includes('mainshock')) {
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
   * Get the list of earthquakes (with convenience props set) that is used to
   * create the Feature.
   *
   * @param json {Object}
   *
   * @return eqs {Array}
   */
  _getEqs = function (json) {
    var eqs = [],
        features = json.features || [json]; // feature collection or Mainshock

    features.forEach((feature = {}) => {
      var direction, distance, distanceDisplay, eq, from, localTimeDisplay,
          statusIcon, to,
          props = feature.properties || {},
          cdi = AppUtil.romanize(Number(props.cdi) || ''),
          coords = feature.geometry?.coordinates || [0, 0, 0],
          datetime = Luxon.DateTime.fromMillis(Number(props.time)),
          magDisplay = AppUtil.round(props.mag, 1), // String
          mag = parseFloat(magDisplay) || 0,
          magType = props.magType || 'M',
          mmi = AppUtil.romanize(Number(props.mmi) || ''),
          status = (props.status || '').toLowerCase(),
          time = '<time datetime="{isoTime}" class="utc">{utcTimeDisplay}</time>' +
            '<time datetime="{isoTime}" class="user">{userTimeDisplay}</time>',
          title = magType + ' ' + magDisplay,
          utcOffset = Number(datetime.toFormat('Z')),
          userTimeDisplay = datetime.toFormat(_app.dateFormat) +
            ` <span class="tz">(UTC${utcOffset})</span>`,
          utcTimeDisplay = datetime.toUTC().toFormat(_app.dateFormat) +
            ' <span class="tz">(UTC)</span>';

      if (props.place) {
        title += '—' + props.place;
      }
      if (props.tz) { // local time (at epicenter)
        localTimeDisplay = datetime.toUTC(props.tz).toFormat(_app.dateFormat) +
          ' <span class="tz">at the epicenter</span>';
        time += '<time datetime="{isoTime}" class="local">{localTimeDisplay}</time>';
      }

      if (status === 'reviewed') {
        statusIcon = '<i class="icon-check"></i>';
      }

      if (_feature.type === 'mainshock') {
        distanceDisplay = '0 km';
      } else if (_feature.id !== 'catalog-search') {
        from = _mainshock.data.eq.latlon;
        to = LatLon(coords[1], coords[0]);
        direction = AppUtil.getDirection(from, to);
        distance = Number(AppUtil.round(
          from.distanceTo(to) / 1000, 2
        ));
        distanceDisplay = AppUtil.round(distance, 1) + ' km ' +
          `<span>${direction}</span>`;
      }

      eq = {
        alert: props.alert || '', // PAGER
        catalog: _catalog,
        cdi: cdi || '', // DYFI
        coords: coords,
        datetime: datetime,
        depth: coords[2],
        depthDisplay: AppUtil.round(coords[2], 1) + '<span> km</span>',
        distance: distance || 0,
        distanceDisplay: distanceDisplay || '',
        featureId: _feature.id,
        felt: AppUtil.addCommas(props.felt), // DYFI felt reports
        fillColor: _COLORS[_getAge(datetime)],
        id: feature.id || '', // eqid
        isoTime: datetime.toUTC().toISO(),
        localTimeDisplay: localTimeDisplay || '',
        location: AppUtil.formatLatLon(coords),
        mag: mag,
        magDisplay: magDisplay,
        magInt: Math.floor(mag),
        magType: magType,
        mmi: mmi || '', // ShakeMap
        radius: AppUtil.getRadius(mag),
        status: status,
        statusIcon: statusIcon || '',
        title: title,
        tsunami: Boolean(props.tsunami),
        url: props.url || '',
        userTimeDisplay: userTimeDisplay,
        utcOffset: utcOffset,
        utcTimeDisplay: utcTimeDisplay
      };

      // Add additional props that depend on other props being set first
      _addBubbles(eq);
      eq.timeDisplay = L.Util.template(time, eq);

      // Filter out eqs from NCEDC (DD) catalog that are outside search radius
      if (
        _feature.type === 'mainshock' ||
        _catalog === 'comcat' ||
        eq.distance <= _feature.params.distance // DD eq is inside search radius
      ) {
        eqs.push(eq);
      }
    });

    return eqs;
  };

  /**
   * Get the HTML content for the given earthquake's Leaflet Tooltip.
   *
   * @param eq {Object}
   *
   * @return {String}
   */
  _getTooltip = function(eq) {
    return L.Util.template(
      '{magType} {magDisplay}—' +
      '<time datetime="{isoTime}" class="user">{userTimeDisplay}</time>' +
      '<time datetime="{isoTime}" class="utc">{utcTimeDisplay}</time>',
      eq
    );
  };

  /**
   * Add the Leaflet Popups and Tooltips.
   *
   * @param feature {Object}
   * @param layer {L.Layer}
   */
  _onEachFeature = function (feature, layer) {
    var div = L.DomUtil.create('div'),
        eq = _this.data.eqs.find(item => item.id === feature.id); // eqid

    div.innerHTML = _this.getPopup(eq);

    layer.bindPopup(div, {
      minWidth: 365
    }).bindTooltip(_getTooltip(eq));
  };

  /**
   * Event handler for closing a Popup.
   *
   * @param e {Event}
   */
  _onPopupClose = function (e) {
    var name = e.target.id.replace('dd-', '') + '-popup';

    sessionStorage.removeItem(name);
    _removeListeners(e.popup.getElement());
  };

  /**
   * Event handler for opening a Popup.
   *
   * @param e {Event}
   */
  _onPopupOpen = function (e) {
    var marker = e.layer,
        name = e.target.id.replace('dd-', '') + '-popup',
        value = e.layer.feature.id; // eqid

    marker.openPopup(marker.getLatLng()); // position at marker center
    sessionStorage.setItem(name, value);
    _addListeners(e.popup.getElement());
  };

  /**
   * Create the Leaflet Markers.
   *
   * @param feature {Object}
   * @param latlng {L.LatLng}
   *
   * @return {L.CircleMarker}
   */
  _pointToLayer = function (feature, latlng) {
    var eq = _this.data.eqs.find(item => item.id === feature.id), // eqid
        opts = Object.assign({}, _MARKERS, {
          fillColor: eq.fillColor,
          pane: _feature.id, // controls stacking order
          radius: eq.radius
        });

    return L.circleMarker(latlng, opts);
  };

  /**
   * Remove event listeners from the given Popup.
   *
   * @param popup {Element}
   */
  _removeListeners = function (popup) {
    var bubbles = popup.querySelectorAll('.impact-bubbles .feature'),
        button = popup.querySelector('button');

    button.removeEventListener('click', _setMainshock);

    if (_feature.type === 'mainshock') {
      bubbles.forEach(bubble =>
        bubble.removeEventListener('click', _app.Features.showLightbox)
      );
    }
  };

  /**
   * Event handler that sets an earthquake as the Mainshock.
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
   * @param json {Object} optional; default is {}
   */
  _this.addData = function (json = {}) {
    var datetime = Luxon.DateTime.fromMillis(_feature.updated);

    _this.data = {
      eqs: _getEqs(json),
      isoTime: datetime.toUTC().toISO(),
      userTime: datetime.toFormat(_app.dateFormat),
      utcOffset: Number(datetime.toFormat('Z')),
      utcTime: datetime.toUTC().toFormat(_app.dateFormat)
    };

    _this.mapLayer.addData(json);
  };

  /**
   * Add event listeners.
   */
  _this.addListeners = function () {
    _this.mapLayer.on({
      popupclose: _onPopupClose,
      popupopen: _onPopupOpen
    });
  };

  /**
   * Destroy this Class.
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;
    _catalog = null;
    _feature = null;
    _mainshock = null;

    _addBubbles = null;
    _addListeners = null;
    _filter = null;
    _getAge = null;
    _getBubbles = null;
    _getEqs = null;
    _getTooltip = null;
    _onEachFeature = null;
    _onPopupClose = null;
    _onPopupOpen = null;
    _pointToLayer = null;
    _removeListeners = null;
    _setMainshock = null;

    _this = null;
  };

  /**
   * Get the HTML content for the given earthquake's Leaflet Popup.
   *
   * @param eq {Object}
   *
   * @return {String}
   */
  _this.getPopup = function (eq) {
    var data = Object.assign({}, eq);

    if (eq.featureId.includes('mainshock')) {
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
   * Remove event listeners.
   */
  _this.removeListeners = function () {
    _this.mapLayer.off({
      popupclose: _onPopupClose,
      popupopen: _onPopupOpen
    });
  };


  _initialize(options);
  options = null;
  return _this;
};

/**
 * Static method to get the URL of the GeoJSON feed.
 *
 * @param params {Object} optional; default is {}
 *     see API Documentation at https://earthquake.usgs.gov/fdsnws/event/1/
 * @param type {String <event|search>} optional; default is 'event'
 *     set to 'search' in Catalog Search Feature to always use ComCat
 *
 * @return {String}
 */
Earthquakes.getUrl = function (params = {}, type = 'event') {
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
