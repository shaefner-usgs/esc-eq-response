'use strict';


var AppUtil = require('AppUtil'),
    Earthquakes = require('features/util/Earthquakes');


/**
 * Create Mainshock Feature
 *
 * @param options {Object}
 *   {
 *     app: {Object}, // Application
 *     eqid: {String} // Mainshock event id
 *   }
 *
 * @return _this {Object}
 *   {
 *     destroy: {Function},
 *     id: {String},
 *     initFeature: {Function},
 *     mapLayer: {L.layer},
 *     name: {String},
 *     plotTraces: {Object},
 *     showLayer: {Boolean},
 *     summary: {String},
 *     url: {String},
 *     zoomToLayer: {Boolean}
 *   }
 */
var Mainshock = function (options) {
  var _this,
      _initialize,

      _app,
      _eqid,
      _Earthquakes,

      _getFeedUrl,
      _getSummary;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _eqid = options.eqid;

    _this.id = 'mainshock';
    _this.name = 'Mainshock';
    _this.showLayer = true;
    _this.url = _getFeedUrl();
    _this.zoomToLayer = true;
  };

  /**
   * Get URL of json feed
   *
   * @return {String}
   */
  _getFeedUrl = function () {
    return 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/' +
      _eqid + '.geojson';
  };

  /**
   * Get summary HTML
   *
   * @return summary {String}
   */
  _getSummary = function () {
    var cdi,
        imgSrc,
        mmi,
        products,
        summary,
        url;

    products = _this.json.properties.products;
    url = 'https://earthquake.usgs.gov/earthquakes/eventpage/' + _eqid;

    summary = '<div>';
    summary += '<div class="products">';
    summary += _Earthquakes.mapLayer.getLayers()[0].getPopup().getContent();

    // Add DYFI, ShakeMap thumbs
    if (products.dyfi) {
      cdi = AppUtil.romanize(_this.json.properties.cdi);
      imgSrc = products.dyfi[0].contents[products.dyfi[0].code + '_ciim_geo.jpg'].url;
      summary += '<div class="dyfi two-up"><a href="' + url + '/dyfi">' +
        '<h4>Did You Feel It?</h4><img src="' + imgSrc + '" class="mmi' + cdi +
        '" /></a></div>';
    }
    if (products.shakemap) {
      if (products.shakemap[0].contents['download/tvmap.jpg']) {
        imgSrc = products.shakemap[0].contents['download/tvmap.jpg'].url;
      } else if (products.shakemap[0].contents['download/intensity.jpg'].url) {
        imgSrc = products.shakemap[0].contents['download/intensity.jpg'].url;
      }
      mmi = AppUtil.romanize(_this.json.properties.mmi);
      summary += '<div class="shakemap two-up"><a href="' + url +
        '/shakemap"><h4>ShakeMap</h4><img src="' + imgSrc + '" class="mmi' +
        mmi + '" /></a></div>';
    }

    // Add placeholders for beachballs
    summary += '<div class="focal-mechanism hide two-up"></div>';
    summary += '<div class="moment-tensor hide two-up"></div>';
    summary += '</div>'; // .products div

    // Add placeholder for Population Exposure table
    summary += '<div class="pager-cities hide"></div>';
    summary += '</div>'; // parent div

    return summary;
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
    _eqid = null;
    _Earthquakes = null;

    _getFeedUrl = null;
    _getSummary = null;

    _this = null;
  };

  /**
   * Create Feature - set properties that depend on external feed data
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

    _this.localTime = _Earthquakes.localTime;
    _this.mapLayer = _Earthquakes.mapLayer;
    _this.plotTraces = _Earthquakes.plotTraces;
    _this.summary = _getSummary();
    _this.utcTime = _Earthquakes.utcTime;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Mainshock;
