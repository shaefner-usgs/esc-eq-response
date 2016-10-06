'use strict';


var Earthquake = require('Earthquake'),
    EarthquakesLayer = require('features/EarthquakesLayer'),
    EditPane = require('EditPane'),
    MapPane = require('MapPane'),
    Navigation = require('Navigation');


var Application = function (options) {
  var _this,
      _initialize,

      _earthquake,
      _editPane,
      _eqid,
      _els,
      _features,
      _mapPane,
      _navigation,

      _addEarthquake,
      _addLayer,
      _createEarthquake,
      _removeLayers;


  _this = {};

  _initialize = function (options) {
    _els = {
      map: options.map,
      summary: options.summary
    };
    _eqid = document.getElementById('eqid');
    _features = {};

    _editPane = EditPane();
    _mapPane = MapPane({
      el: _els.map
    });
    _navigation = Navigation({
      mapPane: _mapPane
    });

    if (_eqid.value) {
      _createEarthquake();
    }
    _eqid.addEventListener('change', _createEarthquake);
  };

  /**
   * Add earthquake (mainshock) to map
   *
   * @param geojson {Object}
   *     Geojson layer returned by Earthquake class
   */
  _addEarthquake = function (geojson) {
    var coords,
        mainshock;

    _earthquake = geojson;
    coords = _earthquake.features[0].geometry.coordinates;
    mainshock = EarthquakesLayer({
      data: _earthquake
    });

    _removeLayers();
    _addLayer(mainshock, 'Mainshock');
    _editPane.setDefaults(_earthquake);
    _mapPane.map.setView([coords[1], coords[0]], 9, true);
  };

  /**
   * Add feature layer to map
   *
   * @param layer {L.Layer} Leaflet layer
   * @param name {String} Layer name
   */
  _addLayer = function (layer, name) {
    _mapPane.map.addLayer(layer);
    _mapPane.layerController.addOverlay(layer, name);

    _features[name] = layer;
  };

  /**
   * Create a new earthquake instance using event id provided by user
   */
  _createEarthquake = function () {
    Earthquake({
      callback: _addEarthquake,
      id: _eqid.value
    });
  };

  /**
   * Remove all feature (i.e. event-related) layers from map / layer controller
   */
  _removeLayers = function () {
    var layer;

    if (_features) {
      Object.keys(_features).forEach(function(key) {
        layer = _features[key];

        _mapPane.map.removeLayer(layer);
        _mapPane.layerController.removeLayer(layer);
      });
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Application;
