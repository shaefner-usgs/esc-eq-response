/* global L */
'use strict';


var Util = require('hazdev-webutils/src/util/Util');


/**
 * Factory for Dark base layer
 *
 * @param provider {String}
 *     default is 'cartodb'
 * @param options {Object}
 *     L.TileLayer options
 *
 * @return {L.TileLayer}
 */
L.DarkLayer = function (provider, options) {
  var _base,
      _providers,
      _ref,
      _url;

  _providers = {
    cartodb: {
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">' +
        'OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">' +
        'CartoDB</a>',
      maxZoom: 19,
      subdomains: 'abcd',
      url: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}@2x.png'
    },
    esri: {
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
      maxZoom: 16,
      subdomains: ['server', 'services'],
      url: 'https://{s}.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
    }
  };

  provider = provider || 'cartodb';
  options = Util.extend(_providers[provider], options);

  _url = _providers[provider].url;
  _base = L.tileLayer(_url, options);

  // Esri dark layer doesn't inlcude labels; add them
  if (provider === 'esri') {
    _ref = L.tileLayer(
      'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}'
    );
    return L.layerGroup([_base, _ref]);
  } else {
    return _base;
  }
};


L.darkLayer = function () {
  return new L.DarkLayer();
};

module.exports = L.DarkLayer;
