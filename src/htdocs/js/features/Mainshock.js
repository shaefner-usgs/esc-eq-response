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

      _earthquakes;


  _this = {};

  _initialize = function (options) {
    // Unique id; note that value is "baked into" app's js/css
    var id = 'mainshock';

    options = options || {};

    _earthquakes = Earthquakes({
      id: id,
      json: options.json,
      mainshockJson: options.mainshockJson
    });

    _this.displayLayer = true;
    _this.id = id;
    _this.name = options.name;
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
    return {
      detailsHtml: _earthquakes.getDetails()
    };
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Mainshock;
