'use strict';


var Aftershocks = require('features/mainshock/Aftershocks'),
    AppUtil = require('util/AppUtil'),
    CatalogSearch = require('features/base/CatalogSearch'),
    DDMainshock = require('features/mainshock/dd/Mainshock'),
    FieldNotes = require('features/mainshock/FieldNotes'),
    FocalMechanism = require('features/mainshock/FocalMechanism'),
    Forecast = require('features/mainshock/Forecast'),
    Foreshocks = require('features/mainshock/Foreshocks'),
    Historical = require('features/mainshock/Historical'),
    HistoricalEvents = require('features/rtf/HistoricalEvents'),
    Mainshock = require('features/mainshock//Mainshock'),
    MomentTensor = require('features/mainshock/MomentTensor'),
    NearbyCities = require('features/rtf/NearbyCities'),
    PagerCities = require('features/mainshock/PagerCities'),
    PagerComments = require('features/rtf/PagerComments'),
    PagerExposures = require('features/mainshock/PagerExposures'),
    Rtf = require('util/Rtf'),
    ShakeAlert = require('features/rtf/ShakeAlert'),
    ShakeMapInfo = require('features/rtf/ShakeMapInfo'),
    ShakeMapStations = require('features/mainshock/ShakeMapStations'),
    SignificantEqs = require('features/base/SignificantEqs');


var _DEFAULTS,
    _MODULES;

/**
 * Default settings for new Features.
 */
_DEFAULTS = {
  showLayer: true,
  zoomToLayer: true
};

/**
 * Feature modules, organized by display mode.
 */
_MODULES = {
  base: [ // Features added when the app is loaded
    CatalogSearch,
    SignificantEqs
  ],
  comcat: [ // ComCat catalog's Mainshock Features
    Aftershocks,
    Foreshocks,
    Historical
  ],
  dd: [ // double-difference catalog's Mainshock Features
    DDMainshock, // must be first
    Aftershocks,
    Foreshocks,
    Historical
  ],
  mainshock: [ // Features added when a new Mainshock is selected
    Mainshock, // must be first
    FieldNotes,
    FocalMechanism,
    Forecast,
    MomentTensor,
    PagerCities,
    PagerExposures,
    ShakeMapStations
  ],
  rtf: [ // Features added when the Event Summary RTF is created
    HistoricalEvents,
    NearbyCities,
    PagerComments,
    ShakeAlert,
    ShakeMapInfo
  ]
};


/**
 * Create, add, get, remove, and refresh Features.
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *     }
 *
 * @return _this {Object}
 *     {
 *       addContent: {Function}
 *       addFeature: {Function}
 *       checkDependencies: {Function}
 *       clearQueue: {Function}
 *       createFeatures: {Function}
 *       getFeature: {Function}
 *       getFeatures: {Function}
 *       getHeaders: {Function}
 *       getStatus: {Function}
 *       isFeature: {Function}
 *       postInit: {Function)
 *       refreshFeature: {Function}
 *       removeFeature: {Function}
 *       reset: {Function}
 *     }
 */
