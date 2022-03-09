'use strict';


var AppUtil = require('util/AppUtil');


/**
 * Fetch a JSON feed with timeout support and show the loading status and any
 * errors encountered in the StatusBar.
 *
 * @param options {Object}
 *   {
 *     app: {Object} Application
 *   }
 *
 * @return _this {Object}
 *   {
 *     fetch: {Function}
 *     initThrottlers: {Function}
 *     throttlers: {Object}
 *   }
 */
var JsonFeed = function (options) {
  var _this,
      _initialize,

      _app;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;

    _this.throttlers = {};
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Fetch a JSON feed and display its status.
   *
   * @param opts {Object}
   *   {
   *     host: {String} optional; for DD eqs which use a local php script to fetch
   *     id: {String}
   *     name: {String}
   *     url: {String}
   *   }
   * @param fetchOpts {Object} optional; default is {}
   *     fetch() settings
   *
   * @return json {Object}
   */
  _this.fetch = async function (opts, fetchOpts = {}) {
    var errorMsg,
        host,
        json,
        response,
        text,
        url;

    opts = opts || {};
    errorMsg = `<h4>Error Loading ${opts.name}</h4>`;
    url = new URL(opts.url);
    host = opts.host || url.hostname;
    response = {};

    // Alert user that the feed is loading
    _app.StatusBar.addItem(opts);

    try {
      response = await AppUtil.fetchWithTimeout(url.href, fetchOpts);
      json = await response.clone().json();

      _app.StatusBar.removeItem(opts.id);

      return json;
    } catch (error) {
      errorMsg += '<ul>';

      if (error.name === 'AbortError') { // timeout
        errorMsg += `<li>Request timed out (can’t connect to ${host})</li>`;
      } else if (response.status === 404 && opts.id === 'mainshock') {
        errorMsg += `<li>Can’t find Event ID (${AppUtil.getParam('eqid')}) in catalog</li>`;
      } else {
        text = await response.text();

        if (text.match('limit of 20000')) {
          errorMsg += '<li>Modify the parameters to match fewer earthquakes ' +
            '(max 20,000)</li>';
        } else if (text.match('parameter combination')){
          errorMsg += '<li>Missing parameters (all fields are required)</li>';
        } else { // generic error message
          errorMsg += `<li>Error code: ${response.status} (${response.statusText})</li>`;
        }
      }

      errorMsg += '</ul>';

      _app.StatusBar.addError({
        id: opts.id,
        message: errorMsg,
        status: response.status
      });

      console.error(error);
    }
  };

  /**
   * Initialize throttlers that are used to minimize multiple Fetch requests
   * for the same Feature (due to Events being triggered in rapid succession
   * when a user interacts with Settings).
   *
   * @param id {String}
   *     Feature id
   */
  _this.initThrottlers = function (id) {
    if (!Object.prototype.hasOwnProperty.call(_this.throttlers, id)) {
      _this.throttlers[id] = [];
    }

    // Clear any previous throttled requests for this Feature
    _this.throttlers[id].forEach(timer => {
      clearTimeout(timer);
      _this.throttlers[id].shift();
    });
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = JsonFeed;
