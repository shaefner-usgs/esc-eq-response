'use strict';


var AppUtil = require('util/AppUtil'),
    BeachBalls = require('features/util/beachballs/BeachBalls'),
    Lightbox = require('util/Lightbox'),
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
 *       content: {String}
 *       data: {Object}
 *       destroy: {Function}
 *       id: {String}
 *       lightbox: {Mixed <Object|null>}
 *       mapLayer: {Mixed <L.Marker|null>}
 *       name: {String}
 *       remove: {Function}
 *       render: {Function}
 *       showLayer: {Boolean}
 *       title: {String}
 *       zoomToLayer: {Boolean}
 *     }
 */
var MomentTensor = function (options) {
  var _this,
      _initialize,

      _app,
      _beachballs,
      _container,
      _rendered,

      _createBeachBalls,
      _destroy,
      _getButton,
      _getData;


  _this = {};

  _initialize = function (options = {}) {
    var mainshock, product;

    _app = options.app;
    _container = document.querySelector('#map-pane .container');
    _rendered = false;

    _this.content = '';
    _this.data = {};
    _this.id = 'moment-tensor';
    _this.lightbox = null;
    _this.mapLayer = null;
    _this.name = 'Moment Tensor';
    _this.showLayer = false;
    _this.title = '';
    _this.zoomToLayer = false;

    mainshock = _app.Features.getMainshock();
    product = mainshock.data.eq.products?.[_this.id]?.[0] || {};

    if (!AppUtil.isEmpty(product)) {
      _createBeachBalls(mainshock, product);
      _this.render(); // no feed data => render immediately
    }
  };

  /**
   * Create the BeachBalls and store their data/products.
   *
   * @param mainshock {Object}
   * @param product {Object}
   */
  _createBeachBalls = function (mainshock, product) {
    _beachballs = BeachBalls({
      app: _app,
      data: _getData(product),
      id: _this.id,
      mainshock: mainshock,
      name: _this.name
    });

    _this.content = _beachballs.getSummary();
    _this.data = _beachballs.data;
    _this.mapLayer = _beachballs.getMapLayer();
    _this.title = _beachballs.getTitle();
  };

  /**
   * Destroy this Feature's sub-Classes.
   */
  _destroy = function () {
    _beachballs?.destroy();
    _this.lightbox?.destroy();
  };

  /**
   * Get the HTML content for the external link button.
   *
   * @return {String}
   */
  _getButton = function () {
    return '' +
      `<a href="${_this.data.url}" target="new" class="button">` +
        '<i class="icon-link"></i>' +
      '</a>';
  };

  /**
   * Get the data used to create the content.
   *
   * @param mt {Object}
   *
   * @return {Object}
   */
  _getData = function (mt) {
    var millisecs = Number(mt.updateTime) || 0;

    return Object.assign({}, mt.properties || {}, {
      datetime: Luxon.DateTime.fromMillis(millisecs),
      source: mt.source || '',
    });
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Destroy this Class.
   */
  _this.destroy = function () {
    _destroy();

    _initialize = null;

    _app = null;
    _beachballs = null;
    _container = null;
    _rendered = null;

    _createBeachBalls = null;
    _destroy = null;
    _getButton = null;
    _getData = null;

    _this = null;
  };

  /**
   * Remove the Feature.
   */
  _this.remove = function () {
    var feature;

    _app.MapPane.removeFeature(_this);

    feature = _container.querySelector('.' + _this.id);

    if (feature) {
      _container.removeChild(feature);
    }
  };

  /**
   * Render the Feature.
   */
  _this.render = function () {
    var mainshock = _app.Features.getMainshock(),
        placeholder = '<div class="moment-tensor feature"></div>';

    if (_rendered) { // re-rendering
      _this.remove();
      _this.lightbox?.destroy();
      _this.mapLayer.setLatLng(mainshock.data.eq.latLng);
    }

    _app.MapPane.addFeature(_this);
    _app.SummaryPane.addContent(_this);
    _container.insertAdjacentHTML('beforeend', placeholder); // map's BeachBall

    _this.lightbox = Lightbox({
      content: _beachballs.getLightbox(),
      id: _this.id,
      targets: document.querySelectorAll('.moment-tensor.feature'),
      title: _this.title + _getButton()
    }).render();

    _beachballs.render();

    if (sessionStorage.getItem(_this.id + '-layer') === 'true') {
      _app.MapPane.map.addLayer(_this.mapLayer);
    }

    _rendered = true;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = MomentTensor;
