/* global L */
'use strict';


var FieldNotesFeature = function (options) {
  var _this,
      _initialize,

      _count,
      _mapLayer,

      _createPopupContent,
      _getName,
      _onEachFeature,
      _pointToLayer;


  _this = {};

  _initialize = function (options) {
    // Unique id; note that value is "baked into" app's js/css
    var id = 'fieldnotes';

    options = options || {};

    _count = 0;

    _this.id = id;

    _mapLayer = L.geoJson(options.json, {
      onEachFeature: _onEachFeature,
      pointToLayer: _pointToLayer
    });
    _mapLayer.id = id; // Attach id to L.Layer

    _this.displayLayer = false;
    _this.name = _getName();
    _this.zoomToLayer = false;

  };

  _createPopupContent = function (feature) {
    return feature.properties.form;
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
    return L.marker(latlng, {
      pane: _this.id
    });
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
