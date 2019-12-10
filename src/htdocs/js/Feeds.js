'use strict';


var NearbyCities = require('feeds/NearbyCities'),
    PagerComments = require('feeds/PagerComments'),
    ShakeMapInfo = require('feeds/ShakeMapInfo'),
    SignificantEqs = require('feeds/SignificantEqs'),
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
  'significant-eqs': SignificantEqs
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

      _getStatus,
      _loadJson;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _feeds = {};
  };

  /**
   * Get status of loading external feed data
   *
   * @return status {String}
   */
  _getStatus = function () {
    var status;

    if (Object.keys(_feeds).length === _numFeeds) { // all available Feeds loaded
      status = 'finished';
    }

    return status;
  };

  /**
   * Load a json feed
   *
   * @param feed {Object}
   */
  _loadJson = function (feed) {
    var domain,
        errorMsg,
        matches,
        status;

    errorMsg = '<h4>Error Loading ' + feed.name + '</h4>';

    _app.StatusBar.addItem(feed);

    Xhr.ajax({
      url: feed.url,
      success: function (json) {
        _feeds[feed.id] = json;

        _app.StatusBar.removeItem(feed.id);

        status = _getStatus();
        if (status === 'finished') { // all feeds finished loading
          _app.SummaryPane.createSummaryDoc(); // create Event Summary document
        }
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
  _this.instantiateFeeds = function (feedClasses) {
    var feed,
        FeedClass,
        status;

    feedClasses = feedClasses || _FEEDCLASSES;
    _numFeeds = Object.keys(feedClasses).length;

    Object.keys(feedClasses).forEach(function(id) {
      FeedClass = feedClasses[id];
      feed = FeedClass({
        app: _app
      });

      if (feed.url) {
        _loadJson(feed);
      } else { // feed does not exist
        -- _numFeeds;

        status = _getStatus();
        if (status === 'finished') { // all feeds finished loading
          _app.SummaryPane.createSummaryDoc(); // create Event Summary document
        }
      }
    });
  };

  /**
   * Reset to initial state
   */
  _this.reset = function () {
    _feeds = {};
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Feeds;
