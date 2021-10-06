/* global L */
'use strict';


var AppUtil = require('util/AppUtil');


/* Leaflet plugins and layer factories (these get attached to the global L obj)
   NOTE: Leaflet.Editable strips all custom props added to L, therefore:
   1) add leaflet-editable first;
   2) CanvasMarker must be added here (not in dependent Classes). */
require('leaflet-editable'); // used in SearchBar.js
require('leaflet/CanvasMarker'); // used in FocalMechanism.js and MomentTensor.js
require('leaflet/BottomCenter');
require('leaflet/DarkLayer');
require('leaflet/FaultsLayer');
require('leaflet/GreyscaleLayer');
require('leaflet/MousePosition');
require('leaflet/SatelliteLayer');
require('leaflet/TerrainLayer');
require('leaflet/ZoomCenter');


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
 *     addLayer: {Function}
 *     addLoader: {Function}
 *     openPopup: {Function}
 *     removeFeature: {Function}
 *     render: {Function}
 *     reset: {Function}
 *     shiftMap: {Function}
 *     showSearchLayer: {Function}
 *   }
 */
var MapPane = function (options) {
  var _this,
      _initialize,

      _app,
      _bounds,
      _defaultBounds,
      _el,
      _initialView,
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
      _setView;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _bounds = L.latLngBounds();
    _defaultBounds = L.latLngBounds([ // centered on contiguous U.S.
      [8, -143],
      [60, -48]
    ]);
    _el = options.el || document.createElement('section');
    _initialView = true;
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
    L.control.zoom.center().addTo(_map);
  };

  /**
   * Add layer control to the map.
   *
   * @return control {L.Control}
   */
  _addLayerControl = function () {
    var control,
        overlays;

    overlays = Object.assign({}, _staticLayers.overlays, _staticLayers.search);
    control = L.control.layers(
      _staticLayers.baseLayers,
      overlays, {
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
      Number(document.getElementById('as-dist').value),
      Number(document.getElementById('fs-dist').value),
      Number(document.getElementById('hs-dist').value)
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
   * overlays that are independent of the selected Mainshock).
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
    var zoomControl;

    _map = L.map(_el.querySelector('.map'), {
      layers: _staticLayers.defaults,
      tap: false, // fix for popups not opening in Safari, see: https://github.com/Leaflet/Leaflet/issues/7255
      worldCopyJump: true,
      zoomControl: false // hide default control in favor of custom control
    });

    _createPane('faults', 'tilePane');
    _addControls();
    _map.setView([0, 0], 1); // set arbitrary view for now

    // Hide zoom control on mobile (in favor of pinch-to-zoom)
    if (L.Browser.mobile) {
      zoomControl = _el.querySelector('.leaflet-control-zoom');

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
   * Set the map extent to contain an L.LatLngBounds instance.
   *
   * Note: _bounds can be passed to include all Features that have the
   *       'zoomToLayer' property set to true.
   *
   * @param bounds {L.bounds} default is _defaultBounds
   * @param animate {Boolean} default is false
   */
  _setView = function (bounds = _defaultBounds, animate = false) {
    var status,
        x;

    status = _app.Features.getLoadingStatus();
    x = 0;

    if (AppUtil.getParam('sidebar')) {
      x = -_app.sideBarWidth;
    }

    if (bounds.isValid()) {
      _map.fitBounds(bounds, {
        animate: animate,
        paddingTopLeft: L.point(x, _app.headerHeight) // accommodate sidebar, header
      });

      if (status === 'complete' && _app.NavBar.getPaneId() === 'mapPane') {
        _initialView = false;
      }
    }
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add a Feature layer and set the map extent depending on the status.
   *
   * @param feature {Object}
   */
  _this.addFeature = function (feature) {
    var marker,
        status;

    status = _app.Features.getLoadingStatus();

    if (feature.mapLayer) {
      _this.addLayer(feature);

      // Set initial map extent centered on Mainshock
      if (feature.id === 'mainshock') {
        marker = feature.mapLayer.getLayers()[0];
        _bounds = _getBounds(marker.getLatLng());

        _setView(_bounds);
      }

      // Set map bounds to contain the Feature, if applicable
      if (feature.zoomToLayer && _initialView) {
        _bounds.extend(feature.mapLayer.getBounds());
      }
    }

    // Set final map extent once all Features are loaded
    if (status === 'complete') {
      _setView(_bounds, true);
    }
  };

  /**
   * Add a layer to the map and layer control and remove the placeholder layer
   * and 'loader'. When adding the SearchLayer, set the map extent if no
   * Mainshock is selected and store the layer in _staticLayers.
   *
   * @param item {Object}
   *     Feature or catalog search results
   */
  _this.addLayer = function (item) {
    var name,
        placeholder;

    name = item.name;
    placeholder = _placeholders[item.id]; // name and 'loader' in layer control

    item.mapLayer.id = item.id; // need access to Item's id from Leaflet layer

    if (Object.prototype.hasOwnProperty.call(item, 'count')) {
      name += '<span class="count">' + item.count + '</span>';
    }

    if (item.id === 'search') {
      _staticLayers.search = {};
      _staticLayers.search[name] = item.mapLayer;

      if (document.body.classList.contains('no-mainshock')) {
        _setView();
      }
    }

    if (placeholder) {
      _layerControl.removeLayer(placeholder);

      delete _placeholders[item.id];
    } else { // custom pane not created yet
      _createPane(item.id, 'overlayPane');
    }

    _layerControl.addOverlay(item.mapLayer, name);

    if (item.showLayer) {
      _map.addLayer(item.mapLayer);
    }
  };

  /**
   * Add an Item's name and 'loader' to the layer control.
   *
   * @param item {Object}
   *     Feature or catalog search results
   */
  _this.addLoader = function (item) {
    var layer,
        name;

    if (Object.prototype.hasOwnProperty.call(item, 'mapLayer')) {
      layer = L.featureGroup(); // empty placeholder layer
      name = item.name + '<span class="breather"><span></span></span>';

      layer.id = item.id; // need access to Item's id from Leaflet layer
      _placeholders[item.id] = layer; // cache placeholder layer

      _createPane(item.id, 'overlayPane');
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

    location.href = '#mapPane';

    // Turn on Feature layer so its popup can be displayed
    if (!_map.hasLayer(layer)) {
      _map.addLayer(layer);
    }

    marker.openPopup();
  };

  /**
   * Remove a layer from the map.
   *
   * @param item {Object}
   *     Feature or catalog search results
   */
  _this.removeFeature = function (item) {
    var placeholder,
        showLayer;

    placeholder = _placeholders[item.id]; // loading status in layer control
    showLayer = item.showLayer; // cache value

    if (item.mapLayer) {
      _map.removeLayer(item.mapLayer); // sets showLayer prop to false
      _layerControl.removeLayer(item.mapLayer);

      item.showLayer = showLayer; // set back to cached value
    }

    if (placeholder) {
      _layerControl.removeLayer(placeholder);
      delete _placeholders[item.id];
    }
  };

  /**
   * Render the map correctly when the MapPane is activated.
   */
  _this.render = function () {
    var bounds,
        status;

    bounds = _defaultBounds;
    status = _app.Features.getLoadingStatus();

    _map.invalidateSize(); // updates map if its container size was changed
    _map.fire('visible'); // displays popups added when map was hidden

    // Set initial view (uses L.fitBounds, which only works when map is visible)
    if (_initialView) {
      _initialView = false;

      if (status === 'complete') {
        bounds = _bounds;
      }

      _setView(bounds);
    }
  };

  /**
   * Reset to default state.
   */
  _this.reset = function () {
    var canvasEls = document.querySelectorAll('#mapPane > canvas');

    _bounds = L.latLngBounds();
    _initialView = true;
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

    _setView();
  };

  /**
   * Shift the map to accommodate the SideBar opening/closing.
   */
  _this.shiftMap = function () {
    var x = _app.sideBarWidth / 2;

    if (!document.body.classList.contains('sidebar')) {
      x = x * -1;
    }

    _map.panBy([x, 0]);
  };

  /**
   * Turn on the search layer.
   */
  _this.showSearchLayer = function () {
    var layerName = Object.keys(_staticLayers.search)[0];

    _map.addLayer(_staticLayers.search[layerName]);
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = MapPane;
