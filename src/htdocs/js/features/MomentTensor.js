'use strict';


var BeachBall = require('features/util/BeachBall');


/**
 * Create the Moment Tensor Feature, which is a sub-Feature of the Mainshock.
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

    Object.assign(_this, {
      id: 'moment-tensor',
      lightbox: null,
      mapLayer: null,
      name: 'Moment Tensor',
      render: null,
      showLayer: false,
      summary: null,
      zoomToLayer: false
    });
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
          _mainshock.data.lat,
          _mainshock.data.lon
        ],
        data: data,
        id: _this.id,
        name: _this.name,
        type: 'moment-tensor'
      });

      Object.assign(_this, {
        lightbox: beachball.createLightbox(),
        mapLayer: beachball.createMapLayer(),
        render: beachball.render,
        summary: beachball.createSummary()
      });
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
    Object.assign(_this, {
      lightbox: null,
      mapLayer: null,
      render: null,
      summary: null
    });
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = MomentTensor;
