/* global L */
'use strict';


/**
 * Create the PAGER Comments Feature.
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *     }
 *
 * @return _this {Object}
 *     {
 *       addData: {Function}
 *       destroy: {Function}
 *       id: {String}
 *       impact1: {String}
 *       name: {String}
 *       structComment: {String}
 *       url: {String}
 *     }
 */
var PagerComments = function (options) {
  var _this,
      _initialize,

      _app,

      _fetch,
      _getUrl;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;

    _this.id = 'pager-comments';
    _this.impact1 = '';
    _this.name = 'PAGER Comments';
    _this.structComment = '';
    _this.url = _getUrl();

    _fetch();
  };

  /**
   * Fetch the feed data.
   */
  _fetch = function () {
    if (_this.url) {
      L.geoJSON.async(_this.url, {
        app: _app,
        feature: _this
      });
    }
  };

  /**
   * Get the JSON feed's URL.
   *
   * @return url {String}
   */
  _getUrl = function () {
    var contents,
        mainshock = _app.Features.getFeature('mainshock'),
        products = mainshock.data.products,
        url = '';

    if (products.losspager) {
      contents = products.losspager[0].contents;

      if (contents['json/comments.json']) {
        url = contents['json/comments.json'].url;
      }
    }

    return url;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add the JSON feed data.
   *
   * @param json {Object}
   */
  _this.addData = function (json) {
    _this.impact1 = json.impact1;
    _this.structComment = json.struct_comment;
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;

    _fetch = null;
    _getUrl = null;

    _this = null;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = PagerComments;
