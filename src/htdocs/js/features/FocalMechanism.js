/* global L */
'use strict';


var FocalMechanismUtil = require('features/util/FocalMechanism');

require('features/util/CanvasMarker');


/**
 * Creates Focal Mechanism feature
 *
 * @param options {Object}
 *   {
 *     app: {Object}, // application props / methods
 *     eqid: {String} // mainshock event id
 *   }
 */
var FocalMechanism = function (options) {
  var _this,
      _initialize,

      _app,
      _mainshock,

      _getBeachBall,
      _getMapLayer,
      _getSummary;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _mainshock = _app.Features.getFeature('mainshock');

    _this.displayLayer = false;
    _this.id = 'focal-mechanism';
    _this.name = 'Focal Mechanism';
    _this.zoomToLayer = false;
  };

  /**
   * Get focal mechanism beachball
   *
   * @param size {Number}
   *
   * @return beachball {Object}
   */
  _getBeachBall = function (size) {
    var beachball,
        focalMechanism;

    focalMechanism = _mainshock.json.properties.products['focal-mechanism'][0];

    if (focalMechanism) {
      beachball = FocalMechanismUtil({
        className: _this.id,
        data: focalMechanism.properties,
        size: size
      });
    }

    return beachball;
  };

  /**
   * Create Leaflet map layer
   *
   * @return mapLayer {L.layer}
   */
  _getMapLayer = function () {
    var beachball,
        coords,
        mapLayer,
        size;

    size = 40;

    // Render beachball under map (hidden by css)
    beachball = _getBeachBall(size);
    beachball.render(document.querySelector('#mapPane'));

    coords = [
      _mainshock.json.geometry.coordinates[1],
      _mainshock.json.geometry.coordinates[0]
    ];

    mapLayer = L.canvasMarker(coords, {
      icon: L.divIcon({
        className: _this.id,
        iconSize: L.point(size, size)
      }),
      pane: _this.id // // put marker in custom Leaflet map pane
    });

    return mapLayer;
  };

  _getSummary = function () {
    return _getBeachBall(180);
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Create feature (map layer, plot data, summary)
   *   invoked via Ajax callback in Features.js after json feed is loaded
   */
  _this.createFeature = function () {
    _this.mapLayer = _getMapLayer();
    _this.summary = _getSummary();
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = FocalMechanism;
