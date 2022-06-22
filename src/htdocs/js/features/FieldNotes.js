/* global L */
'use strict';


require('leaflet');
require('leaflet/L.GeoJSON.DateLine');

var AppUtil = require('util/AppUtil'),
    Lightbox = require('util/Lightbox'),
    Luxon = require('luxon');


var _DEFAULTS,
    _ICON_DEFAULTS,
    _MARKER_DEFAULTS;

_ICON_DEFAULTS = {
  iconAnchor: L.point(10, 25),
  iconRetinaUrl: 'img/pin-s-star+c0f@2x.png',
  iconSize: L.point(20, 50),
  iconUrl: 'img/pin-s-star+c0f.png',
  popupAnchor: L.point(0, -25),
  tooltipAnchor: L.point(0, -15)
};
_MARKER_DEFAULTS = {
  opacity: 0.85
};
_DEFAULTS = {
  iconOptions: _ICON_DEFAULTS,
  markerOptions: _MARKER_DEFAULTS
};

/**
 * Create the FieldNotes Feature.
 *
 * @param options {Object}
 *   {
 *     app: {Object} Application
 *   }
 *
 * @return _this {Object}
 *   {
 *     count: {Integer}
 *     create: {Function}
 *     destroy: {Function}
 *     id: {String}
 *     mapLayer: {L.Layer}
 *     name: {String}
 *     reset: {Function}
 *     setFeedUrl: {Function}
 *     showLayer: {Boolean}
 *     url: {String}
 *     zoomToLayer: {Boolean}
 *   }
 */
