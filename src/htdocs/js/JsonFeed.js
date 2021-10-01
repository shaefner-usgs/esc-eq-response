'use strict';


var AppUtil = require('util/AppUtil');


/**
 * Fetch a JSON feed. Add timeout support to fetch() and show the loading
 * status and any errors encountered in the StatusBar.
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

      _app,

      _fetchWithTimeout;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;

    _this.throttlers = {};
  };

  /**
   * Add timeout support to a fetch() request.
   *
   * Taken from: https://dmitripavlutin.com/timeout-fetch-request/
   *
   * @param resource {String}
   * @param options {Object} optional; default is {}
   *     fetch() settings, with an additional prop for timeout in milliseconds
   */
  _fetchWithTimeout = async function (resource, options = {}) {
    const { timeout = 10000 } = options;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);

    return response;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Fetch a JSON feed and display its status.
   *
   * @param opts {Object}
   *   {
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
        json,
        response,
        text,
        url;

    opts = opts || {};
    errorMsg = `<h4>Error Loading ${opts.name}</h4>`;
    response = {};
    url = new URL(opts.url);

    // Alert user that the feed is loading
    _app.StatusBar.addItem(opts);

    try {
      response = await _fetchWithTimeout(url.href, fetchOpts);
      json = await response.clone().json();

      _app.StatusBar.removeItem(opts.id);

      return json;
    } catch (error) {
      errorMsg += '<ul>';

      if (error.name === 'AbortError') { // timeout
        errorMsg += `<li>Request timed out (can’t connect to ${url.hostname})</li>`;
      } else if (response.status === 404 && opts.id === 'mainshock') {
        errorMsg += `<li>Can’t find Event ID ${AppUtil.getParam('eqid')} in catalog</li>`;
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
        status: response.status || 'timeout'
      });

      console.error(error);
    }
  };

  /**
   * Initialize throttlers that are used to minimize 'stacked' Fetch requests
   * when loading Features.
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
