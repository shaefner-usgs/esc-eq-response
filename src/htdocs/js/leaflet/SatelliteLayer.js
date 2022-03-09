/* global L */
'use strict';


/**
 * Factory for Satellite base layer.
 *
 * @param provider {String} optional; default is 'esri'
 * @param options {Object}
 *     L.tileLayer options
 *
 * @return {L.tileLayer|L.layerGroup}
 */
L.SatelliteLayer = function (provider, options) {
  var base,
      places,
      placesUrl,
      providers,
      transportation,
      transportationUrl,
      url;

  providers = {
    esri: {
      attribution: 'Tiles &copy; Esri — Source: Esri, i-cubed, USDA, ' +
        'USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the ' +
        'GIS User Community',
      subdomains: [
        'server',
        'services'
      ],
      url: 'https://{s}.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    },
    mapquest: {
      attribution: 'Tiles Courtesy of <a href="https://www.mapquest.com/">MapQuest</a> ' +
        '— Portions Courtesy NASA/JPL-Caltech and U.S. Depart. of ' +
        'Agriculture, Farm Service Agency',
      subdomains: '1234',
      url: 'https://otile{s}.mqcdn.com/tiles/1.0.0/sat/{z}/{x}/{y}.jpg'
    }
  };
  provider = provider || 'esri';
  options = Object.assign({}, providers[provider], options);
  url = providers[provider].url;
  base = L.tileLayer(url, options);

  // ESRI satellite layer doesn't include labels; add them
  if (provider === 'esri') {
    placesUrl = 'https://{s}.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
    places = L.tileLayer(placesUrl, options);
    transportationUrl = 'https://{s}.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}';
    transportation = L.tileLayer(transportationUrl, options);

    return L.layerGroup([
      base,
      places,
      transportation
    ]);
  } else {
    return base;
  }
};


L.satelliteLayer = function () {
  return new L.SatelliteLayer();
};
