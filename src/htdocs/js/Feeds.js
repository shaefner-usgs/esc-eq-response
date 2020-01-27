'use strict';


var NearbyCities = require('feeds/NearbyCities'),
    PagerComments = require('feeds/PagerComments'),
    ShakeMapInfo = require('feeds/ShakeMapInfo'),
    HistoricalEvents = require('feeds/HistoricalEvents'),
    Xhr = require('util/Xhr');


var _FEEDCLASSES;

/**
 * Set which feeds get included, and the order they are loaded.
 *
 * IMPORTANT: the Object key must match the id property set in the Feed class.
 */
_FEEDCLASSES = {
  'nearby-cities': NearbyCities,
  'pager-comments': PagerComments,
  'shakemap-info': ShakeMapInfo,
  'historical-events': HistoricalEvents
};


/**
 * Load external feed data included in Event Summary doc but not shown in web app
 *
 * @param options {Object}
 *   {
 *     app: {Object} // Application
 *   }
 *
 * @return _this {Object}
 *   {
 *     getFeeds: {Function},
 *     instantiateFeeds: {Function},
 *     reset: {Function}
 *   }
 */
var Feeds = function (options) {
  var _this,
      _initialize,

      _app,
      _feeds,
      _numFeeds,

      _createRtf,
      _instantiateFeed,
      _loadJson;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _feeds = {};
  };

  /**
   * Wrapper method to create RTF document (checks if all Feeds are loaded)
   */
  _createRtf = function () {
    if (Object.keys(_feeds).length === _numFeeds) {
      _app.StatusBar.addItem({
        id: 'rtf',
        name: 'Event Summary'
      }, {
        prepend: 'Creating'
      });

      _app.Rtf.create();
    }
  };

  /**
   * Instantiate a Feed
   *
   * @param FeedClass {Object}
   */
  _instantiateFeed = function (FeedClass) {
    var feed;

    feed = FeedClass({
      app: _app
    });

    if (feed.url) {
      _loadJson(feed);
    } else { // feed does not exist
      -- _numFeeds;
      _createRtf();
    }
  };

  /**
   * Load a json feed
   *   upon success, store feed's data to Feed instance in json prop
   *
   * @param feed {Object}
   */
  _loadJson = function (feed) {
    var domain,
        errorMsg,
        matches;

    errorMsg = '<h4>Error Loading ' + feed.name + '</h4>';

    _app.StatusBar.addItem(feed);

    Xhr.ajax({
      url: feed.url,
      success: function (json) {
        feed.json = json;
        _feeds[feed.id] = feed;

        _app.StatusBar.removeItem(feed.id);
        _createRtf();
      },
      error: function (status, xhr) {
        errorMsg += '<ul>';

        if (xhr.responseText) {
          console.error(xhr.responseText);
        }
        if (status) {
          if (status.message) {
            errorMsg += '<li>' + status.message + '</li>';
          }
          else {
            errorMsg += '<li>http status code: ' + status + '</li>';
          }
        }

        errorMsg += '</ul>';
        _app.StatusBar.addError(feed, errorMsg);
      },
      ontimeout: function (xhr) {
        console.error(xhr);

        matches = feed.url.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
        domain = matches && matches[1];
        errorMsg += '<ul><li>Request timed out (can&rsquo;t connect to ' + domain +
          ')</li></ul>';

        _app.StatusBar.addError(feed, errorMsg);
      },
      timeout: 20000
    });
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Get all Feeds
   *
   * @return _feeds {Object}
   */
  _this.getFeeds = function () {
    return _feeds;
  };

  /**
   * Wrapper method to loop through Feed classes and instantiate them
   */
  _this.instantiateFeeds = function () {
    var FeedClass;

    _numFeeds = Object.keys(_FEEDCLASSES).length;

    Object.keys(_FEEDCLASSES).forEach(function(id) {
      FeedClass = _FEEDCLASSES[id];
      _instantiateFeed(FeedClass);
    });
  };

  /**
   * Reset to initial state
   */
  _this.reset = function () {
    Object.keys(_feeds).forEach(function(id) {
      _feeds[id].destroy();
    });

    _feeds = {};
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Feeds;
