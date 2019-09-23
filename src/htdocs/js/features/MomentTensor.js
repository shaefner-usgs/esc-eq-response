/* global L */
'use strict';


var BeachBall = require('features/util/BeachBall');

require('mappane/CanvasMarker');


/**
 * Create Moment Tensor Feature
 *
 * @param options {Object}
 *   {
 *     app: {Object}, // Application
 *     eqid: {String} // Mainshock event id
 *   }
 */
var MomentTensor = function (options) {
  var _this,
      _initialize,

      _app,
      _eqid,
      _mainshock,

      _getBeachBall,
      _getMapLayer,
      _getSummary;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _eqid = options.eqid;
    _mainshock = _app.Features.getFeature('mainshock');

    _this.displayLayer = false;
    _this.id = 'moment-tensor';
    _this.name = 'Moment Tensor';
    _this.zoomToLayer = false;
  };

  /**
   * Get moment tensor beachball
   *
   * @param size {Number}
   *
   * @return beachball {Object}
   */
  _getBeachBall = function (size) {
    var beachball,
        momentTensor;

    momentTensor = _mainshock.json.properties.products['moment-tensor'];

    if (momentTensor) {
      beachball = BeachBall({
        className: _this.id,
        data: momentTensor[0].properties,
        fillColor: '#6ea8ff',
        size: size,
        type: _this.id
      });
    }

    return beachball;
  };

  /**
   * Get Leaflet map layer
   *
   * @return mapLayer {L.layer}
   */
  _getMapLayer = function () {
    var beachball,
        coords,
        mapLayer,
        size;

    size = 40;
    beachball = _getBeachBall(size);

    if (beachball) {
      // Render beachball (hidden via css and shown when layer is turned on)
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
        pane: _this.id // put marker in custom Leaflet map pane
      });
    }

    return mapLayer;
  };

  /**
   * Get summary HTML
   *
   * @return summary {String}
   */
  _getSummary = function () {
    var beachball,
        summary,
        url;

    beachball = _getBeachBall(180);
    if (beachball) {
      // Immediately render beachball (which is initially hidden via css)
      //   it will be moved into place (and unhidden) once summary is added
      beachball.render(document.querySelector('#summaryPane'));

      url = 'https://earthquake.usgs.gov/earthquakes/eventpage/' + _eqid +
        '/moment-tensor';
      summary = '<a href="' + url + '"><h4>' + _this.name + '</h4></a>';
    }

    return summary;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Create Feature
   */
  _this.initFeature = function () {
    _this.mapLayer = _getMapLayer();
    _this.summary = _getSummary();
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = MomentTensor;
