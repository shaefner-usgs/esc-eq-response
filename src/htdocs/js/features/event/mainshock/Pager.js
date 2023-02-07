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
      _product,

      _fetch,
      _getContent,
      _getData,
      _getStatus,
      _getUrl;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;
    _mainshock = _app.Features.getFeature('mainshock');

    if (_mainshock.data.products.losspager) {
      _product = _mainshock.data.products.losspager[0];
    }

    _this.data = {};
    _this.dependencies = [
      'pager-cities',
      'pager-exposures'
    ];
    _this.id = 'pager';
    _this.lightbox = '';
    _this.name = 'PAGER';
    _this.url = _getUrl();

    if (_this.url) {
      _fetch();
    } else if (_product) { // has PAGER, but there's no feed data
      _this.data = _getData();
      _this.lightbox = _getContent();

      _app.Features.addContent(_this); // add manually
    }
  };

  /**
   * Fetch the feed data.
   */
  _fetch = function () {
    L.geoJSON.async(_this.url, {
      app: _app,
      feature: _this
    });
  };

  /**
   * Get the HTML content for the Lightbox.
   *
   * @return {String}
   */
  _getContent = function () {
    var data,
        exposures = _app.Features.getFeature('pager-exposures'),
        summary = '',
        table = '';

    if (_this.data.impact || _this.data.structures) {
      summary = '<h4>Summary</h4><p>{impact}</p><p>{structures}</p>';
    }
    if (_app.Features.isFeature(exposures)) {
      table = exposures.summary.replace('<h3>Population Exposure</h3>', '');
    }

    data = Object.assign({}, _this.data, {
      table: table
    });

    return L.Util.template(
      summary +
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
            '{table}' +
            '<img src="{exposure}" alt="Population exposure map">' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<p class="status"><span>{status}</span></p>',
      data
    );
  };

  /**
   * Get the data used to create the content.
   *
   * @param json {Object} default is null
   *
   * @return {Object}
   */
  _getData = function (json = null) {
    var impact, structures,
        pagerCities = _app.Features.getFeature('pager-cities'),
        pagerExposures = _app.Features.getFeature('pager-exposures'),
        contents = _product.contents;

    if (json) {
      impact = json.impact1;
      structures = json.struct_comment;
    }

    return {
      alert: _product.properties.alertlevel,
      cities: pagerCities.data,
      economic: contents['alertecon.png'].url,
      exposure: contents['exposure.png'].url,
      exposures: pagerExposures.data,
      fatalities: contents['alertfatal.png'].url,
      impact: impact || '',
      status: _getStatus(),
      structures: structures || ''
    };
  };

  /**
   * Get the review status.
   *
   * @return status {String}
   */
  _getStatus = function () {
    var status = 'not reviewed'; // default

    status = (_product.properties['review-status'] || status).toLowerCase();

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
        url = '';

    if (_product) {
      contents = _product.contents;

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
    _product = null;

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

    h3.innerHTML = h3.textContent + bubble;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Pager;
