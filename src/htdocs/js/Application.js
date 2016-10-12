'use strict';


var Earthquake = require('Earthquake'),
    EditPane = require('EditPane'),
    Features = require('features/Features'),
    MapPane = require('MapPane'),
    Navigation = require('Navigation'),
    SummaryPane = require('SummaryPane');


var Application = function (options) {
  var _this,
      _initialize,

      _editPane,
      _eqid,
      _els,
      _features,
      _mapPane,
      _navigation,
      _summaryPane,

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
    _summaryPane = SummaryPane();

    _navigation = Navigation({
      mapPane: _mapPane
    });

    _features = Features({
      editPane: _editPane,
      mapPane: _mapPane,
      summaryPane: _summaryPane
    });

    if (_eqid.value) {
      _createEarthquake();
    }
    _eqid.addEventListener('change', _createEarthquake);
  };

  /**
   * Create a new earthquake instance using event id provided by user
   */
  _createEarthquake = function () {
    Earthquake({
      callback: _features.initFeatureLayers,
      id: _eqid.value
    });
  };

  _initialize(options);
  options = null;
  return _this;
};


module.exports = Application;
