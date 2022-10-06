'use strict';


var BeachBalls = require('features/util/beachballs/BeachBalls'),
    Lightbox = require('util/Lightbox');


/**
 * Create the Focal Mechanism Feature, a sub-Feature of the Mainshock.
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *       defaults: {Object}
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
var FocalMechanism = function (options) {
  var _this,
      _initialize,

      _mainshock,
      _beachballs,

      _addLightbox,
      _getData;


  _this = {};

  _initialize = function (options = {}) {
    var fm,
        app = options.app;

    Object.assign(_this, options.defaults);

    _this.addListeners = function () {};
    _this.id = 'focal-mechanism';
    _this.mapLayer = null;
    _this.name = 'Focal Mechanism';
    _this.removeListeners = function () {};
    _this.render = function () {};
    _this.showLayer = false;
    _this.summary = '';
    _this.zoomToLayer = false;

    _mainshock = app.Features.getFeature('mainshock');
    fm = _mainshock.json.properties.products[_this.id];

    if (fm) {
      _beachballs = BeachBalls({
        data: _getData(fm),
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
      id: _this.id
    }).setContent(_beachballs.getContent());

    _mainshock.lightboxes[_this.id] = lightbox; // add to Mainshock
  };

  /**
   * Get the data as a list of un-nested key-value pairs.
   *
   * @param fm {Array}
   *
   * @return {Object}
   */
  _getData = function (fm) {
    return Object.assign({}, fm[0].properties, {
      source: fm[0].source
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


module.exports = FocalMechanism;
