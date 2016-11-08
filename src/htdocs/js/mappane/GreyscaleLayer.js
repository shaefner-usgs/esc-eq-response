/* global L */
'use strict';


var Util = require('util/Util');


/**
 * Factory for Greyscale base layer
 *
 * @param provider {String} default is 'cartodb'
 * @param options {Object}
 *      L.TileLayer options
 *
 * @return {L.TileLayer}
 */
var GreyscaleLayer = function (provider, options) {
  var _base,
      _providers,
      _ref,
      _url;

  _providers = {
    cartodb: {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">' +
        'OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">' +
        'CartoDB</a>',
      maxZoom: 19,
      subdomains: 'abcd',
      url: 'http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'
    },
    esri: {
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
      maxZoom: 16,
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
    },
    stamen: {
      attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, ' +
        '<a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> ' +
        '&mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 20,
      subdomains: 'abcd',
      url: 'https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.png'
    }
  };

  provider = provider || 'cartodb';
  options = Util.extend(_providers[provider], options);

  _url = _providers[provider].url;
  _base = L.tileLayer(_url, options);

  // Esri greyscale layer doesn't inlcude labels; add them
  if (provider === 'esri') {
    _ref = L.tileLayer(
      'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}'
    );
    return L.layerGroup([_base, _ref]);
  } else {
    return _base;
  }
};


L.greyscaleLayer = GreyscaleLayer;

module.exports = GreyscaleLayer;
