'use strict';


var AppUtil = require('util/AppUtil'),
    BeachBalls = require('features/util/beachballs/BeachBalls'),
    Luxon = require('luxon');


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
 *       data: {Object}
 *       destroy: {Function}
 *       id: {String}
 *       lightbox: {String}
 *       mapLayer: {Mixed <L.Marker|null>}
 *       name: {String}
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

      _addButton,
      _getData;


  _this = {};

  _initialize = function (options = {}) {
    var mainshock, product;

    _app = options.app;

    _this.data = {};
    _this.id = 'moment-tensor';
    _this.lightbox = '';
    _this.mapLayer = null;
    _this.name = 'Moment Tensor';
    _this.showLayer = false;
    _this.summary = '';
    _this.title = '';
    _this.zoomToLayer = false;

    mainshock = _app.Features.getFeature('mainshock');
    product = mainshock.data.eq.products?.[_this.id]?.[0] || {};

    if (!AppUtil.isEmpty(product)) {
      _beachballs = BeachBalls({
        app: _app,
        data: _getData(product),
        id: _this.id,
        mainshock: mainshock,
        name: _this.name
      });

      _this.data = _beachballs.data;
      _this.lightbox = _beachballs.getLightbox();
      _this.mapLayer = _beachballs.getMapLayer();
      _this.summary = _beachballs.getSummary();
      _this.title = _beachballs.getTitle();

      _app.Features.addContent(_this); // no feed data => add manually
    }
  };

  /**
   * Add the external link button.
   */
  _addButton = function () {
    var button =
          `<a href="${_this.data.url}" target="new" class="button">` +
            '<i class="icon-link"></i>' +
          '</a>',
        h3 = document.getElementById(_this.id).querySelector('h3');

    h3.innerHTML = _this.title + button;
  };

  /**
   * Get the data used to create the content.
   *
   * @param mt {Object}
   *
   * @return {Object}
   */
  _getData = function (mt) {
    var millis = Number(mt.updateTime) || 0;

    return Object.assign({}, mt.properties || {}, {
      datetime: Luxon.DateTime.fromMillis(millis),
      source: mt.source || '',
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

    _addButton = null;
    _getData = null;

    _this = null;
  };

  /**
   * Add the button and render the Beachballs.
   */
  _this.render = function () {
    _addButton();

    if (_beachballs) {
      _beachballs.render();
    }
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
