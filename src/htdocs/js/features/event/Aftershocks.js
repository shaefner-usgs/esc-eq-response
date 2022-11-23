'use strict';


var AppUtil = require('util/AppUtil'),
    Earthquakes = require('features/util/earthquakes/Earthquakes'),
    Plots = require('features/util/earthquakes/Plots'),
    Summary = require('features/util/earthquakes/Summary');


/**
 * Create the Aftershocks Feature.
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *       showLayer: {Boolean}
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
 *       url: {String}
 *       zoomToLayer: {Boolean}
 *     }
 */
var Aftershocks = function (options) {
  var _this,
      _initialize,

      _app,
      _earthquakes,
      _summary,

      _getPlaceholder,
      _getUrl;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;

    _this.id = 'aftershocks';
    _this.name = 'Aftershocks';
    _this.params = {
      distance: Number(document.getElementById('as-dist').value),
      magnitude: Number(document.getElementById('as-mag').value)
    };
    _this.plots = {};
    _this.showLayer = options.showLayer;
    _this.summary = '';
    _this.url = _getUrl();
    _this.zoomToLayer = options.zoomToLayer;

    if (AppUtil.getParam('catalog') === 'dd') {
      _this.id = 'dd-aftershocks';
    }

    _earthquakes = Earthquakes({
      app: _app,
      feature: _this
    });

    _this.mapLayer = _earthquakes.mapLayer;
    _this.placeholder = _getPlaceholder();
  };

  /**
   * Get the placeholder HTML.
   *
   * @return {String}
   */
  _getPlaceholder = function () {
    var description = _earthquakes.getDescription();

    return '' +
      '<div class="bubble content">' +
        `<p class="description">${description}</p>` +
      '</div>';
  };

  /**
   * Get the JSON feed's URL.
   *
   * @return {String}
   */
  _getUrl = function () {
    var mainshock = _app.Features.getFeature('mainshock'),
        coords = mainshock.data.coords,
        starttime = mainshock.data.datetime.plus({ seconds: 1 })
          .toISO().slice(0, -5);

    return Earthquakes.getUrl({
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
   * @param json {Object}
   */
  _this.addData = function (json) {
    _earthquakes.addData(json);

    _summary = Summary({
      app: _app,
      earthquakes: _earthquakes,
      featureId: _this.id
    });

    _this.bins = _summary.bins;
    _this.count = _earthquakes.data.length;
    _this.data = _earthquakes.data; // used by Rtf.js
    _this.plots = Plots({
      app: _app,
      data: _earthquakes.data,
      featureId: _this.id
    });
    _this.summary = _summary.getContent();
  };

  /**
   * Add event listeners.
   */
  _this.addListeners = function () {
    _earthquakes.addListeners();
    _summary.addListeners();
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _earthquakes.destroy();

    if (!AppUtil.isEmpty(_this.plots)) {
      _this.plots.destroy();
    }
    if (_summary) {
      _summary.destroy();
    }

    _initialize = null;

    _app = null;
    _earthquakes = null;
    _summary = null;

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
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Aftershocks;