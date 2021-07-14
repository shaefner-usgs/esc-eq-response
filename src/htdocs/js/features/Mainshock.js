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
 *     eqid: {String} Mainshock event id
 *   }
 *
 * @return _this {Object}
 *   {
 *     addListener: {Function}
 *     destroy: {Function}
 *     details: {Object}
 *     id: {String}
 *     initFeature: {Function}
 *     json: {Object}
 *     mapLayer: {L.Layer}
 *     name: {String}
 *     plotTraces: {Object}
 *     showLayer: {Boolean}
 *     summary: {String}
 *     url: {String}
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
      _getFeedUrl;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _eqid = options.eqid;

    _this.id = 'mainshock';
    _this.mapLayer = null;
    _this.name = 'Mainshock';
    _this.plotTraces = null;
    _this.showLayer = true;
    _this.summary = null;
    _this.url = _getFeedUrl();
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
      dyfi: '',
      mainshock: _this.mapLayer.getLayers()[0].getPopup().getContent(),
      mmi: AppUtil.romanize(_this.json.properties.mmi),
      shakemap: '',
      url: 'https://earthquake.usgs.gov/earthquakes/eventpage/' + _eqid
    };
    products = _this.json.properties.products;

    if (products.dyfi) {
      data.dyfiImg = products.dyfi[0].contents[products.dyfi[0].code + '_ciim_geo.jpg'].url;
      data.dyfi = L.Util.template(
        '<div class="dyfi two-up">' +
          '<a href="{url}/dyfi">' +
            '<h4>Did You Feel It?</h4>' +
            '<img src="{dyfiImg}" class="mmi{cdi}" />' +
          '</a>' +
        '</div>',
        data
      );
    }

    if (products.shakemap) {
      if (products.shakemap[0].contents['download/tvmap.jpg']) {
        data.shakemapImg = products.shakemap[0].contents['download/tvmap.jpg'].url;
      } else if (products.shakemap[0].contents['download/intensity.jpg'].url) {
        data.shakemapImg = products.shakemap[0].contents['download/intensity.jpg'].url;
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
    }

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
   * Get URL of JSON feed.
   *
   * @return {String}
   */
  _getFeedUrl = function () {
    return `https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/${_eqid}.geojson`;
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
      _app.Feeds.reset();
      _app.Feeds.instantiateFeeds(); // load external feed data for RTF Summary
    });
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;
    _eqid = null;
    _Earthquakes = null;

    _getFeedUrl = null;
    _createSummary = null;

    _this = null;
  };

  /**
   * Initialize Feature (set properties that depend on external feed data).
   *
   * @param json {Object}
   *     feed data for Feature
   */
  _this.initFeature = function (json) {
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


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Mainshock;
