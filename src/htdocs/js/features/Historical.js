'use strict';


var AppUtil = require('AppUtil'),
    Earthquakes = require('features/Earthquakes');


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

  /**
   * Get map layer of feature
   *
   * @return {L.FeatureGroup}
   */
  _this.getMapLayer = function () {
    return _earthquakes.mapLayer;
  };

  /**
   * Get summary of feature
   *
   * @return summary {Html}
   */
  _this.getSummary = function () {
    var description,
        summary;

    description = '<p><strong>M ' + AppUtil.getParam(_this.id + '-minmag') +
      '+ </strong> earthquakes <strong> within ' + AppUtil.getParam(_this.id +
      '-dist') + ' km</strong> of mainshock epicenter in the <strong>prior ' +
      AppUtil.getParam('historical-years') + ' years</strong>.</p>';

    // Earthquake data is stored in Earthquakes instance (where it was parsed)
    summary = _earthquakes.getSummary();

    return description + summary;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Historical;
