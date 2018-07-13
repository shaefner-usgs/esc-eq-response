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

      _genPopupContent,
      _getCustomProps,
      _getName,
      _onEachFeature,
      _pointToLayer;


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
   * Create popup content
   *
   * @param props {Object}
   *
   * @return html {Html}
   */
  _genPopupContent = function (props) {
    var html;

    html = L.Util.template('<div class="fieldnotes">' +
        '<h4>{title}</h4>' +
        '<time>{timestamp} {timezone}</time>' +
        '<p class="description">{description}</p>' +
        '<p class="notes">{notes}</p>' +
        _getCustomProps(props) +
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
    var html,
        skipProps,
        value;

    // Props that are shared by all types
    skipProps = ['accuracy', 'attachment', 'description', 'form', 'igid',
      'notes', 'operator', 'recorded', 'site', 'synced', 'timestamp',
      'timezone', 'title', 'zaccuracy'];

    html = '<dl>';
    Object.keys(props).forEach(function (key) {
      if (skipProps.indexOf(key) === -1) { // prop is not in skipProps
        value = props[key] || '&ndash;';
        html += '<dt>' + key + '</dt><dd>' + value + '</dd>';
      }
    });
    html += '</dl>';

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
    var props,
        title;

    // Strip slashes from json encoded values
    props = feature.properties;
    Object.keys(props).forEach(function(key) {
      props[key] = AppUtil.stripslashes(props[key]);
    });

    title = props.form;
    if (props.site) {
      title += ': ' + props.site;
    }
    props.title = title;

    layer.bindPopup(_genPopupContent(props), {
      autoPanPadding: L.point(50, 50),
      minWidth: 300,
      maxWidth: 400
    }).bindTooltip(title);

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
