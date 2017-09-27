/* global L */
'use strict';


var MomentTensor = require('beachballs/MomentTensor'),
    Util = require('hazdev-webutils/src/util/Util');


L.CanvasMarker = L.Marker.extend({
  initialize: function (latlng, options) {
    L.Util.setOptions(this, options);
    L.Marker.prototype.initialize.call(this, latlng, this.options);
  },

  onAdd: function(map) {
    var canvas,
        className,
        markerDiv;

    L.Marker.prototype.onAdd.call(this, map);

    className = this.options.icon.options.className;
    canvas = document.querySelector('#mapPane canvas.' + className);
    markerDiv = document.querySelector('.leaflet-marker-icon.' + className + ' div');

    markerDiv.appendChild(canvas);
  },

  onRemove: function(map) {
    var canvas,
        className;

    className = this.options.icon.options.className;
    canvas = document.querySelector('.leaflet-marker-icon.' + className + ' canvas');

    document.querySelector('#mapPane').appendChild(canvas);

    L.Marker.prototype.onRemove.call(this, map);
  }
});

L.canvasMarker = function(latlng, options) {
  return new L.CanvasMarker(latlng, options);
};

var MomentTensorLayer = function (options) {
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

    _createLayer();
  };

  _createLayer = function () {
    var beachball,
        coords,
        size;

    size = 30;

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
        html: '<div></div>',
        iconSize: L.point(size, size)
      }),
      pane: _this.id
    });
    _mapLayer.id = _this.id; // Attach id to L.Layer for layer controller
  };

  /**
   * Get moment tensor beachball
   *
   * @return beachball {Object}
   */
  _getBeachBall = function (opts) {
    var beachball;

    opts = Util.extend({}, {
      data: _json
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
  // _this.getSummaryData = function () {
  //   return _getBeachBall();
  // };

  _initialize(options);
  options = null;
  return _this;
};


module.exports = MomentTensorLayer;
