'use strict';


var EditPane = require('EditPane'),
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
 *     loading: {Element},
 *     map: {Element},
 *     navigation: {Element},
 *     summary: {Element}
 *   }
 */
var Application = function (options) {
  var _this,
      _initialize,

      _editPane,
      _features,
      _loadingModule,
      _mapPane,
      _navigation,
      _summaryPane;


  _this = {};

  _initialize = function (options) {
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
      features: _features,
      loadingModule: _loadingModule,
      mapPane: _mapPane,
      summaryPane: _summaryPane
    });
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Application;
