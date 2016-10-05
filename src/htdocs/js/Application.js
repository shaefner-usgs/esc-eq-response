'use strict';


var Controller = require('Controller'),
    Earthquake = require('Earthquake'),
    EditPane = require('EditPane'),
    MapPane = require('MapPane');


var Application = function (options) {
  var _this,
      _initialize,

      _controller,
      _earthquake,
      _editPane,
      _eqid,
      _els,
      _mapPane,

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

  _createEarthquake = function () {
    _earthquake = Earthquake({
      id: _eqid.value,
      controller: _controller,
      editPane: _editPane
    });
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Application;
