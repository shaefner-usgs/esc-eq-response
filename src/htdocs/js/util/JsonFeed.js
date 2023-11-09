'use strict';


var AppUtil = require('util/AppUtil');


/**
 * Fetch a JSON feed with timeout support and show the loading status and any
 * errors encountered in the StatusBar.
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *     }
 *
 * @return _this {Object}
 *     {
 *       fetch: {Function}
 *     }
 */
var JsonFeed = function (options) {
  var _this,
      _initialize,

      _app;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Fetch a JSON feed and display its status.
   *
   * @param opts {Object}
   *     {
   *       host: {String} optional; for DD eqs which fetch via a local php script
   *       id: {String}
   *       name: {String}
   *       url: {String}
   *     }
   * @param fetchOpts {Object} default is {}
   *     fetch() options
   *
   * @return json {Object}
   */
  _this.fetch = async function (opts, fetchOpts = {}) {
    var json,
        message = `<h4>Error Loading ${opts.name}</h4>`,
        url = new URL(opts.url),
        host = opts.host || url.hostname,
        response = {};

    // Alert user that the feed is loading
    _app.StatusBar.addItem(opts);

    try {
      response = await AppUtil.fetchWithTimeout(url.href, fetchOpts);
      json = await response.clone().json();

      _app.StatusBar.removeItem(opts.id);

      return json;
    } catch (error) {
      message += '<ul>';

      if (error.name === 'AbortError') { // timeout
        message += `<li>Request timed out (can’t connect to ${host})</li>`;
      } else {
        message += `<li>Error code: ${response.status} (${response.statusText})</li>`;
      }

      message += '</ul>';

      _app.StatusBar.addError({
        id: opts.id,
        message: message,
        status: response.status
      });

      console.error(error);
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = JsonFeed;
