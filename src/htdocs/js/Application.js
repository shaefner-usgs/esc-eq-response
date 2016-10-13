'use strict';


var Earthquake = require('Earthquake'),
    EditPane = require('EditPane'),
    Features = require('Features'),
    MapPane = require('MapPane'),
    Navigation = require('Navigation'),
    SummaryPane = require('SummaryPane');


/**
 * Earthquake Response Application - sets up app and dependencies
 *
 * @param options {Object}
 *   {
 *     map: {Element},
 *     summary: {Element}
 *   }
 */
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

    // Set up each pane (or 'page') of app
    _editPane = EditPane();
    _mapPane = MapPane({
      el: _els.map
    });
    _summaryPane = SummaryPane();

    _navigation = Navigation({
      mapPane: _mapPane
    });

    // Features are event-specific layers on map and summary pages
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
      callback: _features.initFeatures, // add features to map and summary panes
      id: _eqid.value
    });
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Application;