var FieldNotes = function (options) {
  var _this,
      _initialize,

      _app,
      _lightbox,
      _markerOptions,

      _addListeners,
      _getList,
      _getPopup,
      _onEachFeature,
      _pointToLayer,
      _updatePopup;


  _this = {};

  _initialize = function (options) {
    options = Object.assign({}, _DEFAULTS, options);

    _app = options.app;
    _lightbox = Lightbox({id: 'fieldnotes'});

    Object.assign(_this, {
      id: 'fieldnotes',
      mapLayer: null,
      name: 'Fieldnotes',
      showLayer: false,
      zoomToLayer: false
    });

    _markerOptions = Object.assign({
      icon: L.icon(options.iconOptions),
      pane: _this.id // controls stacking order
    }, options.markerOptions);
  };

  /**
   * Add event listeners to map popups.
   *
   * @param div {Element}
   *     L.Popup div
   */
  _addListeners = function (div) {
    var photo = div.querySelector('.photo'),
        toggle = div.querySelector('.toggle');

    // Show full-size photo in a Lightbox
    if (photo) {
      photo.addEventListener('click', e => {
        e.preventDefault();
        _lightbox.show();
      });
    }

    // Show/hide additional props
    if (toggle) {
      toggle.addEventListener('click', e => {
        e.preventDefault();

        toggle.closest('.properties').classList.toggle('hide');
      });
    }
  };

  /**
   * Get the HTML for the 'Additional properties' list. These are 'custom' props
   * that vary based on the observation type.
   *
   * @param props {Object}
   *
   * @return html {String}
   */
  _getList = function (props) {
    var value,
        html = '',
        list = '',
        skipProps = ['accuracy', 'attachment', 'description', 'form', 'igid',
          'notes', 'operator', 'recorded', 'site', 'synced', 'timestamp',
          'timezone', 'title', 'zaccuracy'];

    Object.keys(props).forEach(key => {
      if (skipProps.indexOf(key) === -1) { // skip props shared by all types
        value = props[key] || '–';
        list += `<dt>${key}</dt><dd>${value}</dd>`;
      }
    });

    if (list) {
      html =
        '<p class="properties hide">' +
          '<a href="#" class="toggle">Additional properties</a>' +
        '</p>' +
        `<dl class="params">${list}</dl>`;
    }

    return html;
  };

  /**
   * Get the Leaflet popup content for a marker.
   *
   * @param data {Object}
   *
   * @return div {Element}
   */
  _getPopup = function (data) {
    var html,
        div = L.DomUtil.create('div'),
        img = '',
        props = _getList(data);

    if (data.attachment) {
      img = '<a class="photo" href="{attachment}">' +
          '<div class="spinner"></div>' +
          '<img src="{attachment}" alt="photo" />' +
        '</a>';
    }

    html = L.Util.template(
      '<h4>{title}</h4>' +
        '<time>{timestamp} {timezone}</time>' +
        '<p class="description">{description}</p>' +
        '<p class="notes">{notes}</p>' +
        img +
        props +
        '<p class="operator">' +
          '<a href="mailto:{operator}">{operator}</a>' +
        '</p>',
      data
    );
    div.innerHTML = html;

    _addListeners(div);

    return div;
  };

  /**
   * Add Leaflet popups and tooltips.
   *
   * @param feature {Object}
   * @param layer (L.Layer)
   */
  _onEachFeature = function (feature, layer) {
    var props = feature.properties;

    // Strip slashes from JSON encoded values
    Object.keys(props).forEach(key =>
      props[key] = AppUtil.stripslashes(props[key])
    );

    props.title = props.form;
    if (props.site) {
      props.title += ': ' + props.site;
    }

    layer
      .bindPopup(_getPopup(props), {
        className: 'fieldnotes',
        maxWidth: 398, // fits 4X3 images 'flush' in popup (max-height is 300px)
        minWidth: 320
      })
      .bindTooltip(props.title)
      .on('popupopen', _updatePopup);
  };

  /**
   * Create Leaflet markers.
   *
   * @param feature {Object}
   * @param latlng {L.LatLng}
   *
   * @return {L.Marker}
   */
  _pointToLayer = function (feature, latlng) {
    return L.marker(latlng, _markerOptions);
  };

  /**
   * Update popup position after image loads and add Lightbox.
   *
   * @param e {Event}
   */
  _updatePopup = function (e) {
    var image = new Image(),
        popup = e.popup,
        regex = /https:\/\/bayquakealliance\.org\/fieldnotes\/uploads\/\d+\.jpg/,
        url = regex.exec(popup.getContent().outerHTML);

    if (url) { // popup includes a photo
      image.src = url[0];
      image.onload = function () {
        popup.update(); // pan map to contain popup after image loads
      };

      _lightbox.add(`<img src="${image.src}" alt="enlarged photo" />`);
    }
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Create Feature (set properties that depend on external feed data).
   *
   * @param json {Object}
   *     feed data for Feature
   */
  _this.create = function (json) {
    Object.assign(_this, {
      count: json.features.length,
      mapLayer: L.geoJSON.dateLine(json, {
        onEachFeature: _onEachFeature,
        pointToLayer: _pointToLayer
      })
    });
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _lightbox.remove();

    _initialize = null;

    _app = null;
    _lightbox = null;
    _markerOptions = null;

    _addListeners = null;
    _getList = null;
    _getPopup = null;
    _onEachFeature = null;
    _pointToLayer = null;
    _updatePopup = null;

    _this = null;
  };

  /**
   * Set the JSON feed's URL.
   */
  _this.setFeedUrl = function () {
    var mainshock = _app.Features.getFeature('mainshock'),
        after = Luxon.DateTime.fromMillis(mainshock.json.properties.time + 1000)
          .toUTC().toSeconds(),
        before = Luxon.DateTime.fromMillis(mainshock.json.properties.time)
          .toUTC().plus({ days: 30 }).toSeconds(),
        pairs = [],
        radius = document.getElementById('as-dist').value,
        urlParams = {
          between: after + ',' + before,
          lat: mainshock.data.lat,
          lon: mainshock.data.lon,
          radius: radius // use aftershocks radius
        };

    Object.keys(urlParams).forEach(key =>
      pairs.push(key + '=' + urlParams[key])
    );

    _this.url = 'https://bayquakealliance.org/fieldnotes/features.json.php?' +
      pairs.join('&');
  };

  /**
   * Reset to initial state.
   */
  _this.reset = function () {
    _this.mapLayer = null;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = FieldNotes;
