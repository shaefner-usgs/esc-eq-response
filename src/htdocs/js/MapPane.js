/* global L */
'use strict';


// Leaflet plugins and layer factories (these get attached to the global L obj)
require('leaflet/Control-bottomCenter');
require('leaflet/DarkLayer');
require('leaflet/FaultsLayer');
require('leaflet/GreyscaleLayer');
require('leaflet/MousePosition');
require('leaflet/SatelliteLayer');
require('leaflet/TerrainLayer');


/**
 * Create an interactive map using Leaflet and add 'static' (non-event-specific)
 * layers to the map. Also add/remove 'dynamic' (event-specific) Feature layers
 * as they are created/updated from external feed data.
 *
 * @param options {Object}
 *   {
 *     app: {Object} Application
 *     el: {Element}
 *   }
 *
 * @return _this {Object}
 *   {
 *     addFeature: {Function}
 *     addLoader: {Function}
 *     openPopup: {Function}
 *     removeFeature: {Function}
 *     render: {Function}
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
      _map,
      _placeholders,
      _staticLayers,

      _addControls,
      _addLayerControl,
      _addListeners,
      _compareLayers,
      _createPane,
      _getBounds,
      _getSortValue,
      _getStaticLayers,
      _initMap,
      _isBaseLayer,
      _setDefaultView,
      _setView;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _bounds = L.latLngBounds();
    _el = options.el || document.createElement('div');
    _initialLoad = true;
    _placeholders = {};
    _staticLayers = _getStaticLayers();

    _initMap();
    _addListeners();
  };

  /**
   * Add controls to the map: layers, mouse position and scale.
   */
  _addControls = function () {
    _layerControl = _addLayerControl();

    L.control.mousePosition({
      position: 'bottomcenter'
    }).addTo(_map);

    L.control.scale().addTo(_map);
  };

  /**
   * Add layer control to the map.
   *
   * @return control {L.Control}
   */
  _addLayerControl = function () {
    var control = L.control.layers(
      _staticLayers.baseLayers,
      _staticLayers.overlays, {
        sortFunction: _compareLayers,
        sortLayers: true
      }
    ).addTo(_map);

    return control;
  };

  /**
   * Add event listeners.
   *
   * The overlay listener is triggered when a layer is added or removed,
   * including programmatically.
   */
  _addListeners = function () {
    var feature,
        showLayer;

    // Track a Feature's showLayer property when the layer is toggled on/off
    _map.on('overlayadd overlayremove', e => {
      feature = _app.Features.getFeature(e.layer.id);
      showLayer = false;

      if (e.type === 'overlayadd') {
        showLayer = true;
      }
      if (feature && Object.prototype.hasOwnProperty.call(feature, 'showLayer')) {
        feature.showLayer = showLayer;
      }
    });
  };

  /**
   * Comparison function to sort overlays in the layer control.
   *
   * @param layerA {L.Layer}
   * @param layerB {L.Layer}
   *
   * @return {Integer}
   */
  _compareLayers = function (layerA, layerB) {
    var sortValues = [
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
   * Create a custom Leaflet pane for a given map layer, which is used to
   * control the stacking order.
   *
   * The pane option must be set to the layer's id value in the layer Factory.
   *
   * @param id {String}
   *     Feature/layer id
   * @param parent {String <overlayPane|tilePane>}
   */
  _createPane = function (id, parent) {
    if (!_map.getPane(id)) {
      _map.createPane(id, _map.getPane(parent));
    }
  };

  /**
   * Get the initial map bounds (centered on the Mainshock) that contain the max
   * extent of Aftershocks, Foreshocks and Historical Seismicity Features.
   *
   * @param latlng {L.LatLng}
   *     Mainshock's coords.
   *
   * @return bounds {L.Bounds}
   */
  _getBounds = function (latLng) {
    var bounds,
        maxDistance;

    maxDistance = Math.max(
      Number(document.querySelector('input#as-dist').value),
      Number(document.querySelector('input#fs-dist').value),
      Number(document.querySelector('input#hs-dist').value)
    );
    bounds = latLng.toBounds(maxDistance * 1000); // km -> meters

    return bounds;
  };

  /**
   * Get the sort value of a Leaflet layer, which is its z-index value.
   *
   * @param layer {L.Layer}
   *
   * @return sortValue {Integer}
   *     z-index value (or 1 if it is a base layer)
   */
  _getSortValue = function (layer) {
    var className,
        pane,
        sortValue,
        styles;

    if (_isBaseLayer(layer)) {
      sortValue = 1; // base layers don't need to be sorted
    } else {
      className = 'leaflet-' + layer.id + '-pane';
      pane = _el.querySelector('.' + className);
      styles = window.getComputedStyle(pane);
      sortValue = Number(styles.getPropertyValue('z-index'));
    }

    return sortValue;
  };

  /**
   * Get 'static' map layers that are the same on all maps (i.e. base layers and
   * faults overlay).
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
   * Create the Leaflet map instance.
   */
  _initMap = function () {
    var zoomControl = _el.querySelector('.leaflet-control-zoom');

    _map = L.map(_el.querySelector('.map'), {
      layers: _staticLayers.defaults,
      tap: false, // fix for popups not opening in Safari, see: https://github.com/Leaflet/Leaflet/issues/7255
      worldCopyJump: true
    });

    _createPane('faults', 'tilePane');
    _addControls();
    _setDefaultView();

    // Hide zoom control on mobile (in favor of pinch-to-zoom)
    if (L.Browser.mobile) {
      zoomControl.style.display = 'none';
    }
  };

  /**
   * Determine if a given Leaflet layer is a base layer or not.
   *
   * @param layer {L.Layer}
   *
   * @return isBaseLayer {Boolean}
   */
  _isBaseLayer = function (layer) {
    var isBaseLayer = false;

    Object.keys(_staticLayers.baseLayers).forEach(key => {
      if (_staticLayers.baseLayers[key] === layer) {
        isBaseLayer = true;
      }
    });

    return isBaseLayer;
  };

  /**
   * Set the default map extent centered on the continental U.S.
   */
  _setDefaultView = function () {
    _map.setView([40, -96], 4);
  };

  /**
   * Set the map extent to contain _bounds, which includes all Features whose
   * 'zoomToLayer' property is set to true.
   */
  _setView = function () {
    if (_bounds.isValid()) {
      _map.fitBounds(_bounds, {
        paddingTopLeft: L.point(0, 120) // accommodate header
      });
    }
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add a Feature layer to the map and remove the placeholder layer and
   * 'loader'. Set the map extent after adding the last Feature.
   *
   * @param feature {Object}
   */
  _this.addFeature = function (feature) {
    var layer,
        name,
        placeholder,
        status;

    status = _app.Features.getLoadingStatus();

    if (feature.mapLayer) {
      layer = feature.mapLayer;
      layer.id = feature.id; // add Feature's id to Leaflet layer
      name = feature.name;
      placeholder = _placeholders[feature.id]; // name and 'loader' in layer control

      if (Object.prototype.hasOwnProperty.call(feature, 'count')) {
        name += '<span class="count">' + feature.count + '</span>';
      }

      if (placeholder) {
        _layerControl.removeLayer(placeholder);
        delete _placeholders[feature.id];
      } else { // custom pane not created yet
        _createPane(feature.id, 'overlayPane');
      }

      _layerControl.addOverlay(layer, name);

      if (feature.id === 'mainshock') {
        _bounds = _getBounds(layer.getLayers()[0].getLatLng());
        _setView();
      }

      // Turn layer "on" and set map bounds to contain Feature, if applicable
      if (feature.showLayer) {
        _map.addLayer(layer);
      }
      if (feature.zoomToLayer && _initialLoad) {
        _bounds.extend(layer.getBounds());
      }
    }

    // Set final map extent once all Features are loaded
    if (status === 'complete') {
      _setView();
    }
  };

  /**
   * Add a Feature's name and 'loader' to the layer control.
   *
   * @param feature {Object}
   */
  _this.addLoader = function (feature) {
    var layer,
        name;

    if (Object.prototype.hasOwnProperty.call(feature, 'mapLayer')) {
      layer = L.featureGroup(); // empty placeholder layer
      name = feature.name + '<span class="breather"><span></span></span>';

      layer.id = feature.id; // need access to Feature's id from Leaflet layer
      _placeholders[feature.id] = layer; // cache placeholder layer

      _createPane(feature.id, 'overlayPane');
      _layerControl.addOverlay(layer, name);
    }
  };

  /**
   * Open a map popup matching the given eqid in a given Feature layer when the
   * user selects an eq from Plot/SummaryPanes. Also switch to MapPane.
   *
   * @param eqid {String}
   * @param featureId {String}
   */
  _this.openPopup = function (eqid, featureId) {
    var layer,
        marker;

    layer = _app.Features.getFeature(featureId).mapLayer;

    // Get the marker associated with the given eqid
    layer.eachLayer(eq => {
      if (eq.feature.id === eqid) {
        marker = eq;
      }
    });

    _map.on('visible', () => {
      marker.getPopup().update(); // display popup properly
      _map.off('visible'); // remove listener
    });

    window.location.href = '#mapPane';

    // Turn on Feature layer so its popup can be displayed
    if (!_map.hasLayer(layer)) {
      _map.addLayer(layer);
    }

    marker.openPopup();
  };

  /**
   * Remove a Feature layer from the map.
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
      _map.removeLayer(mapLayer); // sets showLayer prop to false
      _layerControl.removeLayer(mapLayer);

      feature.showLayer = showLayer; // set back to cached value
    }

    if (placeholder) {
      _layerControl.removeLayer(placeholder);
      delete _placeholders[feature.id];
    }
  };

  /**
   * Render the map correctly when the MapPane is activated.
   */
  _this.render = function () {
    var status = _app.Features.getLoadingStatus();

    _map.invalidateSize(); // updates map if its container size was changed
    _map.fire('visible'); // displays popups added when map was hidden

    // Set the initial view when MapPane is viewed for the first time.
    if (_initialLoad && status === 'complete') {
      _initialLoad = false;

      _setView();
    }
  };

  /**
   * Reset to default state.
   */
  _this.reset = function () {
    var canvasEls = document.querySelectorAll('#mapPane > canvas');

    _bounds = L.latLngBounds();
    _initialLoad = true;
    _placeholders = {};

    // Purge canvas elements (FM, MT beachballs)
    canvasEls.forEach(el => {
      _el.removeChild(el);
    });

    // Reset layer controller
    if (_layerControl) {
      _layerControl.remove();

      _layerControl = _addLayerControl();
    }

    _setDefaultView();
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = MapPane;
