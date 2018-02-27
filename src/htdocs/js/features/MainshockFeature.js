'use strict';


var Earthquakes = require('features/Earthquakes');


/**
 * Creates Mainshock feature
 *
 * @param options {Object}
 *   {
 *     json: {Object}, // geojson data for feature
 *     mainshockJson: {Object}, // mainshock geojson: magnitude, time, etc.
 *     name: {String} // layer name
 *   }
 */
var Mainshock = function (options) {
  var _this,
      _initialize,

      _earthquakes,
      _mainshockJson;


  _this = {};

  _initialize = function (options) {
    // Unique id; note that value is "baked into" app's js/css
    var id = 'mainshock';

    options = options || {};

    _mainshockJson = options.mainshockJson;

    _earthquakes = Earthquakes({
      id: id,
      json: options.json,
      mainshockJson: _mainshockJson
    });

    _this.displayLayer = true;
    _this.id = id;
    _this.name = options.name;
    _this.zoomToLayer = true;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Get map layer of feature
   *
   * @return {L.FeatureGroup}
   */
  _this.getMapLayer = function () {
    return _earthquakes.getMapLayer();
  };

  /**
   * Get feature's data for plots pane
   *
   * @return {Object}
   */
  _this.getPlotData = function () {
    return {
      plotdata: _earthquakes.getPlotData()
    };
  };

  /**
   * Get feature's data for summary pane
   *
   * @return {Object}
   */
  _this.getSummaryData = function () {
    var dyfi,
        eqid,
        products,
        shakemap;

    eqid = _mainshockJson.id;
    products = _mainshockJson.properties.products;

    if (products.dyfi) {
      dyfi = products.dyfi[0].contents[eqid + '_ciim_geo.jpg'].url;
    }
    if (products.shakemap) {
      shakemap = products.shakemap[0].contents['download/tvmap.jpg'].url;
    }

    return {
      detailsHtml: _earthquakes.getDetails(),
      dyfi: dyfi,
      shakemap: shakemap
    };
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Mainshock;
