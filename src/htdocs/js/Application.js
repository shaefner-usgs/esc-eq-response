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
      _features,
      _mapPane,
      _navigation,
      _summaryPane,

      _createEarthquake;


  _this = {};

  _initialize = function (options) {
    _eqid = document.getElementById('eqid');

    // Initialize each pane (or 'page') of app & navigation
    _editPane = EditPane({
      el: options.edit
    });
    _mapPane = MapPane({
      el: options.map
    });
    _summaryPane = SummaryPane({
      el: options.summary
    });
    _navigation = Navigation({
      el: options.nav,
      mapPane: _mapPane
    });

    // Initialize features (event-specific layers) on map and summary panes
    _features = Features({
      editPane: _editPane,
      mapPane: _mapPane,
      summaryPane: _summaryPane
    });

    // Call _createEarthquake() when eqid is supplied
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
