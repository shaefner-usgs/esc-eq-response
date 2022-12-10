/* global L */
'use strict';


/**
 * Create the PAGER Feature, a sub-Feature of the Mainshock (and super-Feature
 * of PAGER Cities and PAGER Exposures).
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *     }
 *
 * @return _this {Object}
 *     {
 *       addData: {Function}
 *       data: {Object}
 *       dependencies: {Array}
 *       destroy: {Function}
 *       id: {String}
 *       lightbox: {String}
 *       name: {String}
 *       render: {Function}
 *       url: {String}
 *     }
 */
var Pager = function (options) {
  var _this,
      _initialize,

      _app,
      _mainshock,

      _fetch,
      _getContent,
      _getData,
      _getStatus,
      _getUrl;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;
    _mainshock = _app.Features.getFeature('mainshock');

    _this.data = {};
    _this.dependencies = [
      'pager-cities',
      'pager-exposures'
    ];
    _this.id = 'pager';
    _this.lightbox = '';
    _this.name = 'PAGER';
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
   * Get the HTML content for the Lightbox.
   *
   * @return {String}
   */
  _getContent = function () {
    var exposures = _app.Features.getFeature('pager-exposures'),
        table = exposures.summary.replace('<h3>Population Exposure</h3>', '');

    return L.Util.template(
      '<h4>Summary</h4>' +
      '<p>{impact}</p>' +
      '<p>{structures}</p>' +
      '<div class="wrapper">' +
        '<div class="loss">' +
          '<h4>Estimated Fatalities</h4>' +
          '<img src="{fatalities}" alt="Estimated fatalities histogram">' +
          '<h4>Estimated Economic Losses</h4>' +
          '<img src="{economic}" alt="Estimated economic losses histogram">' +
        '</div>' +
        '<div class="exposure">' +
          '<h4>Population Exposure</h4>' +
          '<div>' +
            table +
            '<img src="{exposure}" alt="Population exposure map">' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<p class="status"><span>{status}</span></p>',
      _this.data
    );
  };

  /**
   * Get the data used to create the content.
   *
   * @param json {Object}
   *
   * @return {Object}
   */
  _getData = function (json) {
    var pagerCities = _app.Features.getFeature('pager-cities'),
        pagerExposures = _app.Features.getFeature('pager-exposures'),
        product = _mainshock.data.products.losspager[0],
        contents = product.contents;

    return {
      alert: product.properties.alertlevel,
      cities: pagerCities.data,
      economic: contents['alertecon.png'].url,
      exposure: contents['exposure.png'].url,
      exposures: pagerExposures.data,
      fatalities: contents['alertfatal.png'].url,
      impact: json.impact1,
      status: _getStatus(product),
      structures: json.struct_comment
    };
  };

  /**
   * Get the review status.
   *
   * @param product {Object}
   *
   * @return status {String}
   */
  _getStatus = function (product) {
    var status = 'not reviewed'; // default

    status = (product.properties['review-status'] || status).toLowerCase();

    if (status === 'reviewed') {
      status += '<i class="icon-check"></i>';
    }

    return status;
  };

  /**
   * Get the JSON feed's URL.
   *
   * @return url {String}
   */
  _getUrl = function () {
    var contents,
        products = _mainshock.data.products,
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
    _this.data = _getData(json);
    _this.lightbox = _getContent();
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    if (_this.lightbox) {
      _app.Features.getLightbox(_this.id).destroy();
    }

    _initialize = null;

    _app = null;
    _mainshock = null;

    _getContent = null;
    _getData = null;
    _getStatus = null;
    _fetch = null;
    _getUrl = null;

    _this = null;
  };

  /**
   * Add the alert bubble.
   */
  _this.render = function () {
    var bubble =
          `<span class="pager-alertlevel-${_mainshock.data.alert} impact-bubble">` +
            `<strong class="roman">${_mainshock.data.alert}</strong>` +
          '</span>',
        h3 = document.getElementById('pager').querySelector('h3');

    h3.innerHTML += bubble;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Pager;
