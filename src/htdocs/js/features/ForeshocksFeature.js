'use strict';


var AppUtil = require('AppUtil'),
    Earthquakes = require('features/Earthquakes');


/**
 * Creates Foreshocks feature
 *
 * @param options {Object}
 *   {
 *     json: {Object}, // geojson data for feature
 *     mainshockJson: {Object}, // mainshock geojson: magnitude, time, etc.
 *     name: {String} // layer name
 *   }
 */
var Foreshocks = function (options) {
  var _this,
      _initialize,

      _earthquakes,
      _magThreshold,

      _getName;


  _this = {};

  _initialize = function (options) {
    // Unique id; note that value is "baked into" app's js/css
    var id = 'foreshocks';

    options = options || {};

    _earthquakes = Earthquakes({
      id: id,
      json: options.json,
      mainshockJson: options.mainshockJson
    });
    _magThreshold = Math.floor(AppUtil.getParam('foreshocks-minmag'));

    _this.displayLayer = true;
    _this.id = id;
    _this.name = _getName();
    _this.zoomToLayer = true;
  };

  /**
   * Get layer name of feature (adds number of features to name)
   *
   * @return {String}
   */
  _getName = function () {
    return options.name + ' (' + options.json.metadata.count + ')';
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
   * Get feature's data for summary pane
   *
   * @return {Object}}
   */
  _this.getSummaryData = function () {
    return {
      bins: _earthquakes.getBinnedData(),
      detailsHtml: _earthquakes.getDetails(),
      list: _earthquakes.getList(),
      magThreshold: _magThreshold
    };
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Foreshocks;
