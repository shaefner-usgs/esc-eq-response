/* global L */
'use strict';


var MomentTensor = require('features/util/MomentTensor'),
    Util = require('hazdev-webutils/src/util/Util');

require('features/util/CanvasMarker');


/**
 * Creates Moment Tensor feature
 *
 * @param options {Object}
 *   {
 *     json: {Object}, // geojson data for feature
 *     mainshockJson: {Object}, // mainshock geojson: magnitude, time, etc.
 *     name: {String} // layer name
 *   }
 */
var MomentTensorFeature = function (options) {
  var _this,
      _initialize,

      _json,
      _mainshockJson,
      _mapLayer,

      _createLayer,
      _getBeachBall;


  _this = {};

  _initialize = function (options) {
    // Unique id; note that value is "baked into" app's js/css
    var id = 'moment-tensor';

    options = options || {};

    _mainshockJson = options.mainshockJson;
    _json = options.json;

    _this.displayLayer = false;
    _this.id = id;
    _this.name = options.name;
    _this.zoomToLayer = false;

    _createLayer();
  };

  /**
   * Create Leaflet Layer
   */
  _createLayer = function () {
    var beachball,
        coords,
        size;

    size = 40;

    // Render beachball under map for now (hidden by css)
    beachball = _getBeachBall({
      size: size,
      className: _this.id
    });
    beachball.render(document.querySelector('#mapPane'));

    coords = [
      _mainshockJson.geometry.coordinates[1],
      _mainshockJson.geometry.coordinates[0]
    ];

    _mapLayer = L.canvasMarker(coords, {
      icon: L.divIcon({
        className: _this.id,
        iconSize: L.point(size, size)
      }),
      pane: _this.id
    });
  };

  /**
   * Get moment tensor beachball for summary pane
   *
   * @return beachball {Object}
   */
  _getBeachBall = function (opts) {
    var beachball;

    opts = Util.extend({}, {
      data: _json,
      size: 180
    }, opts);
    beachball = MomentTensor(opts);

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
    return _mapLayer;
  };

  /**
   * Get feature's data for summary pane
   *
   * @return {Object}
   */
  _this.getSummaryData = function () {
    return _getBeachBall();
  };

  _initialize(options);
  options = null;
  return _this;
};


module.exports = MomentTensorFeature;
