'use strict';


/**
 * Get ShakeAlert Feed.
 *
 * @param options {Object}
 *   {
 *     app: {Object} // Application
 *   }
 *
 * @return _this {Object}
 *   {
 *     destroy: {Function}
 *     id: {String}
 *     name: {String}
 *     url: {String}
 *   }
 */
var ShakeAlert = function (options) {
  var _this,
      _initialize,

      _app,

      _getFeedUrl;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;

    _this.id = 'shake-alert';
    _this.name = 'ShakeAlert';
    _this.url = _getFeedUrl();
  };

  /**
   * Get URL of JSON feed.
   *
   * @return url {String}
   */
  _getFeedUrl = function () {
    var contents,
        mainshock,
        products,
        url;

    mainshock = _app.Features.getFeature('mainshock');
    products = mainshock.json.properties.products;
    url = '';

    if (products['shake-alert']) {
      contents = products['shake-alert'][0].contents;

      if (contents['summary.json']) {
        url = contents['summary.json'].url;
      }
    }

    return url;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Destroy this Class to aid in garbage collection
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;
    _getFeedUrl = null;

    _this = null;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = ShakeAlert;
