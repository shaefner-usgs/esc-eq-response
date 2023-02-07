/* global L */
'use strict';


// Leaflet plugins and layer factories
require('leaflet-mouse-position');
require('leaflet/L.Control.Layers.Sorted');
require('leaflet/L.Control.Zoom');
require('leaflet/L.DarkLayer');
require('leaflet/L.FaultsLayer');
require('leaflet/L.GreyscaleLayer');
require('leaflet/L.GeoJSON.Async');
require('leaflet/L.Map');
require('leaflet/L.Map.BoxZoom');
require('leaflet/L.Popup');
require('leaflet/L.SatelliteLayer');
require('leaflet/L.TerrainLayer');
require('leaflet/L.Tooltip');

var AppUtil = require('util/AppUtil');


/**
 * Create the "main" Leaflet map instance, add the initial (static) layers to
 * the map, and add/remove Features (dynamic layers). Set/update the map extent
 * based on the current state.
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *       el: {Element}
 *     }
 *
 * @return _this {Object}
 *     {
 *       addContent: {Function}
 *       addFeature: {Function}
 *       initBounds: {Function}
 *       layerControl: {Object}
 *       map: {Object}
 *       openPopup: {Function}
 *       removeFeature: {Function}
 *       render: {Function}
 *       reset: {Function}
 *       setView: {Function}
 *       shiftMap: {Function}
 *     }
 */
