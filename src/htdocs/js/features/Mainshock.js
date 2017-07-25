'use strict';


var Earthquakes = require('features/Earthquakes');


var Mainshock = function (options) {
  var _this,
      _initialize,

      _earthquakes;


  _this = {};

  _initialize = function (options) {
    var id = 'mainshock';

    options = options || {};
    options.id = id;

    _earthquakes = Earthquakes(options);

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
    return _earthquakes.mapLayer;
  };

  /**
   * Get plot data of feature
   *
   * @return {Array}
   */
  _this.getPlotData = function () {

  };

  /**
   * Get summary of feature
   *
   * @return summary {Html}
   */
  _this.getSummary = function () {
    // Earthquake data is stored in Earthquakes instance (where it was parsed)
    return _earthquakes.getSummary();
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Mainshock;
