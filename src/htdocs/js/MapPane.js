/* global L */
'use strict';


// Leaflet plugins
require('mappane/Control-bottomCenter');
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
 *   (event-specific 'Feature' layers are added by Features.js)
 *
 * @param options {Object}
 *   {
 *     app: {Object}
 *     el: {Element}
 *   }
 */
var MapPane = function (options) {
  var _this,
      _initialize,

      _app,
      _bounds,
      _el,
      _mapNavButton,
      _staticLayers,

      _addLayerControl,
      _compareLayers,
      _fitBounds,
      _getLayerId,
      _getSortValue,
      _getStaticLayers,
      _hideZoomControl,
      _initMap,
      _isBaseLayer,
      _setBounds;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _mapNavButton = document.querySelector('#navBar [href="#mapPane"]');

    _app = options.app;
    _el = options.el || document.createElement('div');
    _staticLayers = _getStaticLayers();

    _this.initialLoad = true;

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
   * @param layerA {L.Layer}
   * @param layerB {L.Layer}
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
   * Get the id value for a given layer, which is typically the Feature's id,
   *   except in cases where the map layer is not a Feature layer (i.e. faults)
   *
   * @param layer {L.layer}
   *
   * @return id {String}
   */
  _getLayerId = function (layer) {
    var features,
        id;

    if (layer.hasOwnProperty('id')) {
      id = layer.id;
    } else {
      features = _app.Features.getFeatures();
      Object.keys(features).forEach(function(key) {
        if (layer === features[key].mapLayer) {
          id = key;
        }
      });
    }

    return id;
  };

  /**
   * Get sort value of Leaflet layer, which is its z-index value
   *
   * @param layer {L.Layer}
   *
   * @return sortValue {Integer}
   *     z-index value or 1 if no z-index
   */
  _getSortValue = function (layer) {
    var className,
        leafletPane,
        sortValue,
        styles;

    if (_isBaseLayer(layer)) {
      sortValue = 1; // base layers don't have a z-index
    } else {
      className = 'leaflet-' + _getLayerId(layer) + '-pane';
      leafletPane = document.querySelector('.' + className);
      styles = window.getComputedStyle(leafletPane);
      sortValue = Number(styles.getPropertyValue('z-index'));
    }

    return sortValue;
  };

  /**
   * Get all 'static' map layers
   *   excludes 'dynamic' Feature layers that depend on user-set parameters
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
    _this.createMapPane('faults', 'tilePane'); // pane is applied in Faults factory

    // Add default layers to map (i.e. toggle on in layer control)
    _staticLayers.defaults.forEach(function(layer) {
      _this.map.addLayer(layer);
    });

    // Add / remove Leaflet controls
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
   * @param layer {L.Layer}
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

  /**
   * Set map extent to contain all features (bounds)
   */
  _fitBounds = function () {
    if (_bounds.isValid()) {
      _this.map.fitBounds(_bounds, {
        paddingTopLeft: L.point(0, 80), // accommodate navbar
        reset: true
      });
    }

    // Zoom out if map is zoomed in too close for context (e.g. just mainshock)
    if (_this.map.getZoom() > 17) {
      _this.map.setZoom(12);
    }
  };

  /**
   * Zoom map extent to contain Features with 'zoomToLayer' prop set to true
   *
   * @param feature {Object}
   *     Feature layer to zoom map to
   */
  _setBounds = function (feature) {
    _bounds.extend(feature.mapLayer.getBounds());

    _fitBounds(); // call in case Map pane is visible
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add 'dynamic' Feature layer to map
   *
   * @param feature {Object}
   */
  _this.addFeatureLayer = function (feature) {
    // Add layer to controller
    _this.layerControl.addOverlay(feature.mapLayer, feature.name);

    // Turn layer "on" / zoom map if set to be displayed / zoomed by default
    if (feature.displayLayer) {
      _this.map.addLayer(feature.mapLayer);
    }
    if (feature.zoomToLayer) {
      _setBounds(feature);
    }
  };

  /**
   * Create a separate map pane for each Feature - used to control stacking order
   *
   * @param id {String}
   * @param parent {String <overlayPane | tilePane>}
   */
  _this.createMapPane = function (id, parent) {
    if (!_this.map.getPane(id)) {
      _this.map.createPane(id, _this.map.getPane(parent));
    }
  };

  /**
   * Set initial map extent when user views Map pane for the first time
   *   necessary to do this because Leaflet can't manipulate map when not visible
   */
  _this.initView = function () {
    if (_this.initialLoad) {
      _fitBounds();
    }

    _this.initialLoad = false;
  };

  /**
   * Open popup matching eqid in Feature layer
   *
   * @param id {String}
   *     id of feature
   * @param eqid {String}
   */
  _this.openPopup = function (id, eqid) {
    var layer,
        map,
        marker;

    layer = _app.Features.getFeature(id).mapLayer;
    map = _this.map;

    // Simulate clicking on 'Map' button on navbar
    _mapNavButton.click();

    // Get marker associated with given eqid within Feature layer
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

    // Turn on Feature layer (if not already) so its popup can be displayed
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

    _this.initialLoad = true;
    _this.map.setView([40, -96], 4); // United States
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = MapPane;