var MapPane = function (options) {
  var _this,
      _initialize,

      _app,
      _bounds,
      _el,
      _initialExtent,
      _rendered,

      _addControls,
      _addListeners,
      _createPane,
      _getBounds,
      _getLayers,
      _initMap,
      _removeLayer,
      _restorePopup,
      _setBounds,
      _setFlag,
      _trackExtent;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;
    _el = options.el;
    _initialExtent = true;
    _rendered = false;

    _initMap();
    _addListeners();
  };

  /**
   * Add the map controls: layers, mouse position and scale. Zoom and
   * attribution controls are added by default.
   *
   * @param layers {Object}
   */
  _addControls = function (layers) {
    L.control.mousePosition().addTo(_this.map);
    L.control.scale().addTo(_this.map);

    _this.layerControl = L.control.layers.sorted(
      layers.baseLayers,
      layers.overlays
    ).addTo(_this.map);
  };

  /**
   * Add event listeners.
   *
   * Note: overlay listeners are triggered when a layer is added/removed,
   * including programmatically.
   */
  _addListeners = function () {
    // Track a Feature's showLayer property when the layer is toggled on/off
    _this.map.on('overlayadd overlayremove', e => {
      var feature = _app.Features.getFeature(e.layer.id),
          showLayer = false; // default

      if (e.type === 'overlayadd') {
        showLayer = true;
      }
      if (Object.prototype.hasOwnProperty.call(feature, 'showLayer')) {
        feature.showLayer = showLayer;
      }
    });
  };

  /**
   * Create a custom Leaflet map pane for the given Feature, which is used to
   * control the stacking order using CSS z-index values.
   *
   * Note: set Leaflet's 'pane' option to the Feature's id value when creating
   * the map layer to render the layer in this custom pane.
   *
   * @param id {String}
   *     Feature id
   */
  _createPane = function (id) {
    if (!_this.map.getPane(id)) {
      _this.map.createPane(id, _this.map.getPane('overlayPane'));
    }
  };

  /**
   * Get the bounds that contain the maximum extent of the Mainshock's
   * Aftershocks, Foreshocks, and Historical Seismicity Features.
   *
   * @param mainshock {Object}
   *
   * @return {L.Bounds}
   */
  _getBounds = function (mainshock) {
    var latLng = mainshock.mapLayer.getLayers()[0].getLatLng(),
        maxDistance = Math.max(
          Number(document.getElementById('as-dist').value),
          Number(document.getElementById('fs-dist').value),
          Number(document.getElementById('hs-dist').value)
        ),
        distance = maxDistance * 2 * 1000; // radius (km) -> diameter (meters)

    return latLng.toBounds(distance);
  };

  /**
   * Get the initial (static) map layers.
   *
   * @return layers {Object}
   *     {
   *       baseLayers: {Object},
   *       defaults: {Array},
   *       overlays: {Object}
   *     }
   */
  _getLayers = function () {
    var layers,
        faults = L.faultsLayer(),
        greyscale = L.greyscaleLayer();

    layers = {
      baseLayers: {
        'Light': greyscale,
        'Dark': L.darkLayer(),
        'Satellite': L.satelliteLayer(),
        'Terrain': L.terrainLayer()
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
    var zoomControl,
        layers = _getLayers();

    _this.map = L.map('map', {
      layers: layers.defaults,
      minZoom: 1
    });

    _this.map.setView([0, 0], 3); // set arbitrary view so map fully initializes
    _this.initBounds();
    _addControls(layers);

    // Hide the zoom control on mobile (in favor of pinch-to-zoom)
    if (L.Browser.mobile) {
      zoomControl = _el.querySelector('.leaflet-control-zoom');

      zoomControl.style.display = 'none';
    }
  };

  /**
   * Remove the given Feature from the map. Also cache its showLayer prop.
   *
   * @param feature {Object}
   */
  _removeLayer = function (feature) {
    var showLayer = feature.showLayer;

    _this.map.removeLayer(feature.mapLayer); // sets showLayer prop to false

    feature.showLayer = showLayer;
  };

  /**
   * Re-open an existing popup when its map layer is refreshed.
   *
   * @param feature {Object}
   */
  _restorePopup = function (feature) {
    var mapLayer = feature.prevFeature.mapLayer;

    mapLayer.eachLayer(layer => {
      if (layer.isPopupOpen()) {
        _this.openPopup(layer.feature.id, feature.id);
      }
    });
  };

  /**
   * Extend _bounds to contain the given Feature. If it's the Mainshock,
   * initialize _bounds centered on it.
   *
   * @param feature {Object}
   */
  _setBounds = function (feature) {
    if (feature.id === 'mainshock') {
      _this.initBounds('event');
    } else {
      _bounds.extend(feature.mapLayer.getBounds());
    }
  };

  /**
   * Event handler that sets _initialExtent to false.
   */
  _setFlag = function () {
    _initialExtent = false;
  };

  /**
   * Add event listeners that set a flag when the map extent is changed. Used to
   * determine if the user has interacted with the map yet.
   *
   * Notes:
   *  1. It is not possible to distinguish btwn user and programmatic events in
   *     Leaflet, so the flag (_initialExtent) is manipulated elsewhere to
   *     mitigate.
   *  2. This method might get called multiple times due to Features being added
   *     asynchronously.
   */
  _trackExtent = function () {
    _this.map.off('movestart zoomstart', _setFlag); // avoid duplicate listeners
    _this.map.once('movestart zoomstart', _setFlag);
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Set the map's bounds (and set the view once all Features are ready). If the
   * Feature is being refreshed, remove the 'old' layer and restore its popup.
   *
   * Note: the Feature's content is added to the existing (empty) map layer by
   * L.GeoJSON.async.
   */
  _this.addContent = function (feature) {
    var status = _app.Features.getStatus();

    if (feature.id === 'mainshock') {
      _this.setView(_getBounds(feature));
    }
    if (feature.zoomToLayer && (
      feature.mode === 'event' ||
      feature.mode === 'comcat' ||
      feature.mode === 'dd'
    )) {
      _setBounds(feature);
    }

    if (status === 'ready' && _initialExtent) { // Mainshock Features are ready
      _this.setView();

      // Set up tracking after fitBounds() animation ends
      _this.map.once('moveend zoomend', () => {
        _initialExtent = true;

        _trackExtent();
      });
    }

    if (feature.isRefreshing) {
      _restorePopup(feature);
      _removeLayer(feature.prevFeature);
    }
  };

  /**
   * Add the given Feature to the map and/or layer control.
   *
   * @param feature {Object}
   */
  _this.addFeature = function (feature) {
    if (feature.mapLayer) {
      feature.mapLayer.id = feature.id; // need access to id from Leaflet layer

      _createPane(feature.id);
      _this.layerControl.addOverlay(feature.mapLayer, feature.name);

      if (feature.showLayer) {
        _this.map.addLayer(feature.mapLayer);
      }
    }
  };

  /**
   * Initialize the map's bounds for the given display mode:
   *
   *   1. 'base': shows the current Catalog Search
   *   2. 'event': centered on the selected Mainshock
   *
   * Note: the temporary bounds used while a new Mainshock is still loading its
   * Features is set separately in _setBounds().
   *
   * @param mode {String <base|event>} default is 'base'
   */
  _this.initBounds = function (mode = 'base') {
    var mainshock;

    _bounds = L.latLngBounds( // default - contiguous U.S.
      [8, -143],
      [60, -48]
    );

    if (mode === 'event') {
      mainshock = _app.Features.getFeature('mainshock');
      _bounds = mainshock.data.latLng.toBounds(5000); // init val: 2.5km radius
    } else if (AppUtil.getParam('region')) {
      _bounds = L.latLngBounds( // custom Catalog Search region
        [
          Number(AppUtil.getParam('minlatitude')),
          Number(AppUtil.getParam('minlongitude'))
        ],
        [
          Number(AppUtil.getParam('maxlatitude')),
          Number(AppUtil.getParam('maxlongitude'))
        ]
      );
    }
  };

  /**
   * Open the map popup matching the given eqid and featureId when the user
   * selects an eq from the Plots/SummaryPanes.
   *
   * @param eqid {String}
   * @param featureId {String}
   */
  _this.openPopup = function (eqid, featureId) {
    var marker,
        layer = _app.Features.getFeature(featureId).mapLayer;

    // Find the marker
    layer.eachLayer(eq => {
      if (eq.feature.id === eqid) {
        marker = eq;
      }
    });

    if (marker) {
      if (!_this.map.hasLayer(layer)) {
        _this.map.addLayer(layer); // ensure Feature layer is "on"
      }

      marker.openPopup();
    }
  };

  /**
   * Remove the given Feature from the map and layer control.
   *
   * @param feature {Object}
   */
  _this.removeFeature = function (feature) {
    if (feature.mapLayer) {
      _this.layerControl.removeLayer(feature.mapLayer);
      _removeLayer(feature);
    }
  };

  /**
   * Render the map correctly when the MapPane is selected.
   */
  _this.render = function () {
    _this.map.invalidateSize(); // updates map if its container size has changed

    // Update popup (useful when swapping catalogs w/ Mainshock's popup open)
    if (_this.map._popup) {
      _this.map._popup.update();
    }

    // Set initial view (map must be visible)
    if (!_rendered) {
      _rendered = true;

      _this.setView();
    }
  };

  /**
   * Reset to default state.
   */
  _this.reset = function () {
    _el.querySelector('.container').innerHTML = '';

    _initialExtent = true;
    _rendered = false;

    _this.initBounds();
    _this.setView();
    _this.layerControl.reset();
  };

  /**
   * Set the map extent to contain the given bounds.
   *
   * @param bounds {L.Bounds} default is _bounds
   */
  _this.setView = function (bounds = _bounds) {
    var animate = false,
        initialExtent = _initialExtent, // cache
        status = _app.Features.getStatus(),
        x = 0;

    if (status === 'ready') {
      animate = true;

      if (_app.Pane.getSelPane() === 'mapPane') {
        _rendered = true;
      }
    }

    if (AppUtil.getParam('sidebar')) {
      x = _app.sideBarWidth;
    }

    if (bounds.isValid()) {
      _this.map.fitBounds(_this.map.wrapLatLngBounds(bounds), {
        animate: animate,
        paddingBottomRight: L.point(x, 0), // accommodate sidebar
        paddingTopLeft: L.point(0, _app.headerHeight) // accommodate header
      });
    }

    _initialExtent = initialExtent; // set back to cached value
  };

  /**
   * Shift the map to accommodate the SideBar opening/closing.
   */
  _this.shiftMap = function () {
    var x = _app.sideBarWidth / 2;

    if (!AppUtil.getParam('sidebar')) {
      x *= -1;
    }

    _this.map.panBy([x, 0]);
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = MapPane;
