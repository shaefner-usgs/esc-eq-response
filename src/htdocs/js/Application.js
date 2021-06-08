'use strict';


var AppUtil = require('util/AppUtil'),
    EditPane = require('EditPane'),
    Features = require('Features'),
    Feeds = require('Feeds'),
    HelpPane = require('HelpPane'),
    MapPane = require('MapPane'),
    NavBar = require('NavBar'),
    PlotsPane = require('PlotsPane'),
    StatusBar = require('StatusBar'),
    Rtf = require('Rtf'),
    SignificantEqs = require('SignificantEqs'),
    SummaryPane = require('SummaryPane');


/**
 * Earthquake Response Application - set up and configure app's components
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
 *
 * @return _this {Object}
 *   {
 *     EditPane: {Function},
 *     Features: {Function},
 *     Feeds: {Function},
 *     HelpPane: {Function},
 *     MapPane: {Function},
 *     NavBar: {Function},
 *     PlotsPane: {Function},
 *     Rtf: {Function},
 *     SignificantEqs: {Function},
 *     resetApp: {Function},
 *     StatusBar: {Function},
 *     SummaryPane: {Function}
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
    _this.StatusBar.removeItem('initial');

    // Get things rolling if eqid is already set
    if (AppUtil.getParam('eqid') !== '') {
      _this.EditPane.initFeatures();
    }
  };

  /**
   * Instantiate app components and store them in a superglobal 'app' object
   *   that is shared between Classes
   */
  _initComponents = function (options) {
    // Instantiate PlotsPane, StatusBar first so they're available immediately
    _this.PlotsPane = PlotsPane({
      app: _this,
      el: options.plotsPane
    });
    _this.StatusBar = StatusBar({
      app: _this,
      el: options.statusBar
    });

    _this.EditPane = EditPane({
      app: _this,
      el: options.editPane
    });
    _this.Features = Features({
      app: _this
    });
    _this.Feeds = Feeds({
      app: _this
    });
    _this.HelpPane = HelpPane({
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
    _this.Rtf = Rtf({
      app: _this
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
   * URL params were shortened to make URLs more succinct; redirect users using old params
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
   * Set app to default state: remove Features, clear status bar, etc.
   */
  _this.resetApp = function () {
    _this.Features.reset(); // reset Features first
    _this.EditPane.reset();
    _this.Feeds.reset();
    _this.MapPane.reset();
    _this.NavBar.reset();
    _this.PlotsPane.reset();
    _this.StatusBar.reset();
    _this.SummaryPane.reset();
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Application;
