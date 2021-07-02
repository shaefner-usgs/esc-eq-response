/* global L */
'use strict';


var BeachBall = require('features/util/BeachBall');

require('leaflet/CanvasMarker');


/**
 * Create Focal Mechanism Feature.
 *
 * @param options {Object}
 *   {
 *     app: {Object} Application
 *     eqid: {String} Mainshock event id
 *   }
 *
 * @return _this {Object}
 *   {
 *     beachball: {Element}
 *     destroy: {Function}
 *     id: {String}
 *     initFeature: {Function}
 *     mapLayer: {L.Layer}
 *     name: {String}
 *     showLayer: {Boolean}
 *     summary: {String}
 *     zoomToLayer: {Boolean}
 *   }
 */
var FocalMechanism = function (options) {
  var _this,
      _initialize,

      _app,
      _eqid,
      _mainshock,

      _createBeachBall,
      _createMapLayer,
      _createSummary;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _eqid = options.eqid;
    _mainshock = _app.Features.getFeature('mainshock');

    _this.id = 'focal-mechanism';
    _this.mapLayer = null;
    _this.name = 'Focal Mechanism';
    _this.showLayer = false;
    _this.summary = null;
    _this.zoomToLayer = false;
  };

  /**
   * Create beachball.
   *
   * @param size {Number}
   *
   * @return beachball {Object || null}
   */
  _createBeachBall = function (size) {
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
   * Create Leaflet map layer.
   *
   * @return mapLayer {L.layer}
   */
  _createMapLayer = function () {
    var beachball,
        coords,
        mapLayer,
        popup,
        size,
        tooltip;

    size = 40;
    beachball = _createBeachBall(size);

    if (beachball) {
      coords = [
        _mainshock.json.geometry.coordinates[1],
        _mainshock.json.geometry.coordinates[0]
      ];

      // Get popup, tooltip from Mainshock (FeatureGroup contains only 1 layer)
      _app.Features.getFeature('mainshock').mapLayer.eachLayer(layer => {
        popup = layer.getPopup().getContent();
        tooltip = layer.getTooltip().getContent();
      });

      // Render (hidden) beachball to MapPane for use by CanvasMarker
      beachball.render(document.getElementById('mapPane'));

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
        maxWidth: 375,
        minWidth: 250
      }).bindTooltip(tooltip);
    }

    return mapLayer;
  };

  /**
   * Create summary HTML.
   *
   * @return html {String}
   */
  _createSummary = function () {
    var html,
        url;

    html = '';

    if (_this.beachball) {
      url = 'https://earthquake.usgs.gov/earthquakes/eventpage/' + _eqid +
        '/focal-mechanism';
      html = '<a href="' + url + '"><h4>' + _this.name + '</h4></a>';
    }

    return html;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;
    _eqid = null;
    _mainshock = null;

    _createBeachBall = null;
    _createMapLayer = null;
    _createSummary = null;

    _this = null;
  };

  /**
   * Initialize Feature.
   */
  _this.initFeature = function () {
    _this.beachball = _createBeachBall(180);
    _this.mapLayer = _createMapLayer();
    _this.summary = _createSummary();
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = FocalMechanism;
