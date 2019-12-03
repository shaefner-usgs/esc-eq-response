'use strict';


var NearbyCities = require('feeds/NearbyCities'),
    Xhr = require('util/Xhr');


var _FEEDCLASSES;

/**
 * Set which feeds get included, and the order they are loaded.
 *
 * IMPORTANT: the Object key must match the id property set in the Feed class.
 */
_FEEDCLASSES = {
  'nearby-cities': NearbyCities
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
 *     instantiateFeeds: {Function}
 *   }
 */
var Feeds = function (options) {
  var _this,
      _initialize,

      _app,
      _feeds,

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
   *     Returns 'finished' if all feeds are loaded
   */
  _getStatus = function () {
    var status = 'finished';

    Object.keys(_feeds).some(function(id) {
      if (!_feeds[id]) {
        status = '';
      }
    });

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
        FeedClass;

    feedClasses = feedClasses || _FEEDCLASSES;

    Object.keys(feedClasses).forEach(function(id) {
      _feeds[id] = false; // flag as not yet loaded

      FeedClass = feedClasses[id];
      feed = FeedClass({
        app: _app
      });

      if (feed.url) {
        _loadJson(feed);
      }
    });
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Feeds;
