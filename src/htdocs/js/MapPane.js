/* global L */
'use strict';


// Leaflet plugins
require('mappane/Control-bottomcenter');
require('mappane/MousePosition');
//require('mappane/RestoreMap');

// Factories for creating map layers
//   layers are added to global Leaflet instance, e.g. "L.faultsLayer()"
require('mappane/DarkLayer');
require('mappane/FaultsLayer');
require('mappane/GreyscaleLayer');
require('mappane/SatelliteLayer');
require('mappane/TerrainLayer');


/**
 * Sets up leaflet map instance and adds (non-event-specific) 'static' layers
 *   (event-specific 'feature' layers are added by Features.js)
 *
 * @param options {Object}
 *   {
 *     el: {Element}
 *   }
 */
var MapPane = function (options) {
  var _this,
      _initialize,

      _bounds,
      _el,
      _features,
      _initialLoad,
      _mapNavButton,
      _staticLayers,

      _addLayerControl,
      _compareLayers,
      _getSortValue,
      _getStaticLayers,
      _hideZoomControl,
      _initMap,
      _isBaseLayer;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _mapNavButton = document.querySelector('#navBar [href="#mapPane"]');

    _el = options.el || document.createElement('div');
    _staticLayers = _getStaticLayers();

    _initMap();
  };

  /**
   * Add layer control
   *
   * @return control {L.Control}
   */
  _addLayerControl = function () {
    var control;

    control = L.control.layers(
      _staticLayers.baseLayers, _staticLayers.overlays, {
        sortFunction: _compareLayers,
        sortLayers: true
      }
    ).addTo(_this.map);

    return control;
  };

  /**
   * Comparison function for sorting overlays in layer control
   *
   * @return {Integer}
   */
  _compareLayers = function (layerA, layerB) {
    var sortValue = [];

    sortValue[0] = _getSortValue(layerA);
    sortValue[1] = _getSortValue(layerB);
    if (sortValue[0] < sortValue[1]) {
      return 1;
    }
    if (sortValue[0] > sortValue[1]) {
      return -1;
    }
    return 0;
  };

  /**
   * Get sort value of Leaflet layer
   *
   * @param layer {L.Layer}
   * @param name {String}
   *
   * @return sortValue {Integer}
   *   z-index value or 1 if no z-index
   */
  _getSortValue = function (layer) {
    var className,
        leafletPane,
        sortValue,
        styles;

    if (_isBaseLayer(layer)) {
      sortValue = 1; // base layers don't have a z-index
    } else {
      className = 'leaflet-' + layer.id + '-pane';
      leafletPane = document.querySelector('.' + className);
      styles = window.getComputedStyle(leafletPane);
      sortValue = parseInt(styles.getPropertyValue('z-index'), 10);
    }

    return sortValue;
  };

  /**
   * Get all 'static' map layers (not directly related to mainshock)
   *
   * @return layers {Object}
   *    {
   *      baseLayers: {Object},
   *      defaults: {Array},
   *      overlays: {Object}
   *    }
   */
  _getStaticLayers = function () {
    var dark,
        faults,
        greyscale,
        layers,
        satellite,
        terrain;

    dark = L.darkLayer();
    faults = L.faultsLayer();
    greyscale = L.greyscaleLayer();
    satellite = L.satelliteLayer();
    terrain = L.terrainLayer();

    layers = {};
    layers.baseLayers = {
      'Greyscale': greyscale,
      'Terrain': terrain,
      'Satellite': satellite,
      'Dark': dark
    };
    layers.defaults = [greyscale, faults];
    layers.overlays = {
      'Faults': faults
    };

    return layers;
  };

  /**
   * Hide zoom control on mobile (in favor of pinch-to-zoom)
   */
  _hideZoomControl = function () {
    var control;

    control = _el.querySelector('.leaflet-control-zoom');
    if (L.Browser.mobile) {
      control.classList.add('hide');
    }
  };

  /**
   * Create Leaflet map instance
   */
  _initMap = function () {
    // Create map and set initial view / state
    _this.map = L.map(_el.querySelector('.map'), {
      worldCopyJump: true
    });
    _this.reset();

    // Create custom pane for Faults overlay within tilePane
    _this.createMapPane('faults', 'tilePane');

    // Add default layers to map
    _staticLayers.defaults.forEach(function(layer) {
      _this.map.addLayer(layer);
    });

    // Add / remove controls
    _this.layerControl = _addLayerControl();
    L.control.mousePosition({position: 'bottomcenter'}).addTo(_this.map);
    L.control.scale().addTo(_this.map);
    _hideZoomControl();

    // Remember user's map settings (selected layers, map extent)
    // _this.map.restoreMap({
    //   baseLayers: _staticLayers.baseLayers,
    //   id: 'eqid', // TODO: insert actual eqid
    //   overlays: _staticLayers.overlays,
    //   scope: 'response'
    // });
  };

  /**
   * Determine if Leaflet layer is a baselayer or not
   *
   * @param name {String}
   *
   * @return r {Boolean}
   */
  _isBaseLayer = function (layer) {
    var r = false;

    Object.keys(_staticLayers.baseLayers).forEach(function(key) {
      if (_staticLayers.baseLayers[key] === layer) {
        r = true;
      }
    });

    return r;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add feature layer to map
   *
   * @param feature {Object}
   */
  _this.addFeatureLayer = function (feature) {
    var id,
        layer;

    id = feature.id;
    layer = feature.getMapLayer();

    _features[id] = feature;

    // Add layer to controller
    _this.layerControl.addOverlay(layer, feature.name);

    // Turn layer "on" / zoom map if set to be displayed / zoomed by default
    if (feature.displayLayer) {
      _this.map.addLayer(layer);
    }
    if (feature.zoomToLayer) {
      _this.setView(feature);
    }
  };

  /**
   * Create a separate map pane for each feature - used to control stacking order
   *
   * @param id {String}
   * @param parent {String}
   */
  _this.createMapPane = function (id, parent) {
    if (!_this.map.getPane(id)) {
      _this.map.createPane(id, _this.map.getPane(parent));
    }
  };

  /**
   * Open popup matching eqid in feature layer
   *
   * @param feature {String}
   * @param eqid {String}
   */
  _this.openPopup = function (feature, eqid) {
    var layer,
        map,
        marker;

    layer = _features[feature].getMapLayer();
    map = _this.map;

    // Simulate clicking on 'Map' button on navbar
    _mapNavButton.click();

    // Get marker associated with given eqid within feature layer
    layer.eachLayer(function(m) {
      if (m.feature.id === eqid) {
        marker = m;
      }
    });

    // Center on marker so user can easily zoom into feature
    map.setView(marker.getLatLng(), map.getZoom());

    // Call L.popup.update() after map is visible so popup displays correctly
    map.on('visible', function() {
      marker.getPopup().update();
      // Remove listener so it doesn't trigger again for following events
      map.off('visible');
    });

    // Turn on feature layer (if not already) so its popup can be displayed
    if (!map.hasLayer(layer)) {
      map.addLayer(layer);
    }
    marker.openPopup();
  };

  /**
   * Reset state and set default map extent
   */
  _this.reset = function () {
    _bounds = L.latLngBounds();
    _features = {};
    _initialLoad = true;

    _this.map.setView([40, -96], 4); // United States
  };

  /**
   * Zoom map extent to contain features with 'zoomToLayer' prop set to true
   *
   * @param feature {String}
   *     optional feature layer to zoom to; zooms to all layers if not set
   */
  _this.setView = function (feature) {
    var layer,
        setView;

    // Flag to determine if map extent will be set
    setView = false;

    if (feature) { // set bounds to feature being added
      layer = feature.getMapLayer();
      _bounds.extend(layer.getBounds());
      setView = true;
    } else { // set bounds to all features (called via NavBar.js)
      if (_initialLoad) { // only need to set first time map is visible
        setView = true;

        Object.keys(_features).forEach(function(feature) {
          if (_features[feature].zoomToLayer) {
            layer = _features[feature].getMapLayer();
            _bounds.extend(layer.getBounds());
          }
        });
        _initialLoad = false;
      }
    }

    if (setView && _bounds.isValid()) {
      _this.map.fitBounds(_bounds, {
        paddingTopLeft: L.point(0, 45), // accommodate navbar
        reset: true
      });
      // Map gets set at max zoom when mainshock is only 'zoomto' layer; Manually zoom out
      if (_this.map.getZoom() > 17) {
        _this.map.setZoom(10);
      }
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = MapPane;
