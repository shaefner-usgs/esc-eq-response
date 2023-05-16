/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
    Luxon = require('luxon');


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
      _getData,
      _getLightbox,
      _getStatus,
      _getUrl;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;
    _mainshock = _app.Features.getFeature('mainshock');
    _product = _mainshock.data.eq.products?.losspager?.[0] || {};

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
    } else if (!AppUtil.isEmpty(_product)) { // has PAGER, but no feed data
      _this.data = _getData();
      _this.lightbox = _getLightbox();

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
   * Get the data used to create the content.
   *
   * @param json {Object} default is {}
   *
   * @return {Object}
   */
  _getData = function (json = {}) {
    var contents = _product.contents || {},
        millis = Number(_product.updateTime) || 0,
        datetime = Luxon.DateTime.fromMillis(millis),
        eq = _mainshock.data.eq,
        pagerCities = _app.Features.getFeature('pager-cities'),
        pagerExposures = _app.Features.getFeature('pager-exposures');

    return {
      alert: eq.alert,
      cities: pagerCities.data,
      cost: contents['alertecon.png']?.url || '',
      costBlurb: json.impact1 || '',
      effects: json.secondary_comment || '',
      exposure: contents['exposure.png']?.url || '',
      exposures: pagerExposures.data,
      fatal: contents['alertfatal.png']?.url || '',
      fatalBlurb: json.impact2 || '',
      isoTime: datetime.toUTC().toISO() || '',
      status: _getStatus(),
      structures: json.struct_comment || '',
      url: eq.url + '/pager',
      userTime: datetime.toFormat(_app.dateFormat),
      utcOffset: Number(datetime.toFormat('Z')),
      utcTime: datetime.toUTC().toFormat(_app.dateFormat)
    };
  };

  /**
   * Get the HTML content for the Lightbox.
   *
   * @return {String}
   */
  _getLightbox = function () {
    var exposures = _app.Features.getFeature('pager-exposures'),
        summary = '',
        table = '';

    if (_this.data.effects || _this.data.structures) {
      summary = '<h4>Summary</h4><p>{structures} {effects}</p>';
    }
    if (_app.Features.isFeature(exposures)) {
      table = exposures.summary.replace('<h3>Population Exposure</h3>', '');
    }

    return L.Util.template(
      summary +
      '<div class="wrapper">' +
        '<div class="loss">' +
          '<h4>Estimated Fatalities</h4>' +
          '<img src="{fatal}" alt="Estimated fatalities histogram">' +
          '<p>{fatalBlurb}</p>' +
          '<h4>Estimated Economic Losses</h4>' +
          '<img src="{cost}" alt="Estimated economic losses histogram">' +
          '<p>{costBlurb}</p>' +
        '</div>' +
        '<div class="exposure">' +
          '<h4>Estimated Population Exposure</h4>' +
          '<div>' +
            table +
            '<div>' +
              '<img src="{exposure}" alt="Population exposure map">' +
              '<p>Population per ~1 sq. km. from LandScan</p>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<dl class="props">' +
        '<dt>Status</dt>' +
        '<dd class="status">{status}</dd>' +
        '<dt>Updated</dt>' +
        '<dd>' +
          '<time datetime="{isoTime}" class="user">{userTime} ' +
            '(UTC{utcOffset})</time>' +
          '<time datetime="{isoTime}" class="utc">{utcTime} (UTC)</time>' +
        '</dd>' +
      '</dl>',
      _this.data
    );
  };

  /**
   * Get the review status.
   *
   * @return status {String}
   */
  _getStatus = function () {
    var status = 'not reviewed'; // default

    status = (_product.properties?.['review-status'] || status).toLowerCase();

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
    var contents = _product.contents || {},
        url = '';

    if (contents['json/comments.json']) {
      url = contents['json/comments.json'].url || '';
    }

    return url;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add the JSON feed data.
   *
   * @param json {Object} default is {}
   */
  _this.addData = function (json = {}) {
    _this.data = _getData(json);
    _this.lightbox = _getLightbox();
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

    _getData = null;
    _getLightbox = null;
    _getStatus = null;
    _fetch = null;
    _getUrl = null;

    _this = null;
  };

  /**
   * Add the alert bubble.
   */
  _this.render = function () {
    var bubble = L.Util.template(
          '<a href="{url}" class="pager-alertlevel-{alert} impact-bubble" ' +
            'target="new">' +
            '<strong class="roman">{alert}</strong>' +
          '</a>',
          _this.data
        ),
        h3 = document.getElementById(_this.id).querySelector('h3');

    h3.innerHTML = _this.name + bubble;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Pager;
