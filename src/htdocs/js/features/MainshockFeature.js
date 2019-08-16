'use strict';


var Earthquakes = require('features/Earthquakes');


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
      _Earthquakes,

      _getSummary;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;

    _this.displayLayer = true;
    _this.id = 'mainshock';
    _this.name = 'Mainshock';
    _this.url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/' +
      options.eqid + '.geojson';
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

    baseUrl = 'https://earthquake.usgs.gov/earthquakes/eventpage/' +
      _app.AppUtil.getParam('eqid');
    products = _this.json.properties.products;
    summary = '<div class="products">';
    summary += _Earthquakes.mapLayer.getLayers()[0].getPopup().getContent();

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

    // Add placeholders for beachballs
    summary += '<div class="focal-mechanism hide scale">' +
      '<a href="' + baseUrl + '/focal-mechanism"><h4></h4></a></div>';
    summary += '<div class="moment-tensor hide scale">' +
      '<a href="' + baseUrl + '/moment-tensor"><h4></h4></a></div>';

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
    _this.plotData = _Earthquakes.plotData;
    _this.summary = _getSummary();
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = MainshockFeature;
