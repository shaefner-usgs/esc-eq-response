'use strict';


var AppUtil = require('AppUtil'),
    EditPane = require('EditPane'),
    Features = require('Features'),
    HelpPane = require('HelpPane'),
    MapPane = require('MapPane'),
    NavBar = require('NavBar'),
    PlotsPane = require('PlotsPane'),
    StatusBar = require('StatusBar'),
    SignificantEqs = require('SignificantEqs'),
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

      _loadComponents,
      _redirect;


  _this = {};

  _initialize = function (options) {
    _redirect();
    _loadComponents(options);

    // Remove initial loading message
    _this.StatusBar.removeItem('initial');
  };

  /**
   * Load app components and store them in a global 'app' object that is shared
   *   between classes
   */
  _loadComponents = function (options) {
    _this.AppUtil = AppUtil;
    _this.HelpPane = HelpPane({
      el: options.helpPane
    });
    _this.MapPane = MapPane({
      el: options.mapPane
    });
    // PlotsPane depends on: MapPane
    _this.PlotsPane = PlotsPane({
      app: _this,
      el: options.plotsPane
    });
    _this.StatusBar = StatusBar({
      el: options.statusBar
    });
    // NavBar depends on: MapPane, PlotsPane, StatusBar
    _this.NavBar = NavBar({
      app: _this,
      el: options.navBar
    });
    // SummaryPane depends on: MapPane
    _this.SummaryPane = SummaryPane({
      app: _this,
      el: options.summaryPane
    });
    // Features depends on: (EditPane), MapPane, PlotsPane, StatusBar, SummaryPane
    _this.Features = Features({
      app: _this
    });
    // EditPane depends on: Features, MapPane, NavBar, StatusBar, SummaryPane
    _this.EditPane = EditPane({
      app: _this,
      el: options.editPane
    });
    // SignificantEqs depends on: EditPane, StatusBar
    _this.SignificantEqs = SignificantEqs({
      app: _this
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
