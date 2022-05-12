/* global L */
'use strict';


/**
 * Factory for Dark base layer.
 *
 * @param provider {String} optional; default is 'cartodb'
 * @param options {Object}
 *     L.tileLayer options
 *
 * @return {Object <L.layerGroup|L.tileLayer>}
 */
L.DarkLayer = function (provider, options) {
  var base,
      labels,
      providers,
      url;

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
  };
  provider = provider || 'cartodb';
  options = Object.assign({}, providers[provider], options);
  url = providers[provider].url;
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
