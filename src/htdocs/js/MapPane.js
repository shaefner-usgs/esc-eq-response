/* global L */
'use strict';


// Leaflet plugins
require('mappane/MousePosition');
require('mappane/RestoreMap');

// Factories for creating map layers (returns e.g. "L.earthquakesLayer()")
require('mappane/DarkLayer');
require('mappane/FaultsLayer');
require('mappane/GreyscaleLayer');
require('mappane/SatelliteLayer');
require('mappane/TerrainLayer');


/**
 * Sets up leaflet map instance
 *
 * @param options {Object}
 *   {
 *     el: {Element}
 *   }
 */
var Map = function (options) {
  var _this,
      _initialize,

      _el,

      _getMapLayers,
      _hideZoomControl,
      _initMap;


  _this = {};

  _initialize = function (options) {
    options = options || {};
    _el = options.el || document.createElement('div');

    _initMap();
    _hideZoomControl();
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

    // Create map
    _this.map = L.map(_el, {
      center: [38, -118],
      layers: _this.layers.defaults,
      zoom: 7
    });

    // Add controllers
    _this.layerController = L.control.layers(_this.layers.baseLayers,
      _this.layers.overlays).addTo(_this.map);
    L.control.mousePosition().addTo(_this.map);
    L.control.scale().addTo(_this.map);

    // Remember user's map settings (selected layers, map extent)
    // _this.map.restoreMap({
    //   baseLayers: _this.layers.baseLayers,
    //   id: 'eqid', // TODO: insert actual eqid
    //   overlays: _this.layers.overlays,
    //   scope: 'response'
    // });
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Map;
