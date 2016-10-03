/* global L */
'use strict';


//var Xhr = require('util/Xhr');

// Leaflet plugins
require('map/MousePosition');
require('map/RestoreMap');

// Factories for creating map layers (returns e.g. "L.earthquakesLayer()")
require('map/DarkLayer');
require('map/FaultsLayer');
require('map/GreyscaleLayer');
require('map/SatelliteLayer');
require('map/TerrainLayer');


/**
 * Factory for leaflet map instance
 *
 * @param options {Object}
 */
var Map = function (options) {
  var _this,
      _initialize,

      _el,

      _getMapLayers,
      _initMap;


  _this = {};

  _initialize = function (options) {
    options = options || {};
    _el = options.el || document.createElement('div');

    // Load netwoks layer which calls _initMap() when finished
    //_loadNetworksLayer();
    _initMap();
  };


  /**
   * Get all map layers that will be displayed on map
   *
   * @return layers {Object}
   *    {
   *      baseLayers: {Object}
   *      overlays: {Object}
   *      defaults: {Array}
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
    layers.overlays = {
      'Faults': faults
    };
    layers.defaults = [terrain];

    return layers;
  };

  /**
   * Load networks layer from geojson data via ajax
   */
  // _loadNetworksLayer = function () {
  //   Xhr.ajax({
  //     url: MOUNT_PATH + '/_getNetworks.json.php',
  //     success: function (data) {
  //       _networks = L.networksLayer({
  //         data: data
  //       });
  //       _initMap();
  //     },
  //     error: function (status) {
  //       console.log(status);
  //     }
  //   });
  // };

  /**
   * Create Leaflet map instance
   */
  _initMap = function () {
    var //bounds,
        layers,
        map;

    layers = _getMapLayers();

    // Create map
    map = L.map(_el, {
      center: [38, -123],
      layers: layers.defaults,
      scrollWheelZoom: false,
      zoom: 7
    });

    // Set intial map extent to contain networks overlay
    //map.fitBounds(bounds);

    // Add controllers
    L.control.layers(layers.baseLayers, layers.overlays).addTo(map);
    L.control.mousePosition().addTo(map);
    L.control.scale().addTo(map);

    // Remember user's map settings (selected layers, map extent)
    map.restoreMap({
      baseLayers: layers.baseLayers,
      id: 'eqid', // TODO: insert actual eqid
      overlays: layers.overlays,
      scope: 'response'
    });
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Map;
