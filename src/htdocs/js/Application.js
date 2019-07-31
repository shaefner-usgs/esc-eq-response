'use strict';


var EditPane = require('EditPane'),
    Features = require('Features'),
    HelpPane = require('HelpPane'),
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
 *     editPane: {Element},
 *     helpPane: {Element},
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

      _loadDependencies,
      _redirect;


  _this = {};

  _initialize = function (options) {
    _redirect();
    _loadComponents(options);

    // Remove initial loading message
    _this.StatusBar.removeItem('initial');
  };

  /**
   * Load app
   */
  _loadComponents = function (options) {
    _this.HelpPane = HelpPane({
      el: options.helpPane
    });
    _this.MapPane = MapPane({
      el: options.mapPane
    });
    _this.StatusBar = StatusBar({
      el: options.statusBar
    });
    _this.PlotsPane = PlotsPane({  // mapPane
      app: _this,
      el: options.plotsPane
    });
    _this.SummaryPane = SummaryPane({ // mapPane
      app: _this,
      el: options.summaryPane
    });
    _this.NavBar = NavBar({ // mapPane, plotsPane, statusBar
      app: _this,
      el: options.navBar
    });
    _this.Features = Features({ // mapPane, plotsPane, statusBar, summaryPane
      app: _this
    });
    _this.EditPane = EditPane({ // features, mapPane, navBar, statusBar, summaryPane
      app: _this,
      el: options.editPane
    });
  };

  /**
   * URL params shortened to make URLs more succinct; redirect users using old params
   */
  _redirect = function () {
    var url;

    url = window.location.href;
    url = url.replace(/aftershocks/g, 'as');
    url = url.replace(/foreshocks/g, 'fs');
    url = url.replace(/historical/g, 'hs');
    url = url.replace(/minmag/g, 'mag');

    history.replaceState(null, null, url);
  };


  _initialize(options);
  options = null;
  console.log(_this);
  return _this;
};


module.exports = Application;
