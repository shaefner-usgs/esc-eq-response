'use strict';


var Earthquakes = require('features/Earthquakes');


var Historical = function (options) {
  var _this,
      _initialize,

      _earthquakes,

      _getName;


  _this = {};

  _initialize = function (options) {
    var id = 'historical';

    options = options || {};
    options.id = id;

    _earthquakes = Earthquakes(options);

    _this.id = id;
    _this.name = _getName();
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
    return _earthquakes.mapLayer;
  };

  /**
   * Get summary data of feature
   *
   * @return {Object}}
   */
  _this.getSummaryData = function () {
    return {
      bins: _earthquakes.getBinnedData(),
      details: _earthquakes.getDetails(),
      list : _earthquakes.getList()
    };
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Historical;
