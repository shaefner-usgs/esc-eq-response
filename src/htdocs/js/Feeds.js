'use strict';


var HistoricalEvents = require('feeds/HistoricalEvents'),
    NearbyCities = require('feeds/NearbyCities'),
    PagerComments = require('feeds/PagerComments'),
    Rtf = require('util/Rtf'),
    ShakeMapInfo = require('feeds/ShakeMapInfo'),
    ShakeAlert = require('feeds/ShakeAlert');


/**
 * Set which Feeds get included, and the order they are loaded.
 */
var _FEEDCLASSES = [
  HistoricalEvents,
  NearbyCities,
  PagerComments,
  ShakeMapInfo,
  ShakeAlert
];


/**
 * Load external feed data that is included in the Event Summary RTF but not on
 * the web page.
 *
 * @param options {Object}
 *   {
 *     app: {Object} Application
 *   }
 *
 * @return _this {Object}
 *   {
 *     getFeeds: {Function}
 *     loadFeeds: {Function}
 *     reset: {Function}
 *   }
 */
var Feeds = function (options) {
  var _this,
      _initialize,

      _app,
      _feeds,
      _numProcessed,
      _Rtf,

      _createRtf,
      _initFeeds,
      _loadFeed;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _feeds = {};
    _Rtf = Rtf({
      app: _app
    });
  };

  /**
   * Create the RTF document if all Feeds are ready.
   */
  _createRtf = function () {
    _numProcessed ++;

    if (_numProcessed === _FEEDCLASSES.length) {
      _app.StatusBar.addItem({
        id: 'rtf',
        name: 'Event Summary'
      }, {
        prepend: 'Creating'
      });

      _Rtf.create();
    }
  };

  /**
   * Instantiate Feeds and store them in _feeds.
   */
  _initFeeds = function () {
    var feed;

    _FEEDCLASSES.forEach(FeedClass => {
      feed = FeedClass({
        app: _app
      });

      _feeds[feed.id] = feed;
    });
  };

  /**
   * Load the given feed.
   *
   * @param feed {Object}
   */
  _loadFeed = function (feed) {
    _app.JsonFeed.fetch(feed).then(json => {
      feed.json = json;

      _createRtf();
    }).catch(error => {
      _app.StatusBar.addError({
        id: feed.id,
        message: `<h4>Error Creating Event Summary</h4><ul><li>${error}</li></ul>`
      });

      console.error(error);
    });
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Get all Feeds, keyed by their id value.
   *
   * @return _feeds {Object}
   */
  _this.getFeeds = function () {
    return _feeds;
  };

  /**
   * Wrapper method to load all feeds and then create the RTF.
   */
  _this.loadFeeds = function () {
    var feed;

    _numProcessed = 0;

    if (Object.keys(_feeds).length === 0) {
      _initFeeds();
    }

    Object.keys(_feeds).forEach(id => {
      feed = _feeds[id];

      if (feed.url) {
        _loadFeed(feed);
      } else { // feed does not exist
        _createRtf();
      }
    });
  };

  /**
   * Reset to initial state; destroy Feeds.
   */
  _this.reset = function () {
    Object.keys(_feeds).forEach(id =>
      _feeds[id].destroy()
    );

    _feeds = {};
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Feeds;
