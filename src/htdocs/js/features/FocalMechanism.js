/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
    BeachBall = require('features/util/BeachBall');


/**
 * Create Focal Mechanism Feature.
 *
 * @param options {Object}
 *   {
 *     app: {Object} Application
 *   }
 *
 * @return _this {Object}
 *   {
 *     beachball: {Element}
 *     create: {Function}
 *     destroy: {Function}
 *     id: {String}
 *     mapLayer: {L.Layer}
 *     name: {String}
 *     reset: {Function}
 *     showLayer: {Boolean}
 *     summary: {String}
 *     zoomToLayer: {Boolean}
 *   }
 */
var FocalMechanism = function (options) {
  var _this,
      _initialize,

      _app,
      _mainshock,

      _createBeachBall,
      _createMapLayer,
      _createSummary;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
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

      // Get popup, tooltip from Mainshock (a FeatureGroup with a single layer)
      _mainshock.mapLayer.eachLayer(layer => {
        popup = layer.getPopup().getContent();
        tooltip = layer.getTooltip().getContent();
      });

      // Render beachball (hidden by default) for use by CanvasMarker
      beachball.render(document.querySelector('#mapPane .content'));

      mapLayer = L.marker.canvas(coords, {
        icon: L.divIcon({
          className: _this.id,
          iconSize: L.point(size, size)
        }),
        pane: _this.id // put marker in custom Leaflet map pane
      });

      mapLayer.bindPopup(popup, {
        autoPanPaddingTopLeft: L.point(50, 130),
        autoPanPaddingBottomRight: L.point(50, 50),
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
    var eqid,
        html,
        url;

    eqid = AppUtil.getParam('eqid');
    html = '';

    if (_this.beachball) {
      url = `https://earthquake.usgs.gov/earthquakes/eventpage/${eqid}/focal-mechanism`;
      html = `<h4>${_this.name}</h4><a href="${url}"></a>`;
    }

    return html;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Create Feature.
   */
  _this.create = function () {
    _this.beachball = _createBeachBall(180);
    _this.mapLayer = _createMapLayer();
    _this.summary = _createSummary();
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;
    _mainshock = null;

    _createBeachBall = null;
    _createMapLayer = null;
    _createSummary = null;

    _this = null;
  };

  /**
   * Reset to initial state.
   */
  _this.reset = function () {
    _this.mapLayer = null;
    _this.summary = null;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = FocalMechanism;
