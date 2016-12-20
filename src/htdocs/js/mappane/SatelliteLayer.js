/* global L */
'use strict';


var Util = require('hazdev-webutils/src/util/Util');


/**
 * Factory for Satellite base layer
 *
 * @param provider {String}
 *     default is 'esri'
 * @param options {Object}
 *     L.TileLayer options
 *
 * @return {L.TileLayer}
 */
var SatelliteLayer = function (provider, options) {
  var _base,
      _places,
      _placesUrl,
      _providers,
      _transportation,
      _transportationUrl,
      _url;

  _providers = {
    esri: {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, ' +
        'USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the ' +
        'GIS User Community',
      subdomains: ['server', 'services'],
      url: 'https://{s}.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    },
    mapquest: {
      attribution: 'Tiles Courtesy of <a href="http://www.mapquest.com/">MapQuest</a> ' +
        '&mdash; Portions Courtesy NASA/JPL-Caltech and U.S. Depart. of ' +
        'Agriculture, Farm Service Agency',
      subdomains: '1234',
      url: 'http://otile{s}.mqcdn.com/tiles/1.0.0/sat/{z}/{x}/{y}.jpg'
    }
  };

  provider = provider || 'esri';
  options = Util.extend(_providers[provider], options);

  _url = _providers[provider].url;
  _base = L.tileLayer(_url, options);

  // Esri satellite layer doesn't inlcude labels; add them
  if (provider === 'esri') {
    _placesUrl = 'https://{s}.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
    _places = L.tileLayer(_placesUrl, options);
    _transportationUrl = 'https://{s}.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}';
    _transportation = L.tileLayer(_transportationUrl, options);
    return L.layerGroup([_base, _places]);
  } else {
    return _base;
  }
};


L.satelliteLayer = SatelliteLayer;

module.exports = SatelliteLayer;
