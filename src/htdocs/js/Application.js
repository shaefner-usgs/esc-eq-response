'use strict';


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
 * Earthquake Response Application.
 *
 * Instantiate the app's "primary" Classes and bind them together via the 'app'
 * property that is passed to all of the Classes. This makes all of their public
 * properties and methods accessible to each other.
 *
 * Also handle resetting the app to its default state.
 *
 * @param options {Object}
 *     {
 *       LegendBar: {Element}
 *       MapPane: {Element}
 *       NavBar: {Element}
 *       Pane: {Element}
 *       PlotsPane: {Element}
 *       SearchBar: {Element}
 *       SelectBar: {Element}
 *       SettingsBar: {Element}
 *       SideBar: {Element}
 *       StatusBar: {Element}
 *       SummaryPane: {Element}
 *       TitleBar: {Element}
 *     }
 *
 * @return _this {Object}
 *     {
 *       Features: {Object}
 *       LegendBar: {Object}
 *       MapPane: {Object}
 *       NavBar: {Object}
 *       Pane: {Object}
 *       PlotsPane: {Object}
 *       SearchBar: {Object}
 *       SelectBar: {Object}
 *       SettingsBar: {Object}
 *       SideBar: {Object}
 *       StatusBar: {Object}
 *       SummaryPane: {Object}
 *       TitleBar: {Object}
 *       headerHeight: {Number}
 *       reset: {Function}
 *       sideBarWidth: {Number}
 *       utcOffset: {String}
 *     }
 */
var Application = function (options) {
  var _this,
      _initialize,

      _els,
      _rendered,

      _initClasses,
      _resetQueryString;


  _this = {};

  _initialize = function (options = {}) {
    var minutes = new Date().getTimezoneOffset(),
        hours = Math.abs(minutes / 60),
        sign = (minutes > 0 ? '-' : '+');

    _els = options;
    _rendered = false;

    _this.headerHeight = document.querySelector('header').offsetHeight;
    _this.sideBarWidth = document.getElementById('sideBar').offsetWidth;
    _this.utcOffset = `UTC${sign}${hours}`;

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
          Features: Features // Features must be last so that the UI is ready
        },
        postInits = [];

    Object.keys(appClasses).forEach(name => {
      _this[name] = appClasses[name]({
        app: _this,
        el: _els[name] || null
      });

      if (typeof _this[name].postInit === 'function') {
        postInits.push(_this[name]);
      }
    });

    // Run post-initialization code now that all Classes are ready
    postInits.forEach(name =>
      name.postInit()
    );
  };

  /**
   * Reset the queryString, keeping only the non-Mainshock specific parameters.
   */
  _resetQueryString = function () {
    var queryString,
        inputs = document.querySelectorAll('#selectBar input, #settingsBar input'),
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
   * Reset the app to its default state (i.e. no Mainshock selected).
   */
  _this.reset = function () {
    document.body.classList.remove('loading', 'mainshock');

    _this.Features.reset(); // Features must be first
    _this.LegendBar.reset();
    _this.MapPane.reset();
    _this.Pane.reset();
    _this.PlotsPane.reset();
    _this.SelectBar.reset();
    _this.SettingsBar.reset();
    _this.SideBar.reset();
    _this.StatusBar.reset();
    _this.SummaryPane.reset();
    _this.TitleBar.reset();

    if (_rendered) { // preserve initial (incoming) URL parameters
      _resetQueryString();
    }

    _rendered = true;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Application;
