'use strict';


var BeachBalls = require('features/util/beachballs/BeachBalls'),
    Lightbox = require('util/Lightbox');


/**
 * Create the Moment Tensor Feature, a sub-Feature of the Mainshock.
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *     }
 *
 * @return _this {Object}
 *     {
 *       addListeners: {Function}
 *       destroy: {Function}
 *       id: {String}
 *       mapLayer: {Mixed <L.Marker|null>}
 *       name: {String}
 *       removeListeners: {Function}
 *       render: {Function}
 *       showLayer: {Boolean}
 *       summary: {String}
 *       update: {Function}
 *       zoomToLayer: {Boolean}
 *     }
 */
var MomentTensor = function (options) {
  var _this,
      _initialize,

      _beachballs,
      _mainshock,

      _addLightbox,
      _getData;


  _this = {};

  _initialize = function (options = {}) {
    var mt,
        app = options.app;

    _this.addListeners = function () {};
    _this.id = 'moment-tensor';
    _this.mapLayer = null;
    _this.name = 'Moment Tensor';
    _this.removeListeners = function () {};
    _this.render = function () {};
    _this.showLayer = false;
    _this.summary = '';
    _this.zoomToLayer = false;

    _mainshock = app.Features.getFeature('mainshock');
    mt = _mainshock.data.products[_this.id];

    if (mt) {
      _beachballs = BeachBalls({
        data: _getData(mt),
        mainshock: _mainshock,
        name: _this.name,
        type: _this.id
      });

      _this.addListeners = _beachballs.addListeners;
      _this.mapLayer = _beachballs.getMapLayer();
      _this.removeListeners = _beachballs.removeListeners;
      _this.render = _beachballs.render;
      _this.summary = _beachballs.getSummary();

      _addLightbox();
      app.Features.addContent(_this); // add manually b/c there's no feed data
    }
  };

  /**
   * Add the Lightbox.
   */
  _addLightbox = function () {
    var lightbox = Lightbox({
      content: _beachballs.getContent(),
      id: _this.id,
      title: _beachballs.getTitle()
    });

    _mainshock.lightboxes[_this.id] = lightbox; // add to Mainshock
  };

  /**
   * Get the data as a list of un-nested key-value pairs.
   *
   * @param mt {Array}
   *
   * @return {Object}
   */
  _getData = function (mt) {
    return Object.assign({}, mt[0].properties, {
      source: mt[0].source
    });
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    if (_beachballs) {
      _beachballs.destroy();
    }

    _initialize = null;

    _beachballs = null;
    _mainshock = null;

    _addLightbox = null;
    _getData = null;

    _this = null;
  };

  /**
   * Update the Marker's position.
   *
   * Note: used to swap between ComCat and double-difference locations.
   *
   * @param latLng {L.LatLng}
   */
  _this.update = function (latLng) {
    _this.mapLayer.setLatLng(latLng);
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = MomentTensor;
