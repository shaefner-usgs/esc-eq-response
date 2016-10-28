'use strict';


var Earthquake = require('Earthquake'),
    EditPane = require('EditPane'),
    Features = require('Features'),
    LoadingModule = require('LoadingModule'),
    MapPane = require('MapPane'),
    Navigation = require('Navigation'),
    SummaryPane = require('SummaryPane');


/**
 * Earthquake Response Application - sets up app and dependencies
 *
 * @param options {Object}
 *   {
 *     edit: {ELement},
 *     map: {Element},
 *     nav: {Element},
 *     summary: {Element}
 *   }
 */
var Application = function (options) {
  var _this,
      _initialize,

      _editPane,
      _eqid,
      _features,
      _loadingModule,
      _mapPane,
      _navigation,
      _summaryPane,

      _createEarthquake;


  _this = {};

  _initialize = function (options) {
    _eqid = document.getElementById('eqid');

    // Initialize loading module, map / summary panes & navigation
    _loadingModule = LoadingModule({
      el: options.loading
    });
    _mapPane = MapPane({
      el: options.map
    });
    _navigation = Navigation({
      el: options.navigation,
      mapPane: _mapPane
    });
    _summaryPane = SummaryPane({
      el: options.summary
    });

    // Initialize features (event-specific layers) for map and summary panes
    _features = Features({
      loadingModule: _loadingModule,
      mapPane: _mapPane,
      summaryPane: _summaryPane
    });

    // Initialize edit pane
    _editPane = EditPane({
      el: options.edit,
      features: _features
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
    // Clear any previous mainshock details
    document.querySelector('.details').innerHTML = '';
    _features.removeFeatures();

    if (_eqid.value !== '') {
      Earthquake({
        callback: _features.initFeatures, // add features to map and summary panes
        editPane: _editPane,
        id: _eqid.value,
        loadingModule: _loadingModule,
      });
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Application;
