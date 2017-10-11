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
      _layers,

      _compareLayers,
      _getSortValue,
      _getStaticMapLayers,
      _hideZoomControl,
      _initMap,
      _isBaseLayer;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _el = options.el || document.createElement('div');
    _layers = _getStaticMapLayers();

    _initMap();
  };

  /**
   * Comparison function for sorting overlays in layer controller
   *
   * @return {Integer}
   */
  _compareLayers = function (layerA, layerB, nameA, nameB) {
    var sortValue = [];

    sortValue[0] = _getSortValue(layerA, nameA);
    sortValue[1] = _getSortValue(layerB, nameB);
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
   *
   * @return sortValue {Integer}
   *   z-index value or 1 if no z-index
   */
  _getSortValue = function (layer, name) {
    var className,
        leafletPane,
        sortValue,
        styles;

    if (_isBaseLayer(name)) {
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
  _getStaticMapLayers = function () {
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
    // Create map and set initial view
    _this.map = L.map(_el.querySelector('.map'));
    _this.setDefaultView();

    // Create custom pane for Faults overlay
    _this.map.createPane('faults', _this.map.getPane('tilePane'));

    // Add default layers to map
    _layers.defaults.forEach(function(layer) {
      _this.map.addLayer(layer);
    });

    // Add / remove controllers
    _this.layerController = L.control.layers(
      _layers.baseLayers, _layers.overlays, {
        sortFunction: _compareLayers,
        sortLayers: true
      }
    ).addTo(_this.map);
    L.control.mousePosition().addTo(_this.map);
    L.control.scale().addTo(_this.map);
    _hideZoomControl();

    // Remember user's map settings (selected layers, map extent)
    // _this.map.restoreMap({
    //   baseLayers: _layers.baseLayers,
    //   id: 'eqid', // TODO: insert actual eqid
    //   overlays: _layers.overlays,
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

    Object.keys(_layers.baseLayers).forEach(function(key) {
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
