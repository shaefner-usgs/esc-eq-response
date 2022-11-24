'use strict';


var BeachBalls = require('features/util/beachballs/BeachBalls');


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
 *       lightbox: {String}
 *       mapLayer: {Mixed <L.Marker|null>}
 *       name: {String}
 *       removeListeners: {Function}
 *       render: {Function}
 *       showLayer: {Boolean}
 *       summary: {String}
 *       title: {String}
 *       update: {Function}
 *       zoomToLayer: {Boolean}
 *     }
 */
var MomentTensor = function (options) {
  var _this,
      _initialize,

      _app,
      _beachballs,

      _getData;


  _this = {};

  _initialize = function (options = {}) {
    var mt, mainshock;

    _app = options.app;

    _this.addListeners = function () {};
    _this.id = 'moment-tensor';
    _this.lightbox = '';
    _this.mapLayer = null;
    _this.name = 'Moment Tensor';
    _this.removeListeners = function () {};
    _this.render = function () {};
    _this.showLayer = false;
    _this.summary = '';
    _this.title = '';
    _this.zoomToLayer = false;

    mainshock = _app.Features.getFeature('mainshock');
    mt = mainshock.data.products[_this.id];

    if (mt) {
      _beachballs = BeachBalls({
        app: _app,
        data: _getData(mt),
        id: _this.id,
        mainshock: mainshock,
        name: _this.name
      });

      _this.addListeners = _beachballs.addListeners;
      _this.lightbox = _beachballs.getContent();
      _this.mapLayer = _beachballs.getMapLayer();
      _this.removeListeners = _beachballs.removeListeners;
      _this.render = _beachballs.render;
      _this.summary = _beachballs.getSummary();
      _this.title = _beachballs.getTitle();

      _app.Features.addContent(_this); // no feed data => add manually
    }
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
      _app.Features.getLightbox(_this.id).destroy();
    }

    _initialize = null;

    _app = null;
    _beachballs = null;

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
