'use strict';


var EditPane = require('EditPane'),
    Features = require('Features'),
    Feeds = require('Feeds'),
    HelpPane = require('HelpPane'),
    JsonFeed = require('JsonFeed'),
    MapPane = require('MapPane'),
    NavBar = require('NavBar'),
    PlotsPane = require('PlotsPane'),
    SignificantEqs = require('SignificantEqs'),
    StatusBar = require('StatusBar'),
    SummaryPane = require('SummaryPane'),
    TitleBar = require('TitleBar');


/**
 * Earthquake Response Application - set up and configure app's "primary"
 * Classes.
 *
 * @param options {Object}
 *   {
 *     EditPane: {Element}
 *     HelpPane: {Element}
 *     MapPane: {Element}
 *     NavBar: {Element}
 *     PlotsPane: {Element}
 *     StatusBar: {Element}
 *     SummaryPane: {Element}
 *     TitleBar: {Element}
 *   }
 *
 * @return _this {Object}
 *   {
 *     EditPane: {Object}
 *     Features: {Object}
 *     Feeds: {Object}
 *     HelpPane: {Object}
 *     JsonFeed: {Object}
 *     MapPane: {Object}
 *     NavBar: {Object}
 *     PlotsPane: {Object}
 *     SignificantEqs: {Object}
 *     StatusBar: {Object}
 *     SummaryPane: {Object}
 *     reset: {Function}
 *     setScrollPosition: {Function}
 *     setTitle: {Function}
 *   }
 */
var Application = function (options) {
  var _this,
      _initialize,

      _els,
      _throttle,

      _addListeners,
      _initClasses,
      _redirect,
      _resetScrollPositions,
      _saveScrollPosition;


  _this = {};

  _initialize = function (options) {
    _els = options || {};

    _redirect();
    _initClasses();
  };

  /**
   * Add event listeners.
   */
  _addListeners = function () {
    // Save scroll position when user scrolls
    window.addEventListener('scroll', () => {
      _saveScrollPosition();
    });
  };

  /**
   * Instantiate app's "primary" Classes and store/share them via the 'app'
   * property so their public methods/props are accessible to other Classes.
   */
  _initClasses = function () {
    var appClasses,
        name,
        postInits;

    appClasses = [
      Features, // must be first
      EditPane,
      Feeds,
      HelpPane,
      JsonFeed,
      MapPane,
      NavBar,
      PlotsPane,
      SignificantEqs,
      StatusBar,
      SummaryPane,
      TitleBar
    ];
    postInits = [];

    appClasses.forEach(appClass => {
      name = appClass.name; // name of Class

      _this[name] = appClass({
        app: _this,
        el: _els[name] || null
      });

      if (typeof _this[name].postInit === 'function') {
        postInits.push(_this[name]);
      }
    });

    _addListeners();

    // Run post-initialization code now that all Classes are ready
    postInits.forEach(name => {
      name.postInit();
    });
  };

  /**
   * Redirect users using old (less succinct) parameter names.
   */
  _redirect = function () {
    var url  = window.location.href;

    url = url.replace(/aftershocks/g, 'as');
    url = url.replace(/foreshocks/g, 'fs');
    url = url.replace(/historical/g, 'hs');
    url = url.replace(/minmag/g, 'mag');

    history.replaceState(null, '', url);
  };

  /**
   * Reset saved scroll positions.
   */
  _resetScrollPositions = function () {
    var id;

    _this.NavBar.panes.forEach(pane => {
      id = pane.getAttribute('id');

      window.sessionStorage.setItem(id, 0);
    });
  };

  /**
   * Save the current scroll position in sessionStorage.
   */
  _saveScrollPosition = function () {
    var id,
        position;

    id = _this.NavBar.getPaneId();
    position = window.pageYOffset;

    window.clearTimeout(_throttle);

    // Throttle scroll event
    _throttle = window.setTimeout(function() {
      window.sessionStorage.setItem(id, position);
    }, 50);
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Reset app to default state (i.e. no Mainshock selected).
   */
  _this.reset = function () {
    _resetScrollPositions();

    _this.Features.reset(); // reset Features first
    _this.EditPane.reset();
    _this.Feeds.reset();
    _this.MapPane.reset();
    _this.NavBar.reset();
    _this.PlotsPane.reset();
    _this.StatusBar.reset();
    _this.SummaryPane.reset();
    _this.TitleBar.reset();
  };

  /**
   * Set the scroll position to the previous value.
   *
   * @param id {String}
   */
  _this.setScrollPosition = function (id) {
    var position = window.sessionStorage.getItem(id);

    if (position) {
      window.scroll(0, position);
    }
  };

  /**
   * Set the Document's title.
   *
   * @param opts {Object} optional; default is {}
   *   {
   *     title: {String} optional
   *   }
   */
  _this.setTitle = function (opts = {}) {
    var appName,
        title;

    appName = document.title.split(' | ')[1] || document.title; // initial <title>
    title = appName; // default

    if (opts.title) {
      title = opts.title + ' | ' + appName;
    }

    document.title = title;

    _this.TitleBar.setTitle(opts);
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Application;
