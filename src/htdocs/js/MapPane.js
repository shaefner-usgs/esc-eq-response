/* global L */
'use strict';


// Leaflet plugins and layer factories (attached to global L var)
require('mappane/Control-bottomCenter');
require('mappane/DarkLayer');
require('mappane/FaultsLayer');
require('mappane/GreyscaleLayer');
require('mappane/MousePosition');
//require('mappane/RestoreMap');
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
 *     addLoadingSpinner: {Function},
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
      _placeholders,
      _staticLayers,

      _addLayerControl,
      _addListeners,
      _addMapControls,
      _compareLayers,
      _createMapPane,
      _fitBounds,
      _getSortValue,
      _getStaticLayers,
      _initMap,
      _isBaseLayer,
      _setDefaultMapExtent,
      _setInitialMapExtent;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _bounds = L.latLngBounds();
    _el = options.el || document.createElement('div');
    _initialLoad = true;
    _mapNavButton = document.querySelector('#navBar [href="#mapPane"]');
    _placeholders = {};
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
   * Add event listeners for tracking Features's showLayer property when user
   *   toggles layers on/off
   *
   * Listener is triggered anytime a layer is added/removed, even programmatically
   */
  _addListeners = function () {
    var feature,
        showLayer;

    _this.map.on('overlayadd overlayremove', function (e) {
      feature = _app.Features.getFeature(e.layer.id);

      showLayer = false;
      if (e.type === 'overlayadd') {
        showLayer = true;
      }
      if (feature && feature.hasOwnProperty('showLayer')) {
        feature.showLayer = showLayer;
      }
    });
  };

  /**
   * Set up Leaflet map controls: layers, mouse position, scale, zoom
   */
  _addMapControls = function () {
    var zoomControl;

    _layerControl = _addLayerControl();

    L.control.mousePosition({ // plugin
      position: 'bottomcenter'
    }).addTo(_this.map);

    L.control.scale().addTo(_this.map);

    // Hide zoom control on mobile (in favor of pinch-to-zoom)
    if (L.Browser.mobile) {
      zoomControl = _el.querySelector('.leaflet-control-zoom');
      zoomControl.classList.add('hide');
    }
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
   * Pane is set/applied in layer's Factory during creation
   *
   * @param id {String}
   * @param parent {String <overlayPane | tilePane>}
   */
  _createMapPane = function (id, parent) {
    if (!_this.map.getPane(id)) {
      _this.map.createPane(id, _this.map.getPane(parent));
    }
  };

  /**
   * Set map extent to contain bounds or _bounds (_bounds includes all Features
   *   with 'zoomToLayer' prop set to true)
   *
   * @param bounds {L.bounds}
   *     optional - uses _bounds if not set
   */
  _fitBounds = function (bounds) {
    if (!bounds) {
      bounds = _bounds;
    }
    if (bounds.isValid()) {
      _this.map.fitBounds(bounds, {
        paddingTopLeft: L.point(0, 40) // accommodate navbar
      });
    }
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
      className = 'leaflet-' + layer.id + '-pane';
      leafletPane = _el.querySelector('.' + className);
      styles = window.getComputedStyle(leafletPane);
      sortValue = Number(styles.getPropertyValue('z-index'));
    }

    return sortValue;
  };

  /**
   * Get 'static' map layers that are the same on all maps
   *
   * Excludes 'dynamic' Feature layers that depend on user-set parameters
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
   * Create Leaflet map instance
   */
  _initMap = function () {
    var layers;

    layers = [];
    _staticLayers.defaults.forEach(function(layer) {
      layers.push(layer);
    });

    _this.map = L.map(_el.querySelector('.map'), {
      layers: layers,
      worldCopyJump: true
    });

    _createMapPane('faults', 'tilePane');
    _addMapControls();
    _setDefaultMapExtent();

    // Remember user's map settings (selected layers, map extent)
    // _this.map.restoreMap({
    //   baseLayers: _staticLayers.baseLayers,
    //   id: AppUtil.getParam('eqid'),
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
   * Set map extent to continental United States
   */
  _setDefaultMapExtent = function () {
    _this.map.setView([40, -96], 4);
  };

  /**
   * Set intial map extent to center on mainshock and contain all aftershocks,
   *   foreshocks, historical seismicity
   *
   * @param latlng {L.latLng}
   */
  _setInitialMapExtent = function (latLng) {
    var bounds,
        maxDistance;

    // Distance from mainshock to include all earthquake Feature layers
    maxDistance = Math.max(
      Number(document.querySelector('input#as-dist').value),
      Number(document.querySelector('input#fs-dist').value),
      Number(document.querySelector('input#hs-dist').value)
    );

    bounds = latLng.toBounds(maxDistance * 1000); // km -> meters
    _fitBounds(bounds);
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
    var layer,
        name,
        placeholder,
        status;

    if (feature.mapLayer) {
      layer = feature.mapLayer;
      layer.id = feature.id; // attach Feature id to Leaflet layer

      name = feature.name;
      if (feature.hasOwnProperty('count')) {
        name += '<span class="count">' + feature.count + '</span>';
      }

      placeholder = _placeholders[feature.id]; // loading status in layer control
      if (placeholder) {
        _layerControl.removeLayer(placeholder);
        delete _placeholders[feature.id];
      } else { // map pane not yet created
        _createMapPane(feature.id, 'overlayPane');
      }

      _layerControl.addOverlay(layer, name);

      if (feature.id === 'mainshock') {
        _setInitialMapExtent(layer.getLayers()[0].getLatLng());
      }

      // Turn layer "on" and set map bounds to contain Feature, if applicable
      if (feature.showLayer) {
        _this.map.addLayer(layer);
      }
      if (feature.zoomToLayer && _initialLoad) {
        _bounds.extend(layer.getBounds());
      }
    }

    // Set final map extent once all Features are loaded
    status = _app.Features.getLoadingStatus();
    if (status === 'finished') {
      _fitBounds();
    }
  };

  /**
   * Add a Feature's name and a loading 'spinner' to the layer control
   *
   * @param feature {Object}
   */
  _this.addLoadingSpinner = function (feature) {
    var layer,
        name;

    if (feature.hasOwnProperty('mapLayer')) {
      layer = L.layerGroup(); // empty placeholder layer
      layer.id = feature.id;
      name = feature.name + '<div class="spinner"><div></div></div>';

      _createMapPane(feature.id, 'overlayPane');

      _layerControl.addOverlay(layer, name);
      _placeholders[feature.id] = layer; // cache placeholder layer
    }
  };

  /**
   * Set initial map extent when user views MapPane for the first time; need to
   *   do this because Leaflet doesn't manipulate the map when it's not visible
   */
  _this.initView = function () {
    var status;

    status = _app.Features.getLoadingStatus();
    if (_initialLoad && status === 'finished') {
      _fitBounds();
      _initialLoad = false;
    }
  };

  /**
   * Open map popup matching eqid in Feature layer - used for displaying popups
   *   from user interaction on plot/summary panes
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
        placeholder,
        showLayer;

    mapLayer = feature.mapLayer;
    placeholder = _placeholders[feature.id]; // loading status in layer control
    showLayer = feature.showLayer; // cache value

    if (mapLayer) {
      _this.map.removeLayer(mapLayer); // sets showLayer prop to false
      _layerControl.removeLayer(mapLayer);

      feature.showLayer = showLayer; // set back to cached value
    }

    if (placeholder) {
      _layerControl.removeLayer(placeholder);
      delete _placeholders[feature.id];
    }
  };

  /**
   * Reset map pane to initial state
   */
  _this.reset = function () {
    var canvasEls,
        i;

    // Purge existing canvas elements (FM, MT beachballs)
    canvasEls = document.querySelectorAll('#mapPane > canvas');
    for (i = 0; i < canvasEls.length; i ++) {
      _el.removeChild(canvasEls[i]);
    }

    _bounds = L.latLngBounds();
    _initialLoad = true;
    _placeholders = {};

    // Reset layer controller
    if (_layerControl) {
      _layerControl.remove();
      _layerControl = _addLayerControl();
    }

    _setDefaultMapExtent();
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = MapPane;
