/* global L */
'use strict';


var AppUtil = require('AppUtil'),
    Util = require('hazdev-webutils/src/util/Util');


var _DEFAULTS,
    _ICON_DEFAULTS,
    _MARKER_DEFAULTS;

_ICON_DEFAULTS = {
  iconAnchor: L.point(10, 25),
  iconRetinaUrl: '../img/pin-s-star+c0f@2x.png',
  iconSize: L.point(20, 50),
  iconUrl: '../img/pin-s-star+c0f.png',
  popupAnchor: L.point(0, -25),
  tooltipAnchor: L.point(0, -15)
};
_MARKER_DEFAULTS = {
  opacity: 0.85
};
_DEFAULTS = {
  iconOptions: _ICON_DEFAULTS,
  json: {},
  markerOptions: _MARKER_DEFAULTS
};

var FieldNotesFeature = function (options) {
  var _this,
      _initialize,

      _count,
      _mapLayer,
      _markerOptions,

      _addEventListener,
      _genPopupContent,
      _getCustomProps,
      _getName,
      _onEachFeature,
      _pointToLayer,
      _updatePopup;


  _this = {};

  _initialize = function (options) {
    var iconOptions;

    options = options || {};
    iconOptions = Util.extend({}, _ICON_DEFAULTS, options.iconOptions);

    _this.displayLayer = false;
    _this.id = 'fieldnotes'; // unique id; value is "baked into" app's js/css
    _this.zoomToLayer = false;

    _count = 0;
    _markerOptions = Util.extend({
      icon: L.icon(iconOptions),
      pane: _this.id
    }, _MARKER_DEFAULTS, options.markerOptions);

    _mapLayer = L.geoJson(options.json, {
      onEachFeature: _onEachFeature,
      pointToLayer: _pointToLayer
    });
    _mapLayer.id = _this.id; // attach id to L.Layer

    _this.name = _getName();
  };

  /**
   * Add listener to popups for expanding additional (custom) props
   */
  _addEventListener = function () {
    var el;

    el = document.querySelector('.leaflet-popup .toggle');
    if (el) {
      el.addEventListener('click', function(e) {
        e.preventDefault();
        this.closest('.fieldnotes').querySelector('.properties').classList.toggle('hide');
      });
    }
  };

  /**
   * Create popup content
   *
   * @param props {Object}
   *
   * @return html {Html}
   */
  _genPopupContent = function (props) {
    var html,
        img;

    img = '';
    if (props.attachment) {
      img = '<a href="{attachment}"><img src="{attachment}" alt="photo" /></a>';
    }

    html = L.Util.template('<div class="fieldnotes">' +
        '<h4>{title}</h4>' +
        '<time>{timestamp} {timezone}</time>' +
        '<p class="description">{description}</p>' +
        '<p class="notes">{notes}</p>' +
        img + _getCustomProps(props) +
        '<p class="operator"><a href="mailto:{operator}">{operator}</a></p>' +
      '</div>',
      props
    );

    return html;
  };

  /**
   * Get 'custom' properties that only apply to each observation type
   *
   * @param props {Object}
   *
   * @return html {Html}
   */
  _getCustomProps = function (props) {
    var foundProps,
        html,
        skipProps,
        value;

    foundProps = false;

    // Props that are shared by all types
    skipProps = ['accuracy', 'attachment', 'description', 'form', 'igid',
      'notes', 'operator', 'recorded', 'site', 'synced', 'timestamp',
      'timezone', 'title', 'zaccuracy'];

    html = '<dl class="custom">';
    Object.keys(props).forEach(function (key) {
      if (skipProps.indexOf(key) === -1) { // prop is not in skipProps
        foundProps = true;
        value = props[key] || '&ndash;';
        html += '<dt>' + key + '</dt><dd>' + value + '</dd>';
      }
    });
    html += '</dl>';

    if (foundProps) {
      html = '<p class="properties hide">' +
        '<a href="#" class="toggle">Additional properties</a></p>' + html;
    }

    return html;
  };

  /**
   * Get layer name of feature (adds number of features to name)
   *
   * @return {String}
   */
  _getName = function () {
    return options.name + ' (' + _count + ')';
  };

  /**
   * Leaflet GeoJSON option: creates popups and tooltips
   *
   * @param feature {Object}
   * @param layer (L.Layer)
   */
  _onEachFeature = function (feature, layer) {
    var props;

    props = feature.properties;

    // Strip slashes from json encoded values
    Object.keys(props).forEach(function(key) {
      props[key] = AppUtil.stripslashes(props[key]);
    });

    // Create title prop
    props.title = props.form;
    if (props.site) {
      props.title += ': ' + props.site;
    }

    layer
      .bindPopup(_genPopupContent(props), {
        autoPanPadding: L.point(50, 50),
        minWidth: 300,
        maxWidth: 400
      })
      .bindTooltip(props.title)
      .on('popupopen', _updatePopup);

    _count ++;
  };

  /**
   * Leaflet GeoJSON option: creates markers from GeoJSON points
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
   * Update popup position after image loads; call method to add listeners
   *
   * @param e {Event}
   */
  _updatePopup = function (e) {
    var image,
        popup,
        regex,
        url;

    image = new Image();
    popup = e.popup;
    regex = /http:\/\/bayquakealliance\.org\/fieldnotes\/uploads\/\d+\.jpg/;
    url = regex.exec(popup.getContent());

    _addEventListener();

    if (url) { // popup has a photo
      image.onload = function() {
        popup.update(); // pan map to contain popup after image loads
        _addEventListener();
      };
      image.src = url[0];
    }
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  _this.getMapLayer = function () {
    return _mapLayer;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = FieldNotesFeature;
