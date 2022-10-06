/* global L */
'use strict';


/**
 * Factory for the Dark base layer.
 *
 * @param provider {String} default is 'cartodb'
 * @param options {Object}
 *     L.TileLayer options
 *
 * @return {<L.LayerGroup|L.TileLayer>}
 */
L.DarkLayer = function (provider = 'cartodb', options) {
  var base, labels,
      providers = {
        cartodb: {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">' +
            'OpenStreetMap</a> &copy; <a href="https://cartodb.com/attributions">' +
            'CartoDB</a>',
          maxZoom: 19,
          subdomains: 'abcd',
          url: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}@2x.png'
        },
        esri: {
          attribution: 'Tiles &copy; Esri — Esri, DeLorme, NAVTEQ',
          maxZoom: 16,
          subdomains: [
            'server',
            'services'
          ],
          url: 'https://{s}.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
        }
      },
      url = providers[provider].url;

  options = Object.assign({}, providers[provider], options);
  base = L.tileLayer(url, options);

  // ESRI Dark layer doesn't include labels; add them
  if (provider === 'esri') {
    labels = L.tileLayer(
      'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}'
    );

    return L.layerGroup([
      base,
      labels
    ]);
  } else {
    return base;
  }
};


L.darkLayer = function () {
  return new L.DarkLayer();
};
