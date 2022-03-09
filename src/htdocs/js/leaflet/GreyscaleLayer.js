/* global L */
'use strict';


/**
 * Factory for Greyscale base layer.
 *
 * @param provider {String} optional; default is 'cartodb'
 * @param options {Object}
 *     L.tileLayer options
 *
 * @return {L.tileLayer|L.layerGroup}
 */
L.GreyscaleLayer = function (provider, options) {
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
      url: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}@2x.png'
    },
    esri: {
      attribution: 'Tiles &copy; Esri — Esri, DeLorme, NAVTEQ',
      maxZoom: 16,
      subdomains: [
        'server',
        'services'
      ],
      url: 'https://{s}.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
    },
    stamen: {
      attribution: 'Map tiles by <a href="https://stamen.com">Stamen Design</a>, ' +
        '<a href="https://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> ' +
        '— Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 20,
      subdomains: 'abcd',
      url: 'https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.png'
    }
  };
  provider = provider || 'cartodb';
  options = Object.assign({}, providers[provider], options);
  url = providers[provider].url;
  base = L.tileLayer(url, options);

  // ESRI Greyscale layer doesn't include labels; add them
  if (provider === 'esri') {
    labels = L.tileLayer(
      'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}'
    );

    return L.layerGroup([
      base,
      labels
    ]);
  } else {
    return base;
  }
};


L.greyscaleLayer = function () {
  return new L.GreyscaleLayer();
};
