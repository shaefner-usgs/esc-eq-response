'use strict';


var AppUtil = require('util/AppUtil'),
    Earthquakes = require('features/util/earthquakes/Earthquakes'),
    Plots = require('features/util/earthquakes/Plots'),
    Summary = require('features/util/earthquakes/Summary');


/**
 * Create the Historical Seismicity Feature.
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *       magThreshold: {Integer} optional
 *       showLayer: {Boolean}
 *       sortField: {String} optional
 *       sortOrder: {String} optional
 *       zoomToLayer: {Boolean}
 *     }
 *
 * @return _this {Object}
 *     {
 *       addData: {Function}
 *       addListeners: {Function}
 *       bins: {Object}
 *       count: {Integer}
 *       data: {Array}
 *       description: {String}
 *       destroy: {Function}
 *       id: {String}
 *       mapLayer: {L.FeatureGroup}
 *       name: {String}
 *       params: {Object}
 *       placeholder: {String}
 *       plots: {Object}
 *       removeListeners: {Function}
 *       showLayer: {Boolean}
 *       summary: {String}
 *       timestamp: {String}
 *       url: {String}
 *       zoomToLayer: {Boolean}
 *     }
 */
var Historical = function (options) {
  var _this,
      _initialize,

      _app,
      _earthquakes,
      _summary,
      _summaryOpts,

      _destroy,
      _getPlaceholder,
      _getUrl;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;

    _this.id = 'historical';
    _this.name = 'Historical Seismicity';
    _this.params = {
      distance: Number(document.getElementById('hs-dist').value),
      magnitude: Number(document.getElementById('hs-mag').value),
      years: Number(document.getElementById('hs-years').value)
    };
    _this.plots = {};
    _this.showLayer = options.showLayer;
    _this.summary = '';
    _this.url = _getUrl();
    _this.zoomToLayer = options.zoomToLayer;

    if (AppUtil.getParam('catalog') === 'dd') {
      _this.id = 'dd-historical';
    }

    _earthquakes = Earthquakes({ // fetch feed data
      app: _app,
      feature: _this
    });
    _summaryOpts = Object.assign({
      sortField: 'mag' // Feature's default
    }, options, {
      earthquakes: _earthquakes,
      featureId: _this.id
    });

    _this.description = _earthquakes.getDescription();
    _this.mapLayer = _earthquakes.mapLayer;
    _this.placeholder = _getPlaceholder();
  };

  /**
   * Destroy this Feature's sub-Classes.
   */
  _destroy = function () {
    _earthquakes.destroy();

    if (_summary) {
      _summary.destroy();
    }
    if (!AppUtil.isEmpty(_this.plots)) {
      _this.plots.destroy();
    }
  };

  /**
   * Get the placeholder HTML.
   *
   * @return {String}
   */
  _getPlaceholder = function () {
    return '' +
      '<div class="bubble content">' +
        `<p class="description">${_this.description}</p>` +
      '</div>';
  };

  /**
   * Get the JSON feed's URL.
   *
   * @return {String}
   */
  _getUrl = function () {
    var mainshock = _app.Features.getFeature('mainshock'),
        coords = mainshock.data.eq.coords,
        datetime = mainshock.data.eq.datetime,
        endtime = datetime.minus({ seconds: 1 }).toUTC().toISO().slice(0, -5),
        starttime = datetime.minus({ years: _this.params.years })
          .toUTC().toISO().slice(0, -5);

    return Earthquakes.getUrl({
      endtime: endtime,
      latitude: coords[1],
      longitude: coords[0],
      maxradiuskm: _this.params.distance,
      minmagnitude: _this.params.magnitude,
      starttime: starttime
    });
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add the JSON feed data.
   *
   * @param json {Object} default is {}
   */
  _this.addData = function (json = {}) {
    _earthquakes.addData(json);

    _summary = Summary(_summaryOpts);

    _this.bins = _summary.bins;
    _this.count = _earthquakes.data.eqs.length;
    _this.data = _earthquakes.data;
    _this.plots = Plots({
      app: _app,
      data: _earthquakes.data.eqs,
      featureId: _this.id
    });
    _this.summary = _summary.getContent();
    _this.timestamp = _earthquakes.timestamp;
  };

  /**
   * Add event listeners.
   *
   * Note: listeners for plots are added by PlotsPane when they are rendered.
   */
  _this.addListeners = function () {
    _earthquakes.addListeners();
    _summary.addListeners();
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _destroy();

    _initialize = null;

    _app = null;
    _earthquakes = null;
    _summary = null;
    _summaryOpts = null;

    _destroy = null;
    _getPlaceholder = null;
    _getUrl = null;

    _this = null;
  };

  /**
   * Remove event listeners.
   */
  _this.removeListeners = function () {
    _earthquakes.removeListeners();

    if (_summary) {
      _summary.removeListeners();
    }
    if (!AppUtil.isEmpty(_this.plots)) {
      _this.plots.removeListeners();
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Historical;
