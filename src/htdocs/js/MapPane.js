/* global L */
'use strict';


// Leaflet plugins
require('mappane/Control-bottomCenter');
require('mappane/MousePosition');
//require('mappane/RestoreMap');

// Factories for creating map layers
require('mappane/DarkLayer');
require('mappane/FaultsLayer');
require('mappane/GreyscaleLayer');
require('mappane/SatelliteLayer');
require('mappane/TerrainLayer');


/**
 * Set up Leaflet map instance and immediately add non-event-specific map layers
 *
 * Also adds / removes event-specific 'Feature' layers that are created after
 *   external feed data is loaded
 *
 * @param options {Object}
 *   {
 *     app: {Object}, // Application
 *     el: {Element}
 *   }
 *
 * @return _this {Object}
 *   {
 *     addFeature: {Function},
 *     initView: {Function},
 *     map: {Object},
 *     openPopup: {Function},
 *     removeFeature: {Function},
 *     reset: {Function}
 *   }
 */
var MapPane = function (options) {
  var _this,
      _initialize,

      _app,
      _bounds,
      _el,
      _initialLoad,
      _layerControl,
      _mapNavButton,
      _staticLayers,

      _addLayerControl,
      _addListeners,
      _compareLayers,
      _createPane,
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

    _app = options.app;
    _bounds = L.latLngBounds();
    _el = options.el || document.createElement('div');
    _initialLoad = true;
    _mapNavButton = document.querySelector('#navBar [href="#mapPane"]');
    _staticLayers = _getStaticLayers();

    _initMap();
    _addListeners();
  };

  /**
   * Add layer control to map
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
   * Add event listeners for setting Features's showLayer property when user
   *   toggles layers on/off
   */
  _addListeners = function () {
    var id,
        showLayer;

    _this.map.on('overlayadd overlayremove', function (e) {
      id = _app.Features.getFeatureId(e.name);
      showLayer = false;

      if (e.type === 'overlayadd') {
        showLayer = true;
      }

      _app.Features.getFeature(id).showLayer = showLayer;
    });
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
    var sortValues;

    sortValues = [
      _getSortValue(layerA),
      _getSortValue(layerB)
    ];

    if (sortValues[0] < sortValues[1]) {
      return 1;
    } else if (sortValues[0] > sortValues[1]) {
      return -1;
    }

    return 0;
  };

  /**
   * Create a separate pane for each Feature (used to control stacking order)
   *
   * @param id {String}
   * @param parent {String <overlayPane | tilePane>}
   */
  _createPane = function (id, parent) {
    if (!_this.map.getPane(id)) {
      _this.map.createPane(id, _this.map.getPane(parent));
    }
  };

  /**
   * Zoom map extent to contain _bounds
   *   _bounds includes all Features with 'zoomToLayer' prop set to true
   */
  _fitBounds = function () {
    if (_bounds.isValid()) {
      _this.map.fitBounds(_bounds, {
        paddingTopLeft: L.point(0, 40) // accommodate navbar
      });
    }

    // Zoom out if map is zoomed too close for context (i.e. mainshock only)
    if (_this.map.getZoom() > 17) {
      _this.map.setZoom(12);
    }
  };

  /**
   * Get the id value for a layer, which is typically the Feature's id prop,
   *   except in cases where the map layer is not a Feature layer (i.e. faults)
   *
   * @param layer {L.layer}
   *
   * @return id {String}
   */
  _getLayerId = function (layer) {
    var features,
        id;

    if (layer.hasOwnProperty('id')) { // faults
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
   * Get the sort value of a Leaflet layer, which is its z-index value
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
      sortValue = 1; // base layers don't have a z-index/don't need to be sorted
    } else {
      className = 'leaflet-' + _getLayerId(layer) + '-pane';
      leafletPane = _el.querySelector('.' + className);
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

    layers = {
      baseLayers: {
        'Greyscale': greyscale,
        'Terrain': terrain,
        'Satellite': satellite,
        'Dark': dark
      },
      defaults: [
        faults,
        greyscale
      ],
      overlays: {
        'Faults': faults
      }
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
    _this.map = L.map(_el.querySelector('.map'), {
      worldCopyJump: true
    });
    _this.reset(); // set initial state of map

    // Create custom pane for Faults overlay within tilePane
    _createPane('faults', 'tilePane'); // pane is applied in Faults factory

    // Add default layers to map (i.e. toggle on in layer control)
    _staticLayers.defaults.forEach(function(layer) {
      _this.map.addLayer(layer);
    });

    // Add / remove Leaflet controls
    _layerControl = _addLayerControl();
    L.control.mousePosition({
      position: 'bottomcenter'
    }).addTo(_this.map);
    L.control.scale().addTo(_this.map);
    _hideZoomControl();

    // Remember user's map settings (selected layers, map extent)
    // _this.map.restoreMap({
    //   baseLayers: _staticLayers.baseLayers,
    //   id: _app.AppUtil.getParam('eqid'),
    //   overlays: _staticLayers.overlays,
    //   scope: 'response-app'
    // });
  };

  /**
   * Determine if Leaflet layer is a baselayer or not
   *
   * @param layer {L.Layer}
   *
   * @return isBaseLayer {Boolean}
   */
  _isBaseLayer = function (layer) {
    var isBaseLayer = false;

    Object.keys(_staticLayers.baseLayers).forEach(function(key) {
      if (_staticLayers.baseLayers[key] === layer) {
        isBaseLayer = true;
      }
    });

    return isBaseLayer;
  };

  /**
   * Set map bounds to contain Feature
   *
   * @param feature {Object}
   */
  _setBounds = function (feature) {
    _bounds.extend(feature.mapLayer.getBounds());

    _fitBounds(); // call in case MapPane is visible while Features are being added
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add a Feature layer to map
   *
   * @param feature {Object}
   */
  _this.addFeature = function (feature) {
    var title;

    title = feature.title || feature.name;

    if (feature.mapLayer) {
      _createPane(feature.id, 'overlayPane'); // applied in mapLayer's marker options
      _layerControl.addOverlay(feature.mapLayer, title);

      // Turn layer "on" and zoom map if set to be displayed / zoomed by default
      if (feature.showLayer) {
        _this.map.addLayer(feature.mapLayer);

        if (feature.zoomToLayer) {
          _setBounds(feature);
        }
      }
    }
  };

  /**
   * Set initial map extent when user views MapPane for the first time; need
   *   to do this because Leaflet doesn't manipulate the map when not visible
   */
  _this.initView = function () {
    if (_initialLoad) {
      _fitBounds();
    }

    _initialLoad = false;
  };

  /**
   * Open popup matching eqid in Feature layer - used for displaying map popups
   *   from user interaction on other panes
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

    // Simulate clicking on 'Map' button on navbar (be certain map pane is active)
    _mapNavButton.click();

    // Get marker associated with given eqid within Feature layer
    layer.eachLayer(function(m) {
      if (m.feature.id === eqid) {
        marker = m;
      }
    });

    map.on('visible', function() {
      // Center map on marker
      map.setView(marker.getLatLng(), map.getZoom());
      // Call L.popup.update() after map is visible so popup displays correctly
      marker.getPopup().update();
      // Remove listener so it doesn't trigger next time map is visible
      map.off('visible');
    });

    // Turn on Feature layer so its popup can be displayed
    if (!map.hasLayer(layer)) {
      map.addLayer(layer);
    }
    marker.openPopup();
  };

  /**
   * Remove a Feature layer from map
   *
   * @param feature {Object}
   */
  _this.removeFeature = function (feature) {
    var mapLayer,
        showLayer;

    mapLayer = feature.mapLayer;
    showLayer = feature.showLayer; // cache value

    if (mapLayer) {
      _this.map.removeLayer(mapLayer); // sets showLayer prop to false
      _layerControl.removeLayer(mapLayer);
    }

    feature.showLayer = showLayer; // set to cached value
  };

  /**
   * Reset map pane to initial state
   *   Set default map extent and purge canvas elements (FM, MT)
   */
  _this.reset = function () {
    var canvasEls,
        i;

    _bounds = L.latLngBounds();
    _initialLoad = true;

    _this.map.setView([40, -96], 4); // United States

    canvasEls = _el.querySelectorAll('canvas');
    for (i = 0; i < canvasEls.length; i ++) {
      _el.removeChild(canvasEls[i]);
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = MapPane;
