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
      _mapPane,
      _navigation,

      _addEarthquake,
      _createEarthquake;


  _this = {};

  _initialize = function (options) {
    _els = {
      map: options.map,
      summary: options.summary
    };
    _eqid = document.getElementById('eqid');

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

    _editPane.setDefaults(_earthquake);

    _mapPane.map.addLayer(mainshock);
    _mapPane.map.setView([coords[1], coords[0]], 9, true);
    _mapPane.layerController.addOverlay(mainshock, 'Mainshock');
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


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Application;
