'use strict';


var Earthquakes = require('features/util/Earthquakes');


/**
 * Create Mainshock feature
 *
 * @param options {Object}
 *   {
 *     app: {Object}, // application props / methods
 *     eqid: {String} // mainshock event id
 *   }
 */
var MainshockFeature = function (options) {
  var _this,
      _initialize,

      _app,
      _eqid,
      _Earthquakes,

      _getSummary;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _eqid = options.eqid;

    _this.displayLayer = true;
    _this.id = 'mainshock';
    _this.name = 'Mainshock';
    _this.url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/' +
      _eqid + '.geojson';
    _this.zoomToLayer = true;
  };

  /**
   * Get summary html for feature
   */
  _getSummary = function () {
    var baseUrl,
        cdi,
        imgSrc,
        mmi,
        products,
        summary;

    baseUrl = 'https://earthquake.usgs.gov/earthquakes/eventpage/' + _eqid;
    products = _this.json.properties.products;
    summary = '<div class="products">';
    summary += _Earthquakes.mapLayer.getLayers()[0].getPopup().getContent();

    // Add placeholders for beachballs
    summary += '<div class="focal-mechanism hide scale"></div>';
    summary += '<div class="moment-tensor hide scale"></div>';

    if (products.dyfi) {
      cdi = _app.AppUtil.romanize(_this.json.properties.cdi);
      imgSrc = products.dyfi[0].contents[products.dyfi[0].code + '_ciim_geo.jpg'].url;
      summary += '<div class="dyfi scale"><a href="' + baseUrl + '/dyfi">' +
        '<h4>Did You Feel It?</h4><img src="' + imgSrc + '" class="mmi' + cdi +
        '" /></a></div>';
    }
    if (products.shakemap) {
      if (products.shakemap[0].contents['download/tvmap.jpg']) {
        imgSrc = products.shakemap[0].contents['download/tvmap.jpg'].url;
      } else if (products.shakemap[0].contents['download/intensity.jpg'].url) {
        imgSrc = products.shakemap[0].contents['download/intensity.jpg'].url;
      }
      mmi = _app.AppUtil.romanize(_this.json.properties.mmi);
      summary += '<div class="shakemap scale"><a href="' + baseUrl +
        '/shakemap"><h4>ShakeMap</h4><img src="' + imgSrc + '" class="mmi' +
        mmi + '" /></a></div>';
    }

    summary += '</div>';

    return summary;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Create feature (map layer, plot data, summary)
   *   invoked via Ajax callback in Features.js after json feed is loaded
   */
  _this.createFeature = function (json) {
    _Earthquakes = Earthquakes({
      app: _app,
      feature: _this,
      json: json
    });

    _this.mapLayer = _Earthquakes.mapLayer;
    _this.plotTraces = _Earthquakes.plotTraces;
    _this.summary = _getSummary();
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = MainshockFeature;
