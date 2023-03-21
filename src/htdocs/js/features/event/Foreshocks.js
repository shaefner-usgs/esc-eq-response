'use strict';


var AppUtil = require('util/AppUtil'),
    Earthquakes = require('features/util/earthquakes/Earthquakes'),
    Summary = require('features/util/earthquakes/Summary');


/**
 * Create the Foreshocks Feature.
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
 *       removeListeners: {Function}
 *       showLayer: {Boolean}
 *       summary: {String}
 *       url: {String}
 *       zoomToLayer: {Boolean}
 *     }
 */
var Foreshocks = function (options) {
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

    _this.id = 'foreshocks';
    _this.name = 'Foreshocks';
    _this.params = {
      days: Number(document.getElementById('fs-days').value),
      distance: Number(document.getElementById('fs-dist').value),
      magnitude: Number(document.getElementById('fs-mag').value)
    };
    _this.showLayer = options.showLayer;
    _this.summary = '';
    _this.url = _getUrl();
    _this.zoomToLayer = options.zoomToLayer;

    if (AppUtil.getParam('catalog') === 'dd') {
      _this.id = 'dd-foreshocks';
    }

    _earthquakes = Earthquakes({ // fetch feed data
      app: _app,
      feature: _this
    });
    _summaryOpts = Object.assign({}, options, {
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
        coords = mainshock.data.coords,
        endtime = mainshock.data.datetime.minus({ seconds: 1 })
          .toISO().slice(0, -5),
        starttime = mainshock.data.datetime.minus({ days: _this.params.days })
          .toISO().slice(0, -5);

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
    _this.count = _earthquakes.data.length;
    _this.data = _earthquakes.data; // used by Rtf.js
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
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Foreshocks;
