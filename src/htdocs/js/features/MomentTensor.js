'use strict';


var BeachBall = require('features/util/BeachBall');


/**
 * Create Moment Tensor Feature.
 *
 * @param options {Object}
 *   {
 *     app: {Object} Application
 *   }
 *
 * @return _this {Object}
 *   {
 *     create: {Function}
 *     destroy: {Function}
 *     id: {String}
 *     lightbox: {String}
 *     mapLayer: {L.Layer}
 *     name: {String}
 *     render: {Function}
 *     reset: {Function}
 *     showLayer: {Boolean}
 *     summary: {String}
 *     zoomToLayer: {Boolean}
 *   }
 */
var MomentTensor = function (options) {
  var _this,
      _initialize,

      _app,
      _mainshock;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _mainshock = _app.Features.getFeature('mainshock');

    _this.id = 'moment-tensor';
    _this.lightbox = null;
    _this.mapLayer = null;
    _this.name = 'Moment Tensor';
    _this.render = null;
    _this.showLayer = false;
    _this.summary = null;
    _this.zoomToLayer = false;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Create Feature.
   */
  _this.create = function () {
    var beachball, data,
        mt = _mainshock.json.properties.products['moment-tensor'];

    if (mt) {
      data = Object.assign({}, mt[0].properties, {
        source: mt[0].source
      });
      beachball = BeachBall({
        coords: [
          _mainshock.json.geometry.coordinates[1],
          _mainshock.json.geometry.coordinates[0]
        ],
        data: data,
        id: _this.id,
        name: _this.name,
        type: 'moment-tensor'
      });

      _this.lightbox = beachball.createLightbox();
      _this.mapLayer = beachball.createMapLayer();
      _this.render = beachball.render;
      _this.summary = beachball.createSummary();
    }
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;
    _mainshock = null;

    _this = null;
  };

  /**
   * Reset to initial state.
   */
  _this.reset = function () {
    _this.lightbox = null;
    _this.mapLayer = null;
    _this.render = null;
    _this.summary = null;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = MomentTensor;
