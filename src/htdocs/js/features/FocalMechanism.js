/* global L */
'use strict';


var BeachBall = require('features/util/BeachBall');

require('mappane/CanvasMarker');


/**
 * Create Focal Mechanism Feature
 *
 * @param options {Object}
 *   {
 *     app: {Object}, // Application
 *     eqid: {String} // Mainshock event id
 *   }
 *
 * @return _this {Object}
 *   {
 *     destroy: {Function},
 *     id: {String},
 *     initFeature: {Function},
 *     mapLayer: {L.layer},
 *     name: {String},
 *     showLayer: {Boolean},
 *     summary: {String},
 *     zoomToLayer: {Boolean}
 *   }
 */
var FocalMechanism = function (options) {
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

    _this.id = 'focal-mechanism';
    _this.name = 'Focal Mechanism';
    _this.showLayer = false;
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

    focalMechanism = _mainshock.json.properties.products['focal-mechanism'];

    if (focalMechanism) {
      beachball = BeachBall({
        className: _this.id,
        data: focalMechanism[0].properties,
        fillColor: '#ffaa69',
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
        mainshock,
        mapLayer,
        popup,
        size,
        tooltip;

    size = 40;
    beachball = _getBeachBall(size);

    if (beachball) {
      // Render beachball (hidden via css and shown when layer is turned on)
      beachball.render(document.querySelector('#mapPane'));

      coords = [
        _mainshock.json.geometry.coordinates[1],
        _mainshock.json.geometry.coordinates[0]
      ];

      // Get popup, tooltip content from mainshock Feature
      _app.Features.getFeature('mainshock').mapLayer.eachLayer(function(layer) {
        mainshock = layer; // only 1 layer in FeatureGroup
      });
      popup = mainshock.getPopup().getContent();
      tooltip = mainshock.getTooltip().getContent();

      mapLayer = L.canvasMarker(coords, {
        icon: L.divIcon({
          className: _this.id,
          iconSize: L.point(size, size)
        }),
        pane: _this.id // put marker in custom Leaflet map pane
      });
      mapLayer.bindPopup(popup, {
        autoPanPaddingTopLeft: L.point(50, 50),
        autoPanPaddingBottomRight: L.point(60, 40),
        maxWidth: 350,
        minWidth: 250
      }).bindTooltip(tooltip);
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
        '/focal-mechanism';
      summary = '<a href="' + url + '"><h4>' + _this.name + '</h4></a>';
    }

    return summary;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Destroy this Class to aid in garbage collection
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;
    _eqid = null;
    _mainshock = null;

    _getBeachBall = null;
    _getMapLayer = null;
    _getSummary = null;

    _this = null;
  };

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


module.exports = FocalMechanism;
