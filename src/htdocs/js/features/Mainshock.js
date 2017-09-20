'use strict';


var Earthquakes = require('features/Earthquakes'),
    FocalMechanism = require('beachballs/FocalMechanism'),
    MomentTensor = require('beachballs/MomentTensor');


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
      _mainshockJson,

      _getFocalMechanism,
      _getMomentTensor;


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
  };

  /**
   * Get focal mechanism
   *
   * @return beachball {Object}
   */
  _getFocalMechanism = function () {
    var beachball,
        focalMechanism;

    focalMechanism = _mainshockJson.properties.products['focal-mechanism'];
    if (focalMechanism) {
      beachball = FocalMechanism({
        data: focalMechanism[0].properties
      });
    }

    return beachball;
  };

  /**
   * Get moment tensor
   *
   * @return beachball {Object}
   */
  _getMomentTensor = function () {
    var beachball,
        momentTensor;

    momentTensor = _mainshockJson.properties.products['moment-tensor'];
    if (momentTensor) {
      beachball = MomentTensor({
        data: momentTensor[0].properties
      });
    }

    return beachball;
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
      detailsHtml: _earthquakes.getDetails(),
      focalMechanism: _getFocalMechanism(),
      momentTensor: _getMomentTensor()
    };
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Mainshock;
