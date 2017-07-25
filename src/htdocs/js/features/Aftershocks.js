'use strict';


var AppUtil = require('AppUtil'),
    Earthquakes = require('features/Earthquakes'),
    Moment = require('moment');


var Aftershocks = function (options) {
  var _this,
      _initialize,

      _earthquakes,
      _mainshockJson,

      _getName;


  _this = {};

  _initialize = function (options) {
    var id = 'aftershocks';

    options = options || {};
    options.id = id;

    _earthquakes = Earthquakes(options);
    _mainshockJson = options.mainshockJson;

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
   * Get plot data of feature
   *
   * @return {Object}
   */
  _this.getPlotData = function () {
    return _earthquakes.getPlotData();
  };

  /**
   * Get summary of feature
   *
   * @return summary {Html}
   */
  _this.getSummary = function () {
    var description,
        duration,
        mainshockMoment,
        summary;

    mainshockMoment = Moment.utc(_mainshockJson.properties.time, 'x');
    duration = AppUtil.round(Moment.duration(Moment.utc() - mainshockMoment)
      .asDays(), 1);

    description = '<p><strong>M ' + AppUtil.getParam(_this.id + '-minmag') +
      '+ </strong> earthquakes <strong> within ' + AppUtil.getParam(_this.id +
      '-dist') + ' km</strong> of mainshock epicenter. The duration of the ' +
      'aftershock sequence is <strong>' + duration + ' days</strong>.</p>';

    // Earthquake data is stored in Earthquakes instance (where it was parsed)
    summary = _earthquakes.getSummary();

    return description + summary;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Aftershocks;
