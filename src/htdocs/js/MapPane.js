/* global L */
'use strict';


// Leaflet plugins
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
 * Sets up leaflet map instance and adds 'static' layers (non-event-specific)
 *   (dynamic layer classes are in js/features)
 *
 * @param options {Object}
 *   {
 *     el: {Element}
 *   }
 */
var MapPane = function (options) {
  var _this,
      _initialize,

      _el,
      _map,

      _compareLayers,
      _getMapLayers,
      _getZindex,
      _hideZoomControl,
      _initMap,
      _isBaseLayer;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _el = options.el || document.createElement('div');
    _map = _el.querySelector('.map');

    _initMap();
  };

  /**
   * Comparison function for sorting feature overlays in layer controller
   *
   * @return {Integer}
   */
  _compareLayers = function (layerA, layerB, nameA, nameB) {
    var zIndexLayerA,
        zIndexLayerB;

    // Don't sort baselayers
    if (_isBaseLayer(nameA) || _isBaseLayer(nameB)) {
      return;
    }

    // Put faults layer on bottom
    if (nameA === 'Faults') {
      return 1;
    }
    if (nameB === 'Faults') {
      return -1;
    }

    zIndexLayerA = _getZindex(layerA);
    zIndexLayerB = _getZindex(layerB);
    if (zIndexLayerA < zIndexLayerB) {
      return -1;
    }
    if (zIndexLayerA > zIndexLayerB) {
      return 1;
    }
    return 0;
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
  _getMapLayers = function () {
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
      'Terrain': terrain,
      'Satellite': satellite,
      'Greyscale': greyscale,
      'Dark': dark
    };
    layers.defaults = [terrain, faults];
    layers.overlays = {
      'Faults': faults
    };

    return layers;
  };

  /**
   * Get z-index of Leaflet layer
   *
   * @param layer {L.Layer}
   *
   * @return {Integer}
   */
  _getZindex = function (layer) {
    var cssClass,
        pane,
        styles;

    cssClass = 'leaflet-' + layer.id + '-pane';
    pane = document.querySelector('.' + cssClass);
    styles = window.getComputedStyle(pane);

    return styles.getPropertyValue('zIndex');
  };

  /**
   * Hide zoom controller on mobile (in favor of pinch-to-zoom)
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
    _this.layers = _getMapLayers();

    // Create map and set initial view
    _this.map = L.map(_map, {
      layers: _this.layers.defaults
    });
    _this.setDefaultView();

    // Add / remove controllers
    _this.layerController = L.control.layers(
      _this.layers.baseLayers,
      _this.layers.overlays,
      {
        sortFunction: _compareLayers,
        sortLayers: true
      }
    ).addTo(_this.map);
    L.control.mousePosition().addTo(_this.map);
    L.control.scale().addTo(_this.map);
    _hideZoomControl();

    // Remember user's map settings (selected layers, map extent)
    // _this.map.restoreMap({
    //   baseLayers: _this.layers.baseLayers,
    //   id: 'eqid', // TODO: insert actual eqid
    //   overlays: _this.layers.overlays,
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
  _isBaseLayer = function (name) {
    var r = false;

    Object.keys(_this.layers.baseLayers).forEach(function(key) {
      if (key === name) {
        r = true;
      }
    });

    return r;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Set default map extent
   */
  _this.setDefaultView = function () {
    _this.map.setView([40, -96], 4);
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = MapPane;