var Features = function (options) {
  var _this,
      _initialize,

      _app,
      _features,
      _modules,
      _prevFeatures,
      _queue,

      _addCount,
      _addFeature,
      _cacheFeature,
      _createFeature,
      _getMode,
      _initFeatures,
      _isReady,
      _removeCount,
      _removeFeatures;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;
    _modules = {};
    _prevFeatures = {};
    _queue = [];

    _initFeatures();
  };

  /**
   * Add the given Feature's count next to its name.
   *
   * Note: also replaces (or removes) the loader.
   *
   * @param feature {Object}
   */
  _addCount = function (feature) {
    var count = '',
        els = _this.getHeaders(feature.id);

    if (Object.prototype.hasOwnProperty.call(feature, 'count')) {
      count = `<span class="count">${feature.count}</span>`;
    }

    els.forEach(el => {
      el.innerHTML = feature.name + count;
    });

    // Layer control's count is handled by its Leaflet plugin
    _app.MapPane.layerControl.addCount(count, feature.id);
  };

  /**
   * Add the given Feature to the Map/Plots/SummaryPanes. This is typically a
   * placeholder where fetched data is subsequently added when it is ready.
   *
   * @param feature {Object}
   */
  _addFeature = function (feature) {
    try {
      _app.PlotsPane.addFeature(feature);
      _app.SummaryPane.addFeature(feature);
      _app.MapPane.addFeature(feature); // must be last (so loaders can be added)
    } catch (error) {
      _app.StatusBar.addError({
        id: feature.id,
        message: `<h4>Error Adding ${feature.name}</h4><ul><li>${error}</li></ul>`
      });
      _this.removeFeature(feature);

      console.error(error);
    }
  };

  /**
   * Cache an existing Feature (in an Array due to the potential of 'stacked'
   * Fetch requests). This is used to purge the 'previous' Feature when a
   * refresh completes.
   *
   * @param feature {Object}
   */
  _cacheFeature = function (feature) {
    if (!_prevFeatures[feature.id]) {
      _prevFeatures[feature.id] = [];
    }

    _prevFeatures[feature.id].push(feature);
  };

  /**
   * Create a new Feature (when its dependencies are ready) using the given
   * module and then add it. Also store it in _features.
   *
   * @param mode {String <base|comcat|dd|mainshock|rtf>}
   * @param module {Object}
   *     Feature's module
   *
   *     {
   *       Required props:
   *
   *         destroy: {Function} free references
   *         id: {String} unique id
   *         name: {String} display name
   *
   *       Auto-set props:
   *
   *         mode: {String <base|mainshock>} display mode
   *         status: {String} loading status
   *
   *       Default props (for Features that implement them):
   *
   *         showLayer: {Boolean true}
   *         zoomToLayer: {Boolean true}
   *
   *       Common props:
   *
   *         addData: {Function} receives fetched JSON data
   *         addListeners: {Function} event listeners added with Feature
   *         content: {String} HTML content added to SideBar (in Element#feature-id)
   *         count: {Integer} Feature's count value added next to its name
   *         deferFetch: {Boolean} fetch data on demand when map layer turned 'on'
   *           Note: only Features with a map layer; showLayer must be false
   *         dependencies: {Array} Features (besides Mainshock) that must be ready
   *         json: {String} JSON feed data (Mainshock only)
   *         mapLayer: {L.Layer} Leaflet layer added to MapPane
   *         params: {Object} Feature's parameters that are exposed in SettingsBar
   *         placeholder: {String} initial HTML content added to Plots/SummaryPanes
   *           Note: fetched content is appended to Element.content in placeholder
   *         plots: {Object} Plotly parameters for Plots added to PlotsPane
   *         removeListeners: {Function} event listeners removed with Feature
   *         showLayer: {Boolean} whether or not map layer is "on" by default
   *         summary: {String} HTML content added to SummaryPane
   *         title: {String} document and page title (Mainshock and Catalog Search)
   *         update: {Function} manual post-fetch updates
   *         url: {String} URL of data feed
   *         zoomToLayer: {Boolean} whether or not initial map zoom fits layer
   *     }
   * @param opts {Object} default is {}
   */
  _createFeature = function (mode, module, opts = {}) {
    var defaults, feature,
        status = 'initialized'; // default

    if (_isReady(mode)) { // create Feature when dependencies are ready
      defaults = Object.assign({}, _DEFAULTS, opts);
      feature = module({
        app: _app,
        defaults: defaults
      });

      if (!feature.url) {
        status = 'ready';
      } else if (feature.status) {
        status = feature.status; // preserve assigned status
      }

      Object.assign(feature, {
        mode: mode,
        status: status
      });

      _features[mode][feature.id] = feature;
      _modules[feature.id] = module;

      _addFeature(feature);
    } else { // dependencies not ready
      _queue.push(setTimeout(() => {
        _createFeature(mode, module);
      }, 250));
    }
  };

  /**
   * Get the display mode for the Feature with the given id.
   *
   * @param id {String}
   *     Feature id
   *
   * @return match {String <base|mainshock|rtf>} default is ''
   */
  _getMode = function (id) {
    var match = ''; // default

    Object.keys(_features).forEach(mode => {
      Object.keys(_features[mode]).forEach(featureId => {
        if (id === featureId) {
          match = mode;
        }
      });
    });

    return match;
  };

  /**
   * Initialize _features, which stores Features grouped by their display mode.
   */
  _initFeatures = function () {
    var base;

    if (typeof _features === 'object') {
      base = _features.base; // leave 'base' Features intact
    }

    _features = {
      base: base || {},
      comcat: {},
      dd: {},
      mainshock: {},
      rtf: {}
    };
  };

  /**
   * Determine if a Feature with the given display mode is ready to be fetched.
   * SignificantEqs must be fetched before the Mainshock and all 'mainshock',
   * 'comcat', and 'dd' mode Features are dependent on their respective
   * Mainshocks being fetched first.
   *
   * @param mode {String <base|comcat|dd|mainshock|rtf>}
   *
   * @return {Boolean}
   */
  _isReady = function (mode) {
    var ddMainshock = _this.getFeature('dd-mainshock'),
        mainshock = _this.getFeature('mainshock'),
        significantEqs = _this.getFeature('significant-eqs');

    if (
      mode === 'base' || // no dependencies
      mode === 'comcat' && mainshock.status === 'ready' ||
      mode === 'dd' && (
        ( // first create the DD Mainshock (once the Mainshock is ready)...
          mainshock.status === 'ready' &&
          !_this.isFeature(ddMainshock)
        ) ||
        ddMainshock.status === 'ready' // then create the other dd Features
      ) ||
      mode === 'mainshock' && (
        ( // first create the Mainshock (once SignificantEqs is ready)...
          significantEqs.status ===  'ready' &&
          !_this.isFeature(mainshock)
        ) ||
        mainshock.status === 'ready' // then create the other Mainshock Features
      ) ||
      mode === 'rtf' // other Features will always be ready
    ) {
      return true;
    }

    return false; // default
  };

  /**
   * Remove the given Feature's count value (or its loader if it was still
   * loading) in the SettingsBar, if applicable.
   *
   * @param feature {Object}
   */
  _removeCount = function (feature) {
    var count, loader,
        el = document.getElementById('settingsBar'),
        header = el.querySelector(`div.${feature.id} h3`);

    if (header) { // Feature has user-configurable settings
      count = header.querySelector('.count');
      loader = header.querySelector('.breather');

      if (count) {
        header.removeChild(count);
      }
      if (loader) {
        header.removeChild(loader);
      }
    }
  };

  /**
   * Remove all Features, except 'base' Features.
   */
  _removeFeatures = function () {
    Object.keys(_features).forEach(mode => {
      if (mode !== 'base') {
        Object.keys(_features[mode]).forEach(id => {
          _this.removeFeature(_this.getFeature(id));
        });
      }
    });
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add the given Feature's content (i.e. the fetched data). Also render and
   * add its event listeners, if applicable.
   *
   * Optionally create the RTF document when all of its Features are ready.
   *
   * @param feature {Object}
   */
  _this.addContent = function (feature) {
    var el;

    _app.MapPane.addContent(feature);
    _app.PlotsPane.addContent(feature);
    _app.SummaryPane.addContent(feature);
    _addCount(feature);

    if (feature.content) {
      el = document.getElementById(feature.id);
      el.innerHTML = feature.content; // add SideBar content
    }
    if (feature.render) {
      feature.render(); // add BeachBalls
    }
    if (feature.addListeners) {
      feature.addListeners();
    }

    // RTF document
    if (feature.mode === 'rtf') {
      if (_this.getStatus('rtf') === 'ready') {
        Rtf({
          app: _app
        });
      }
    }
  };

  /**
   * Add the given Feature back to the Map/Plots/SummaryPanes (when swapping
   * between catalogs).
   *
   * Note: the Feature's placeholder and its content are added at once, as its
   * data has already been fetched.
   *
   * @param feature {Object}
   */
  _this.addFeature = function (feature) {
    _addFeature(feature);
    _this.addContent(feature);
  };

  /**
   * Check if the dependencies (if any) for the given Feature are ready.
   *
   * @param feature {Object}
   *
   * @return status {String}
   */
  _this.checkDependencies = function (feature) {
    var status = 'ready'; // default

    if (Array.isArray(feature.dependencies)) { // load dependencies first
      feature.dependencies.forEach(id => {
        var dependency = _this.getFeature(id);

        if (dependency.status !== 'ready') {
          status = dependency.status;
        }
      });
    }

    return status;
  };

  /**
   * Clear the queue of Features waiting to be fetched.
   */
  _this.clearQueue = function () {
    _queue.forEach(timer => clearTimeout(timer));

    _queue = [];
  };

  /**
   * Wrapper method that creates all of the Features for the given display mode.
   *
   * @param mode {String <base|comcat|dd|mainshock|rtf>} default is 'mainshock'
   */
  _this.createFeatures = function (mode = 'mainshock') {
    var catalog = AppUtil.getParam('catalog') || 'comcat';

    _MODULES[mode].forEach(Module => {
      _createFeature(mode, Module);
    });

    // Add the selected catalog-specific Features
    if (mode === 'mainshock') {
      _this.createFeatures(catalog);
    }
  };

  /**
   * Get the Feature matching the given id.
   *
   * @param id {String}
   *     Feature id
   *
   * @return {Object}
   */
  _this.getFeature = function (id) {
    var feature = {}, // default
        mode = _getMode(id);

    if (mode) { // Feature exists
      feature = _features[mode][id];
    }

    return feature;
  };

  /**
   * Get all Features matching the given display mode, keyed by their id values.
   *
   * @param mode {String <base|comcat|dd|mainshock|rtf>} default is 'mainshock'
   *
   * @return {Object}
   *     Features keyed by id
   */
  _this.getFeatures = function (mode = 'mainshock') {
    return _features[mode] || {};
  };

  /**
   * Get all of the given Feature's header Elements for adding loaders/count
   * values next to the Feature's name.
   *
   * Note: the layer control's loaders/count values are handled separately (by
   * L.Control.Layers.Sorted.js).
   *
   * @param id {String}
   *     Feature id
   *
   * @return els {Array}
   */
  _this.getHeaders = function (id) {
    var els = [],
        selectors = [
          `#plotsPane div.${id} h2`,
          `#settingsBar div.${id} h3`,
          `#summaryPane div.${id} h2`
        ];

    selectors.forEach(selector => {
      var el = document.querySelector(selector);

      if (el) {
        els.push(el);
      }
    });

    return els;
  };

  /**
   * Get the collective loading status (ready or not) of all Features for the
   * given display mode.
   *
   * @param mode {String <base|comcat|dd|mainshock|rtf>} default is 'mainshock'
   *
   * @return status {String <error|initialized|loading|ready>} default is ''
   */
  _this.getStatus = function (mode = 'mainshock') {
    var count = Object.keys(_features[mode]).length,
        status = ''; // default

    if (count === 1 && (mode === 'mainshock' || mode === 'dd')) {
      status = 'loading'; // only the Mainshock is ready
    } else if (count !== 0) {
      status = 'ready';

      Object.keys(_features[mode]).forEach(id => {
        var feature = _this.getFeature(id);

        if (feature.status !== 'ready') {
          status = feature.status; // error, initialized or loading
        }
      });
    }

    return status;
  };

  /**
   * Check if the given feature exists (i.e. it's not an empty Object).
   *
   * @param feature {Object}
   *
   * @return {Boolean}
   */
  _this.isFeature = function (feature) {
    if (AppUtil.isEmpty(feature)) {
      return false;
    }

    return true;
  };

  /**
   * Initialization that depends on other Classes being ready before running.
   */
  _this.postInit = function () {
    _this.createFeatures('base');
  };

  /**
   * Refresh the given Feature.
   *
   * @param id {Object}
   *     Feature id
   */
  _this.refreshFeature = function (id) {
    var module, prevFeature,
        feature = _this.getFeature(id),
        mode = _getMode(id),
        showLayer = feature.showLayer; // use cached value

    _cacheFeature(feature);

    module = _modules[id];
    prevFeature = _prevFeatures[id].shift(); // 'oldest' Feature

    if (feature.mode === 'mainshock') {
      _this.getFeature('mainshock').disableDownload();
    }

    _this.removeFeature(prevFeature);
    _createFeature(mode, module, {
      showLayer: showLayer
    });
  };

  /**
   * Remove the given Feature and optionally destroy it. Also remove the count
   * value from the SettingsBar (if applicable).
   *
   * Note: when swapping between catalogs, the count value is updated, so it
   * shouldn't be removed.
   *
   * @param feature {Object}
   * @param destroy {Boolean} default is true
   *     set to false when swapping between catalogs
   */
  _this.removeFeature = function (feature, destroy = true) {
    if (_this.isFeature(feature)) {
      if (feature.removeListeners && destroy) {
        feature.removeListeners();
      }

      _app.MapPane.removeFeature(feature);
      _app.PlotsPane.removeFeature(feature);
      _app.SummaryPane.removeFeature(feature);

      // Mainshock details in SelectBar
      if (feature.id === 'mainshock') {
        document.getElementById('mainshock').innerHTML = '';
      }

      // Purge Feature unless swapping between catalogs
      if (destroy) {
        feature.destroy();
        _removeCount(feature);

        delete _features[feature.mode][feature.id];
      }
    }
  };

  /**
   * Reset to default state.
   */
  _this.reset = function () {
    _this.clearQueue();
    _removeFeatures();
    _initFeatures();

    _prevFeatures = {};
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Features;
