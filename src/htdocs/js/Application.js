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

      _initComponents,
      _redirect;


  _this = {};

  _initialize = function (options) {
    _redirect();
    _initComponents(options);

    // Remove initial loading message
    _this.StatusBar.remove('initial');

    // Get things rolling if eqid is already set
    if (_this.AppUtil.getParam('eqid') !== '') {
      _this.EditPane.initFeatures();
    }
  };

  /**
   * Instantiate app components and store them in a superglobal 'app' object
   *   that is shared between Classes
   */
  _initComponents = function (options) {
    // Instantiate StatusBar first so it's available to show status while loading
    _this.StatusBar = StatusBar({
      app: _this,
      el: options.statusBar
    });

    _this.AppUtil = AppUtil;
    _this.EditPane = EditPane({
      app: _this,
      el: options.editPane
    });
    _this.Features = Features({
      app: _this
    });
    _this.HelpPane = HelpPane({
      app: _this,
      el: options.helpPane
    });
    _this.MapPane = MapPane({
      app: _this,
      el: options.mapPane
    });
    _this.NavBar = NavBar({
      app: _this,
      el: options.navBar
    });
    _this.PlotsPane = PlotsPane({
      app: _this,
      el: options.plotsPane
    });
    _this.SignificantEqs = SignificantEqs({
      app: _this
    });
    _this.SummaryPane = SummaryPane({
      app: _this,
      el: options.summaryPane
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

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Set app to default state: remove features, clear status bar, etc.
   */
  _this.resetApp = function () {
    _this.EditPane.reset();
    _this.MapPane.reset();
    _this.NavBar.reset();
    _this.PlotsPane.reset();
    _this.StatusBar.reset();
    _this.SummaryPane.reset();

    // Reset Features last so other Classes can use Features during reset()
    _this.Features.reset();
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Application;
