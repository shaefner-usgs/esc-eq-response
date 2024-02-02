/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
    Lightbox = require('util/Lightbox'),
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
 *       data: {Object}
 *       dependencies: {Array}
 *       destroy: {Function}
 *       id: {String}
 *       lightbox: {Mixed <Object|null>}
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
      _getBubble,
      _getContent,
      _getData,
      _getStatus,
      _getUrl;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;
    _mainshock = _app.Features.getMainshock();
    _product = _mainshock.data.eq.products?.losspager?.[0] || {};

    _this.data = {};
    _this.dependencies = [
      'pager-cities',
      'pager-exposures'
    ];
    _this.id = 'pager';
    _this.lightbox = null;
    _this.name = 'PAGER';
    _this.url = _getUrl();

    if (_this.url) {
      _fetch();
    } else if (!AppUtil.isEmpty(_product)) {
      _this.render(); // no feed data => render immediately
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
   * Get the HTML content for the external link bubble.
   *
   * @return {String}
   */
  _getBubble = function () {
    return L.Util.template(
      '<a href="{url}" class="pager-alertlevel-{alert} impact-bubble" ' +
        'target="new">' +
        '<strong class="roman">{alert}</strong>' +
      '</a>',
      _this.data
    );
  };

  /**
   * Get the HTML content for the Lightbox.
   *
   * @return {String}
   */
  _getContent = function () {
    var exposures = _app.Features.getFeature('pager-exposures'),
        summary = '',
        table = '';

    if (_this.data.effects || _this.data.structures) {
      summary = '<h4>Summary</h4><p>{structures} {effects}</p>';
    }

    if (_app.Features.isFeature(exposures)) {
      table = exposures.content.replace('<h3>Population Exposure</h3>', '');
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
        _app.Features.getTimeStamp(_this.data) +
      '</dl>',
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
    var contents = _product.contents || {},
        millisecs = Number(_product.updateTime) || 0,
        datetime = Luxon.DateTime.fromMillis(millisecs),
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
      isoTime: datetime.toUTC().toISO(),
      status: _getStatus(),
      structures: json.struct_comment || '',
      url: eq.url + '/pager',
      userTime: datetime.toFormat(_app.dateFormat),
      utcOffset: Number(datetime.toFormat('Z')),
      utcTime: datetime.toUTC().toFormat(_app.dateFormat)
    };
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
   * Destroy this Class.
   */
  _this.destroy = function () {
    _this.lightbox?.destroy();

    _initialize = null;

    _app = null;
    _mainshock = null;
    _product = null;

    _fetch = null;
    _getBubble = null;
    _getContent = null;
    _getData = null;
    _getStatus = null;
    _getUrl = null;

    _this = null;
  };

  /**
   * Render the Feature.
   *
   * @param json {Object} optional; default is {}
   */
  _this.render = function (json = {}) {
    var selectors = [
      '.pager-loss.feature',
      '.pager-exposures.feature',
      '.pager.feature'
    ].join(',');

    if (AppUtil.isEmpty(_this.data)) { // initial render
      _this.data = _getData(json);
    } else {
      _this.lightbox?.destroy();
    }

    _this.lightbox = Lightbox({
      content: _getContent(),
      id: _this.id,
      targets: document.querySelectorAll(selectors),
      title: _this.name + _getBubble()
    }).render();
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Pager;
