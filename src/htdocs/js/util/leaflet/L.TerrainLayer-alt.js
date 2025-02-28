/* global L */
'use strict';


/**
 * Factory for the Terrain base layer.
 *
 * @param options {Object}
 *     L.TileLayer options
 *
 * @return {L.TileLayer}
 */
L.TerrainLayer = function (options) {
  options = Object.assign({
    attribution: 'Tiles from USGS National Map'
  }, options);

  return L.tileLayer(
    'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}',
    options
  );
};


L.terrainLayer = function () {
  return new L.TerrainLayer();
};
