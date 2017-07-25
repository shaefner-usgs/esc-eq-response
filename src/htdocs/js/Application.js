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
 *     plotsPane: {Element},
 *     statusBar: {Element},
 *     summaryPane: {Element}
 *   }
 */
var Application = function (options) {
  var _this,
      _initialize,

      _EditPane,
      _Features,
      _MapPane,
      _NavBar,
      _PlotsPane,
      _StatusBar,
      _SummaryPane;


  _this = {};

  _initialize = function (options) {
    // Initialize map / plots / summary panes & navigation / status bar
    _MapPane = MapPane({
      el: options.mapPane
    });
    _NavBar = NavBar({
      el: options.navBar,
      mapPane: _MapPane
    });
    _PlotsPane = PlotsPane({
      el: options.plotsPane
    });
    _StatusBar = StatusBar({
      el: options.statusBar
    });
    _SummaryPane = SummaryPane({
      el: options.summaryPane
    });

    // Initialize features (event-specific layers) for map, plots and summary panes
    _Features = Features({
      mapPane: _MapPane,
      plotsPane: _PlotsPane,
      statusBar: _StatusBar,
      summaryPane: _SummaryPane
    });

    // Initialize edit pane
    _EditPane = EditPane({
      el: options.editPane,
      features: _Features,
      mapPane: _MapPane,
      statusBar: _StatusBar,
      summaryPane: _SummaryPane
    });
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Application;
