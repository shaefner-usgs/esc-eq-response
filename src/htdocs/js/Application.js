'use strict';


var EditPane = require('EditPane'),
    Features = require('Features'),
    MapPane = require('MapPane'),
    NavBar = require('NavBar'),
    PlotsPane = require('PlotsPane'),
    StatusBar = require('StatusBar'),
    SummaryPane = require('SummaryPane');


/**
 * Earthquake Response Application - sets up app and dependencies
 *
 * @param options {Object}
 *   {
 *     editPane: {ELement},
 *     mapPane: {Element},
 *     navBar: {Element},
 *     statusBar: {Element},
 *     summaryPane: {Element}
 *   }
 */
var Application = function (options) {
  var _this,
      _initialize,

      _editPane,
      _features,
      _mapPane,
      _navBar,
      _plotsPane,
      _statusBar,
      _summaryPane;


  _this = {};

  _initialize = function (options) {
    // Initialize map / plots / summary panes & navigation / status bar
    _mapPane = MapPane({
      el: options.mapPane
    });
    _navBar = NavBar({
      el: options.navBar,
      mapPane: _mapPane
    });
    _plotsPane = PlotsPane({
      el: options.plotsPane
    });
    _statusBar = StatusBar({
      el: options.statusBar
    });
    _summaryPane = SummaryPane({
      el: options.summaryPane
    });

    // Initialize features (event-specific layers) for map and summary panes
    _features = Features({
      mapPane: _mapPane,
      statusBar: _statusBar,
      summaryPane: _summaryPane
    });

    // Initialize edit pane
    _editPane = EditPane({
      el: options.editPane,
      features: _features,
      mapPane: _mapPane,
      statusBar: _statusBar,
      summaryPane: _summaryPane
    });
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Application;
