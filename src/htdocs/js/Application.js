'use strict';


var EditPane = require('EditPane'),
    Features = require('Features'),
    Feeds = require('Feeds'),
    HelpPane = require('HelpPane'),
    MapPane = require('MapPane'),
    NavBar = require('NavBar'),
    PlotsPane = require('PlotsPane'),
    Rtf = require('Rtf'),
    SignificantEqs = require('SignificantEqs'),
    StatusBar = require('StatusBar'),
    SummaryPane = require('SummaryPane');


/**
 * Earthquake Response Application - set up and configure app's "primary"
 *   components (Classes).
 *
 * @param options {Object}
 *   {
 *     EditPane: {Element},
 *     HelpPane: {Element},
 *     MapPane: {Element},
 *     NavBar: {Element},
 *     PlotsPane: {Element},
 *     StatusBar: {Element},
 *     SummaryPane: {Element}
 *   }
 *
 * @return _this {Object}
 *   {
 *     EditPane: {Object},
 *     Features: {Object},
 *     Feeds: {Object},
 *     HelpPane: {Object},
 *     MapPane: {Object},
 *     NavBar: {Object},
 *     PlotsPane: {Object},
 *     Rtf: {Object},
 *     SignificantEqs: {Object},
 *     StatusBar: {Object},
 *     SummaryPane: {Object},
 *     resetApp: {Function}
 *   }
 */
var Application = function (options) {
  var _this,
      _initialize,

      _instantiateClasses,
      _redirect;


  _this = {};

  _initialize = function (options) {
    _redirect();
    _instantiateClasses(options);
  };

  /**
   * Instantiate app's "primary" Classes and store/share them via the 'app'
   *   property so their public methods/props are accessible to other Classes.
   */
  _instantiateClasses = function (options) {
    var classes = [
      EditPane,
      Features,
      Feeds,
      HelpPane,
      MapPane,
      NavBar,
      PlotsPane,
      Rtf,
      SignificantEqs,
      StatusBar,
      SummaryPane
    ];

    classes.forEach(function(appClass) {
      var name = appClass.name;

      _this[name] = appClass({
        app: _this,
        el: options[name] || null
      });
    });

    // Run postInit()'s which depend on other Classes being instantiated first
    classes.forEach(function(appClass) {
      var name = appClass.name;

      if (typeof _this[name].postInit === 'function') {
        _this[name].postInit();
      }
    });
  };

  /**
   * Redirect users using old (less succinct) param names.
   */
  _redirect = function () {
    var url  = window.location.href;

    url = url.replace(/aftershocks/g, 'as');
    url = url.replace(/foreshocks/g, 'fs');
    url = url.replace(/historical/g, 'hs');
    url = url.replace(/minmag/g, 'mag');

    history.replaceState(null, '', url);
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Set app to default state (no Mainshock selected).
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
