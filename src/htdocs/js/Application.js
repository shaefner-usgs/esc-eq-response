'use strict';


var Controller = require('Controller'),
    Earthquake = require('Earthquake'),
    EditPane = require('EditPane'),
    MapPane = require('MapPane');

var EarthquakeLayer = require('features/EarthquakeLayer');

var Application = function (options) {
  var _this,
      _initialize,

      _controller,
      _earthquake,
      _editPane,
      _eqid,
      _els,
      _mapPane,

      _addEarthquake,
      _createEarthquake;


  _this = {};

  _initialize = function (options) {
    _els = {
      map: options.map,
      summary: options.summary
    };

    _eqid = document.getElementById('eqid');

    _controller = Controller();
    _editPane = EditPane();
    _mapPane = MapPane({
      el: _els.map
    });

    if (_eqid.value) {
      _createEarthquake();
    }
    _eqid.addEventListener('change', _createEarthquake);
  };

  _addEarthquake = function (geojson) {
    _earthquake = geojson;

    _editPane.setDefaults(_earthquake);

    EarthquakeLayer({
      data: JSON.stringify(geojson)
    });
  };

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
