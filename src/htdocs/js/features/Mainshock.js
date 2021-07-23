/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
    Earthquakes = require('features/util/Earthquakes');


/**
 * Create Mainshock Feature.
 *
 * @param options {Object}
 *   {
 *     app: {Object} Application
 *   }
 *
 * @return _this {Object}
 *   {
 *     addListener: {Function}
 *     create: {Function}
 *     details: {Object}
 *     destroy: {Function}
 *     getFeedUrl: {Function}
 *     id: {String}
 *     json: {Object}
 *     mapLayer: {L.Layer}
 *     name: {String}
 *     plotTraces: {Object}
 *     reset: {Function}
 *     showLayer: {Boolean}
 *     summary: {String}
 *     zoomToLayer: {Boolean}
 *   }
 */
var Mainshock = function (options) {
  var _this,
      _initialize,

      _app,
      _eqid,
      _Earthquakes,

      _createSummary,
      _setDyfiProps,
      _setShakeMapProps;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;

    _this.id = 'mainshock';
    _this.mapLayer = null;
    _this.name = 'Mainshock';
    _this.plotTraces = null;
    _this.showLayer = true;
    _this.summary = null;
    _this.zoomToLayer = true;
  };

  /**
   * Create summary HTML.
   *
   * @return html {String}
   */
  _createSummary = function () {
    var data,
        html,
        products;

    data = {
      cdi: AppUtil.romanize(_this.json.properties.cdi),
      mainshock: _this.mapLayer.getLayers()[0].getPopup().getContent(),
      mmi: AppUtil.romanize(_this.json.properties.mmi),
      url: 'https://earthquake.usgs.gov/earthquakes/eventpage/' + _eqid
    };
    products = _this.json.properties.products;

    _setDyfiProps(data, products.dyfi);
    _setShakeMapProps(data, products.shakemap);

    html = L.Util.template(
      '<div>' +
        '<div class="products">' +
          '{mainshock}' +
          '{dyfi}' +
          '{shakemap}' +
          '<div class="focal-mechanism placeholder hide two-up"></div>' +
          '<div class="moment-tensor placeholder hide two-up"></div>' +
        '</div>' +
        '<div class="pager-exposures placeholder hide"></div>' +
      '</div>' +
      '<button class="event-summary" disabled="disabled" ' +
        'title="Download RTF Document" type="button">Event Summary' +
      '</button>',
      data
    );

    return html;
  };

  /**
   * Set Did You Feel It? properties for summary HTML.
   *
   * @param data {Object}
   * @param dyfi {Array}
   */
  _setDyfiProps = function (data, dyfi) {
    if (dyfi) {
      data.dyfiImg = dyfi[0].contents[dyfi[0].code + '_ciim_geo.jpg'].url;
      data.dyfi = L.Util.template(
        '<div class="dyfi two-up">' +
          '<a href="{url}/dyfi">' +
            '<h4>Did You Feel It?</h4>' +
            '<img src="{dyfiImg}" class="mmi{cdi}" />' +
          '</a>' +
        '</div>',
        data
      );
    } else {
      data.dyfi = '';
    }
  };

  /**
   * Set ShakeMap properties for summary HTML.
   *
   * @param data {Object}
   * @param shakemap {Array}
   */
  _setShakeMapProps = function (data, shakemap) {
    if (shakemap) {
      if (shakemap[0].contents['download/tvmap.jpg']) {
        data.shakemapImg = shakemap[0].contents['download/tvmap.jpg'].url;
      } else if (shakemap[0].contents['download/intensity.jpg'].url) {
        data.shakemapImg = shakemap[0].contents['download/intensity.jpg'].url;
      }

      data.shakemap = L.Util.template(
        '<div class="shakemap two-up">' +
          '<a href="{url}/shakemap">' +
            '<h4>ShakeMap</h4>' +
            '<img src="{shakemapImg}" class="mmi{mmi}" />' +
          '</a>' +
        '</div>',
        data
      );
    } else {
      data.shakemap = '';
    }
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add event listener for download button.
   */
  _this.addListener = function () {
    var button = document.querySelector('.event-summary');

    button.addEventListener('click', () => {
      _app.Feeds.loadFeeds(); // load external feed data for RTF Summary
    });
  };

  /**
   * Create Feature (set properties that depend on external feed data).
   *
   * @param json {Object}
   *     feed data for Feature
   */
  _this.create = function (json) {
    _Earthquakes = Earthquakes({
      app: _app,
      id: _this.id,
      json: json
    });

    _this.details = _Earthquakes.list[0];
    _this.json = json; // used by other Features
    _this.mapLayer = _Earthquakes.mapLayer;
    _this.plotTraces = _Earthquakes.plotTraces;
    _this.summary = _createSummary();
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;
    _eqid = null;
    _Earthquakes = null;

    _createSummary = null;

    _this = null;
  };

  /**
   * Get the JSON feed's URL.
   *
   * @return {String}
   */
  _this.getFeedUrl = function () {
    _eqid = AppUtil.getParam('eqid');

    return `https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/${_eqid}.geojson`;
  };

  /**
   * Reset to initial state.
   */
  _this.reset = function () {
    _this.mapLayer = null;
    _this.plotTraces = null;
    _this.summary = null;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Mainshock;
