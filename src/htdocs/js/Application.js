'use strict';


require('leaflet');

var Features = require('Features'),
    LegendBar = require('LegendBar'),
    MapPane = require('MapPane'),
    NavBar = require('NavBar'),
    Pane = require('Pane'),
    PlotsPane = require('PlotsPane'),
    SearchBar = require('SearchBar'),
    SelectBar = require('SelectBar'),
    SettingsBar = require('SettingsBar'),
    SideBar = require('SideBar'),
    StatusBar = require('StatusBar'),
    SummaryPane = require('SummaryPane'),
    TitleBar = require('TitleBar');


/**
 * Earthquake Response Application
 *
 * Instantiate the app's "primary" Classes and bind them together via the 'app'
 * property that is passed to all Classes. This makes their public properties
 * and methods accessible to each other.
 *
 * Also handle resetting the app to its default state.
 *
 * @param options {Object}
 *     {
 *       legendBar: {Element}
 *       mapPane: {Element}
 *       navBar: {Element}
 *       pane: {Element}
 *       plotsPane: {Element}
 *       searchBar: {Element}
 *       selectBar: {Element}
 *       settingsBar: {Element}
 *       sideBar: {Element}
 *       statusBar: {Element}
 *       summaryPane: {Element}
 *       titleBar: {Element}
 *     }
 */
var Application = function (options) {
  var _this,
      _initialize,

      _els,
      _initialReset,

      _initClasses,
      _resetQueryString;


  _this = {};

  _initialize = function (options = {}) {
    _els = options;
    _initialReset = true;

    _this.dateFormat = 'LLL d, yyyy TT';
    _this.headerHeight = document.querySelector('header').offsetHeight;
    _this.sideBarWidth = document.getElementById('sidebar').offsetWidth;

    _initClasses();
  };

  /**
   * Instantiate the app's "primary" Classes and store/share them via the 'app'
   * property.
   */
  _initClasses = function () {
    var appClasses = {
          LegendBar: LegendBar,
          MapPane: MapPane,
          NavBar: NavBar,
          Pane: Pane,
          PlotsPane: PlotsPane,
          SearchBar: SearchBar,
          SelectBar: SelectBar,
          SettingsBar: SettingsBar,
          SideBar: SideBar,
          StatusBar: StatusBar,
          SummaryPane: SummaryPane,
          TitleBar: TitleBar,
          Features: Features // must be last so that the UI is ready
        },
        postInits = [];

    Object.keys(appClasses).forEach(name => {
      var key = name.charAt(0).toLowerCase() + name.slice(1);

      _this[name] = appClasses[name]({
        app: _this,
        el: _els[key] || null
      });

      if (typeof _this[name].postInit === 'function') {
        postInits.push(_this[name]);
      }
    });

    // Run post-initialization now that all Classes are ready
    postInits.forEach(name =>
      name.postInit()
    );
  };

  /**
   * Reset the queryString, keeping only non-Mainshock specific parameters.
   */
  _resetQueryString = function () {
    var queryString,
        selectors = [
          '#select-bar input',
          '#settings-bar input[type=number]'
        ],
        inputs = document.querySelectorAll(selectors.join()),
        msParams = [],
        pairs = [],
        params = new URLSearchParams(location.search);

    inputs.forEach(input =>
      msParams.push(input.id)
    );

    params.forEach((value, name) => {
      if (!msParams.includes(name)) { // skip Mainshock params
        pairs.push(`${name}=${value}`);
      }
    });

    queryString = '?' + pairs.join('&');

    history.replaceState({}, '', queryString + location.hash);
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Reset the app (i.e. no Mainshock selected).
   */
  _this.reset = function () {
    document.body.classList.remove('loading', 'mainshock');
    sessionStorage.clear();

    if (!_initialReset) {
      _this.Features.reset(); // must be first
      _this.MapPane.reset();
      _this.Pane.reset();
      _this.PlotsPane.reset();
      _this.SelectBar.reset();
      _this.SettingsBar.reset();
      _this.SideBar.reset();
      _this.StatusBar.reset();
      _this.SummaryPane.reset();
      _this.TitleBar.reset();

      _resetQueryString();
    }

    _initialReset = false;
  };


  _initialize(options);
  options = null;
};


module.exports = Application;
