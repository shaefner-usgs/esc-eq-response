/* global L */
'use strict';


var Util = require('util/Util');


/**
 * Factory for ESRI Terrain base layer
 *
 * @param options {Object}
 *     L.TileLayer options
 *
 * @return {L.TileLayer}
 */
var TerrainLayer = function (options) {
  options = Util.extend({
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, ' +
      'Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance ' +
      'Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community',
    subdomains: ['server', 'services']
  }, options);

  return L.tileLayer(
    'https://{s}.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    options
  );
};


L.terrainLayer = TerrainLayer;

module.exports = TerrainLayer;
