/* global L */
'use strict';


// Leaflet plugins and layer factories
require('leaflet-mouse-position');
require('util/leaflet/L.Control.Layers.Sorted');
require('util/leaflet/L.Control.Zoom');
// require('util/leaflet/L.DarkLayer');
require('util/leaflet/L.FaultsLayer');
require('util/leaflet/L.GeoJSON.Async');
// require('util/leaflet/L.GreyscaleLayer');
require('util/leaflet/L.Map');
require('util/leaflet/L.Map.BoxZoom');
require('util/leaflet/L.Marker.Canvas');
require('util/leaflet/L.Popup');
require('util/leaflet/L.SatelliteLayer');
// require('util/leaflet/L.TerrainLayer');
require('util/leaflet/L.TerrainLayer-alt');
require('util/leaflet/L.Tooltip');

var AppUtil = require('util/AppUtil');


/**
 * Create the "main" Leaflet map instance and add the initial (base) map layers.
 * Add/remove Feature layers and set the map extent based on the current state.
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
 *       fitBounds: {Function}
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
      _layers,
      _placeholders,
      _rendered,

      _addControls,
      _addListeners,
      _createPane,
      _getBounds,
      _getClassName,
      _getLayers,
      _initMap,
      _setBounds,
      _setFlag,
      _trackExtent;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;
    _el = options.el;
    _initialExtent = true;
    _layers = _getLayers();
    _placeholders = {};
    _rendered = false;

    _initMap();
    _addListeners();
  };

  /**
   * Add the map controls: layers, mouse position and scale. Zoom and
   * attribution controls are added by default.
   */
  _addControls = function () {
    L.control.attribution({ prefix: '' }).addTo(_this.map);
    L.control.mousePosition().addTo(_this.map);
    L.control.scale().addTo(_this.map);

    _this.layerControl = L.control.layers.sorted(
      _layers.baseLayers,
      _layers.overlays
    ).addTo(_this.map);
  };

  /**
   * Add event listeners.
   */
  _addListeners = function () {
    // Track the selected base layer
    _this.map.on('baselayerchange', e => {
      var baseLayers = Object.keys(_layers.baseLayers),
          names = baseLayers.map(name => _getClassName(name)),
          selected = _getClassName(e.name);

      document.body.classList.remove(...names);
      document.body.classList.add(selected);
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
   * @return {L.LatLngBounds}
   */
  _getBounds = function (mainshock) {
    var marker = mainshock.mapLayer.getLayers()[0],
        maxDistance = Math.max(
          Number(document.getElementById('as-distance').value),
          Number(document.getElementById('fs-distance').value),
          Number(document.getElementById('hs-distance').value)
        ),
        distance = maxDistance * 2 * 1000; // radius (km) -> diameter (meters)

    return marker.getLatLng().toBounds(distance);
  };

  /**
   * Get the CSS class name from the given layer name.
   *
   * @param name {String}
   *
   * @return {String}
   */
  _getClassName = function (name) {
    return name.replaceAll(' ', '-').toLowerCase();
  };

  /**
   * Get the initial (static) map layers.
   *
   * @return layers {Object}
   */
  _getLayers = function () {
    var layers,
        faults = L.faultsLayer(),
        terrain =  L.terrainLayer();

    layers = {
      baseLayers: {
        // 'Light': L.greyscaleLayer(),
        // 'Dark': L.darkLayer(),
        'Satellite': L.satelliteLayer(),
        'Terrain': terrain
      },
      defaults: [
        faults,
        terrain
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

    _this.map = L.map('map', {
      attributionControl: false,
      layers: _layers.defaults,
      minZoom: 1
    });

    _this.map.setView([0, 0], 3); // set arbitrary view so map fully initializes
    _this.initBounds();
    _addControls();

    // Hide the zoom control on mobile (in favor of pinch-to-zoom)
    if (L.Browser.mobile) {
      zoomControl = _el.querySelector('.leaflet-control-zoom');

      zoomControl.style.display = 'none';
    }
  };

  /**
   * Extend _bounds to contain the given Feature. If it's the Mainshock,
   * initialize _bounds centered on it.
   *
   * @param feature {Object}
   */
  _setBounds = function (feature) {
    if (feature.id.includes('mainshock')) {
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
   * Add event listeners that set a flag when the map extent is changed.
   *
   * Used to determine if the user has interacted with the map yet.
   */
  _trackExtent = function () {
    _this.map.off('movestart zoomstart', _setFlag); // avoid duplicate listeners
    _this.map.once('movestart zoomstart', _setFlag);
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add the given Feature to the map (if applicable) and layer control and
   * remove its temporary placeholder.
   *
   * @param feature {Object}
   */
  _this.addContent = function (feature) {
    var key = feature.type || feature.id,
        layer = sessionStorage.getItem(key + '-layer'),
        placeholder = _placeholders[feature.id],
        popup = sessionStorage.getItem(key + '-popup'),
        showLayer = feature.showLayer; // default

    if (feature.mapLayer) {
      _this.layerControl.removeLayer(placeholder);
      _this.layerControl.addOverlay(feature);

      if (layer) {
        showLayer = (layer === 'true'); // override w/ value from Storage
      }
      if (popup) {
        _this.openPopup(feature, popup); // re-open a pre-existing popup
      }
      if (showLayer) {
        _this.map.addLayer(feature.mapLayer);
      }

      if (!feature.isSwapping) { // not swapping catalogs
        _this.setView(feature);
      }
    }
  };

  /**
   * Add the given Feature's placeholder to the layer control and store it. Also
   * create the layer's custom Leaflet map pane that controls stacking order.
   *
   * @param feature {Object}
   */
  _this.addFeature = function (feature) {
    if (feature.mapLayer) {
      _placeholders[feature.id] = feature.mapLayer;

      _createPane(feature.id);
      _this.layerControl.addOverlay(feature);
    }
  };

  /**
   * Set the map view to contain the given bounds.
   *
   * @param bounds {L.LatLngBounds} optional; default is _bounds
   */
  _this.fitBounds = function (bounds = _bounds) {
    var animate = false,
        initialExtent = _initialExtent, // cache value
        status = _app.Features.getStatus(),
        x = 0;

    if (AppUtil.getParam('sidebar')) {
      x = _app.sideBarWidth;
    }

    if (status === 'ready') {
      animate = true;

      if (_app.Pane.getSelected() === 'map') {
        _rendered = true;
      }
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
   * Initialize the map's bounds for the given display mode:
   *
   *   1. 'base': centered on the current Catalog Search
   *   2. 'event': centered on the selected Mainshock
   *
   * @param mode {String <base|event>} optional; default is 'base'
   */
  _this.initBounds = function (mode = 'base') {
    var mainshock;

    _bounds = L.latLngBounds( // default - contiguous U.S.
      [8, -143],
      [60, -48]
    );

    if (mode === 'event') {
      mainshock = _app.Features.getMainshock();
      _bounds = mainshock.data.eq.latLng.toBounds(5000); // 2.5km radius
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
   * Open the given Feature's popup if the layer contains a marker matching the
   * given eqid.
   *
   * @param feature {Object}
   * @param eqid {String} optional; default is ''
   *     Required if feature.popup is not set to the Popup's eqid value
   */
  _this.openPopup = function (feature, eqid = '') {
    var marker,
        mapLayer = feature.mapLayer;

    eqid = eqid || feature.popup;

    // Find the marker
    mapLayer.eachLayer(eq => {
      if (eq.feature.id === eqid) {
        marker = eq;
      }
    });

    if (marker) {
      if (!_this.map.hasLayer(mapLayer)) {
        _this.map.addLayer(mapLayer); // ensure Feature layer is "on"
      }

      marker.openPopup();
    }
  };

  /**
   * Remove the given Feature from the map and layer control.
   *
   * Also remove the placeholder layer if it exists (i.e. on a failed fetch
   * request).
   *
   * @param feature {Object}
   */
  _this.removeFeature = function (feature) {
    var placeholder = _placeholders[feature.id];

    if (feature.mapLayer) {
      _this.layerControl.removeLayer(feature.mapLayer);
      _this.map.removeLayer(feature.mapLayer);
    }

    if (placeholder) {
      _this.layerControl.removeLayer(placeholder);
    }
  };

  /**
   * Render the map.
   */
  _this.render = function () {
    _this.map.invalidateSize(); // updates map if its container size has changed

    // Update popup (useful when refreshing a layer with a popup open)
    if (_this.map._popup) {
      _this.map._popup.update();
    }

    // Set initial view
    if (!_rendered) {
      _rendered = true;

      _this.fitBounds();
    }
  };

  /**
   * Reset to default state.
   */
  _this.reset = function () {
    _el.querySelector('.container').innerHTML = '';

    _initialExtent = true;
    _placeholders = {};
    _rendered = false;

    _this.initBounds();
    _this.fitBounds();
    _this.layerControl.reset();
  };

  /**
   * Set the map's bounds and view as Features load.
   *
   * @param feature {Object} optional; default is {}
   */
  _this.setView = function (feature = {}) {
    var status = _app.Features.getStatus();

    if (feature.id?.includes('mainshock')) {
      _this.fitBounds(_getBounds(feature));
    }

    if (feature.zoomToLayer && feature.mode !== 'base') {
      _setBounds(feature);
    }

    if (status === 'ready' && _initialExtent) { // Mainshock Features are ready
      _this.fitBounds();

      // Set up tracking after fitBounds() animation ends
      _this.map.once('moveend zoomend', () => {
        _initialExtent = true;

        _trackExtent();
      });
    }
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
