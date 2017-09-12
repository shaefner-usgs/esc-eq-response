/* global L */
'use strict';


var Util = require('hazdev-webutils/src/util/Util');


var _COLORS,
    _DEFAULTS,
    _MARKER_DEFAULTS;

_COLORS = {

};
_MARKER_DEFAULTS = {
  color: '#000',
  fillOpacity: 0.85,
  opacity: 0.6,
  weight: 1
};
_DEFAULTS = {
  json: {},
  markerOptions: _MARKER_DEFAULTS
};


/**
 * Creates ShakeMap stations feature
 *
 * @param options {Object}
 *   {
 *     json: {Object}, // geojson data for feature
 *     mainshockJson: {Object}, // mainshock geojson: magnitude, time, etc.
 *     name: {String} // layer name
 *   }
 */
var Stations = function (options) {
  var _this,
      _initialize,

      _id,
      _mapLayer,
      _markerOptions,

      _onEachFeature,
      _pointToLayer;


  _this = {};

  _initialize = function () {
    // Unique id; note that value is "baked into" app's js/css
    _id = 'stations';

    options = options || {};

    _markerOptions = Util.extend({}, _MARKER_DEFAULTS, options.markerOptions);

    _this.id = _id;
    _this.name = options.name;

    _mapLayer = L.geoJson(options.json, {
      onEachFeature: _onEachFeature,
      pointToLayer: _pointToLayer
    });
    _mapLayer.id = _id; // Attach id to L.Layer
  };

  _onEachFeature = function () {

  };

  _pointToLayer = function (feature, latlng) {
    var props;

    props = feature.properties;

    _markerOptions.pane = _id;

    return L.marker(latlng, _markerOptions);
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  _this.getMapLayer = function () {
    return _mapLayer;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Stations;
