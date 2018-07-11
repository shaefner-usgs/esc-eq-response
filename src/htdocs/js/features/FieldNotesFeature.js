/* global L */
'use strict';


var Util = require('hazdev-webutils/src/util/Util');


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

      _createPopupContent,
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

  _createPopupContent = function (feature) {
    var html;

    html = L.Util.template('<h3>{form}</h3>' +
      '<p>{timestamp}</p>' +
      '<p>{description}</p>' +
      '<p>{notes}</p>' +
      '<p>{site}</p>' +
      '<p>{operator}</p>',
      feature.properties
    );

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
        tooltip;

    props = feature.properties;
    tooltip = props.form;
    if (props.description) {
      tooltip += ': ' + props.description;
    }
    layer.bindPopup(_createPopupContent(feature), {
      autoPanPadding: L.point(50, 50),
      minWidth: 300,
      maxWidth: 400
    }).bindTooltip(tooltip);

    _count ++;
  };

  /**
   * Leaflet GeoJSON option: creates markers from GeoJSON points
   *
   * @param feature {Object}
   * @param latlng {L.LatLng}
   *
   * @return {L.CircleMarker}
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
