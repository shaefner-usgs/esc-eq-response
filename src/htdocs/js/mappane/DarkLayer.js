/* global L */
'use strict';


var Util = require('util/Util');


/**
 * Factory for Dark base layer
 *
 * @param options {Object}
 *     L.TileLayer options
 *
 * @return {L.TileLayer}
 */
var DarkLayer = function (options) {
  options = Util.extend({
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">' +
      'OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">' +
      'CartoDB</a>',
    maxZoom: 19,
    subdomains: 'abcd'
  }, options);

  return L.tileLayer(
    'http://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    options
  );
};


L.darkLayer = DarkLayer;

module.exports = DarkLayer;
