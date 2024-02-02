/* global L */
'use strict';


var Aftershocks = require('features/event/Aftershocks'),
    AppUtil = require('util/AppUtil'),
    CatalogSearch = require('features/base/CatalogSearch'),
    Dyfi = require('features/event/mainshock/Dyfi'),
    FieldNotes = require('features/event/FieldNotes'),
    FocalMechanism = require('features/event/mainshock/FocalMechanism'),
    Forecast = require('features/event/aftershocks/Forecast'),
    Foreshocks = require('features/event/Foreshocks'),
    Historical = require('features/event/Historical'),
    HistoricalEvents = require('features/event/historical/HistoricalEvents'),
    Mainshock = require('features/event//Mainshock'),
    MomentTensor = require('features/event/mainshock/MomentTensor'),
    NearbyCities = require('features/event/mainshock/NearbyCities'),
    Pager = require('features/event/mainshock/Pager'),
    PagerCities = require('features/event/mainshock/PagerCities'),
    PagerExposures = require('features/event/mainshock/PagerExposures'),
    ShakeAlert = require('features/event/mainshock/ShakeAlert'),
    ShakeMap = require('features/event/mainshock/ShakeMap'),
    ShakeMapStations = require('features/event/ShakeMapStations'),
    SignificantEqs = require('features/base/SignificantEqs');


var _MODULES = {
  base: [ // Features added when app is loaded
    CatalogSearch,
    SignificantEqs
  ],
  comcat: [ // 'event' Features added when ComCat catalog is selected
    Mainshock, // must be first
    Aftershocks,
    Foreshocks,
    Historical
  ],
  dd: [ // 'event' Features added when Double-difference catalog is selected
    Mainshock, // must be first
    Aftershocks,
    Foreshocks,
    Historical
  ],
  event: [ // Features added when a new Mainshock (event) is selected
    Dyfi,
    FieldNotes,
    FocalMechanism,
    Forecast,
    HistoricalEvents,
    MomentTensor,
    NearbyCities,
    Pager,
    PagerCities,
    PagerExposures,
    ShakeAlert,
    ShakeMap,
    ShakeMapStations
  ],
  rtf: [] // Features added when the Event Summary RTF is created
};


/**
 * Create, add, store, reload, get, remove, and delete Features.
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *     }
 *
 * @return _this {Object}
 *     {
 *       checkDependencies: {Function}
 *       clearQueue: {Function}
 *       createFeatures: {Function}
 *       deleteFeature: {Function}
 *       getFeature: {Function}
 *       getFeatures: {Function}
 *       getMainshock: {Function}
 *       getStatus: {Function}
 *       getTimeStamp: {Function}
 *       isFeature: {Function}
 *       reloadFeature: {Function}
 *       reset: {Function}
 *       storeFeature: {Function}
 *     }
 */
var Features = function (options) {
  var _this,
      _initialize,

      _app,
      _features,
      _modules,
      _queue,

      _createFeature,
      _getMode,
      _getOptions,
      _initFeatures,
      _isReady,
      _removeFeatures,
      _render;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;
    _modules = {};
    _queue = [];

    _initFeatures();
    _this.createFeatures('base');
  };

  /**
   * Create a new Feature using the given module and mode. Also add it (if
   * applicable) and store its module.
   *
   * @param mode {String <base|comcat|dd|event|rtf>}
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
   *         isRefreshing: {Boolean} refresh status
   *         isSwapping: {Boolean} earthquake catalog swap
   *         mode: {String <base|comcat|dd|event|loading|rtf>} display mode
   *         status: {String} <error|initialized|loading|ready> loading status
   *         updated: {Number} fetch/creation time (milliseconds)
   *
   *       Common props:
   *
   *         add: {Function} add the Feature (a placeholder for fetched content)
   *         content: {String} HTML content added to SummaryPane
   *         count: {Integer} Feature's count value
   *         data: {Array|Object} Feature's fetched/compiled data
   *         deferFetch: {Boolean} fetch data on demand when map layer turned on
   *         dependencies: {Array} Features (besides Mainshock) that must be ready
   *         json: {Object} JSON feed data (Mainshock only)
   *         lightbox: {Object} Lightbox instance
   *         mapLayer: {L.GeoJSON} Leaflet layer added to MapPane
   *         params: {Object} Feature's user-customizable parameters
   *         placeholder: {String} initial HTML content added to Plots/SummaryPanes
   *         plots: {Object} Plotly parameters for Plots added to PlotsPane
   *         remove: {Function} remove the Feature
   *         render: {Function} render the Feature
   *         showLayer: {Boolean} sets map layer's initial display status
   *         summary: {Object} Summary instance (Aftershocks, Foreshocks, Historical)
   *         title: {String} document/page title (Mainshock, Catalog Search)
   *         type: {String} 'generic' id (same regardless of catalog setting)
   *         url: {String} URL of data feed
   *         zoomToLayer: {Boolean} zoom initial map extent to fit layer
   *     }
   * @param options {Object} optional; default is {}
   */
  _createFeature = function (module, mode, options = {}) {
    var feature;

    try {
      if (_isReady(mode)) { // create Feature when dependencies are ready
        feature = module(Object.assign(options, {
          app: _app
        }));

        Object.assign(feature, {
          isRefreshing: options.isRefreshing || false,
          isSwapping: false,
          mode: mode,
          status: 'initialized',
          updated: 0
        });

        _features.loading[feature.id] = feature;
        _modules[feature.id] = module;

        if (feature.add && !feature.isRefreshing) {
          feature.add();
        }

        if (feature.deferFetch || !feature.url) {
          _this.storeFeature(feature); // Feature ready; no data to load
        }
      } else { // dependencies not ready
        _queue.push(setTimeout(() => {
          _createFeature(module, mode, options);
        }, 100));
      }
    } catch (error) {
      console.error(error);
    }
  };

  /**
   * Get the display mode for the given Feature.
   *
   * @param id {String}
   *     Feature id
   *
   * @return match {String <base|comcat|dd|event|rtf>} default is ''
   */
  _getMode = function (id) {
    var match = ''; // default

    Object.keys(_features).forEach(mode => {
      if (mode !== 'loading') { // skip Features that aren't ready
        Object.keys(_features[mode]).forEach(featureId => {
          if (id === featureId) {
            match = mode;
          }
        });
      }
    });

    return match;
  };

  /**
   * Get the reload options for the given Feature.
   *
   * @param id {String}
   *     Feature id
   *
   * @return options {Object}
   */
  _getOptions = function (id) {
    var feature = _this.getFeature(id),
        options = {
          deferFetch: false // always reload immediately
        };

    if (_this.isFeature(feature)) { // refreshing existing Feature
      options.isRefreshing = true;
    }

    return options;
  };

  /**
   * Initialize _features, which stores Features grouped by their display mode.
   */
  _initFeatures = function () {
    var base;

    if (typeof _features === 'object') {
      base = _features.base;
    }

    _features = {
      base: base || {}, // leave existing 'base' Features intact
      comcat: {},
      dd: {},
      event: {},
      loading: {}, // temporary storage for Features that aren't ready
      rtf: {}
    };
  };

  /**
   * Determine if a Feature with the given display mode is ready to be fetched.
   *
   * All 'event', 'comcat', and 'dd' mode Features are dependent on the
   * Mainshock being fetched first.
   *
   * @param mode {String <base|comcat|dd|event|rtf>}
   *
   * @return {Boolean}
   */
  _isReady = function (mode) {
    var loading = document.body.classList.contains('loading'),
        mainshock = _this.getMainshock();

    if (
      mode === 'base' || // no dependencies
      mode === 'rtf' || // dependencies will be ready
      mode === 'event' && mainshock.status === 'ready' ||
      (mode === 'comcat' || mode === 'dd') && (
        (!_this.isFeature(mainshock) && !loading) || // create Mainshock 1st...
        mainshock.status === 'ready' // then create other Features
      )
    ) {
      return true;
    }

    return false; // default
  };

  /**
   * Remove all Features, except 'base' Features.
   */
  _removeFeatures = function () {
    try {
      Object.keys(_features).forEach(mode => {
        if (mode !== 'base') {
          Object.keys(_features[mode]).forEach(id => {
            var feature = _features[mode][id];

            if (feature.remove) {
              feature.remove();
            }

            feature.destroy();
          });
        }
      });
    } catch (error) {
      console.error(error);
    }
  };

  /**
   * Additional rendering that is necessary once all Features are ready.
   */
  _render = function () {
    var mainshock,
        status = _this.getStatus();

    if (status === 'ready') {
      mainshock = _this.getMainshock();

      mainshock.enableDownload();
      _app.MapPane.setView();
      _app.SummaryPane.render();
    }
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Check if the dependencies for the given Feature are ready (if applicable).
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
   * Clear the queue of dependent Features waiting to be fetched.
   */
  _this.clearQueue = function () {
    _queue.forEach(timer => clearTimeout(timer));

    _queue = [];
  };

  /**
   * Wrapper method that creates all of the Features for the given display mode.
   *
   * @param mode {String <base|comcat|dd|event|rtf>} default is 'event'
   */
  _this.createFeatures = function (mode = 'event') {
    var catalog = AppUtil.getParam('catalog') || 'comcat';

    if (mode === 'event') {
      _this.createFeatures(catalog); // catalog-specific 'event' Features
    }

    _MODULES[mode].forEach(module => {
      _createFeature(module, mode);
    });
  };

  /**
   * Delete the given stored Feature.
   *
   * @param id {String}
   *     Feature id
   */
  _this.deleteFeature = function (id) {
    var mode = _getMode(id);

    if (mode) { // Feature stored
      delete _features[mode][id];
    }
  };

  /**
   * Get the Feature matching the given id.
   *
   * Note: Features are stored when their feed data has finished loading.
   * Features with no feed data (or with deferFetch set) are stored immediately.
   *
   * @param id {String}
   *     Feature id
   *
   * @return feature {Object}
   */
  _this.getFeature = function (id) {
    var feature = {}, // default
        mode = _getMode(id);

    if (mode) { // Feature exists and is ready
      feature = _features[mode][id];
    }

    return feature;
  };

  /**
   * Get all Features matching the given display mode, keyed by their id values.
   *
   * @param mode {String <base|comcat|dd|event|rtf>} default is 'event'
   *
   * @return features {Object}
   */
  _this.getFeatures = function (mode = 'event') {
    var catalog = AppUtil.getParam('catalog') || 'comcat',
        features = Object.assign({}, _features[mode]) || {};

    // Include catalog-specific 'event' Features
    if (mode === 'event') {
      Object.keys(_this.getFeatures(catalog)).forEach(id => {
        features[id] = _this.getFeature(id);
      });
    }

    return features;
  };

  /**
   * Get the ComCat or Double-difference Mainshock, depending on which catalog
   * is currently selected.
   *
   * @return mainshock {Object}
   */
  _this.getMainshock = function () {
    var catalog = AppUtil.getParam('catalog'),
        mainshock = _this.getFeature('mainshock'); // default

    if (catalog === 'dd') {
      mainshock = _this.getFeature('dd-mainshock');
    }

    return mainshock;
  };

  /**
   * Get the collective loading status of all Features for the given display
   * mode.
   *
   * @param mode {String <base|comcat|dd|event|rtf>} default is 'event'
   *
   * @return status {String}
   */
  _this.getStatus = function (mode = 'event') {
    var catalog = AppUtil.getParam('catalog') || 'comcat',
        numFeatures = Object.keys(_features[mode]).length,
        numModules = _MODULES[mode].length,
        status = 'loading'; // default

    if (numFeatures === numModules) {
      status = 'ready';

      // Account for status of catalog-specific 'event' Features
      if (mode === 'event' && status === 'ready') {
        status = _this.getStatus(catalog);
      }
    }

    return status;
  };

  /**
   * Get the HTML content for a Feature's timestamp (user and UTC time).
   *
   * @param data {Object}
   *
   * @return {String}
   */
  _this.getTimeStamp = function (data) {
    return L.Util.template(
      '<dt>Updated</dt>' +
      '<dd>' +
        '<time datetime="{isoTime}" class="user">' +
          '{userTime} (UTC{utcOffset})' +
        '</time>' +
        '<time datetime="{isoTime}" class="utc">{utcTime} (UTC)</time>' +
      '</dd>',
      data
    );
  };

  /**
   * Check if the given feature exists/contains the required properties.
   *
   * @param feature {Object} default is {}
   *
   * @return {Boolean}
   */
  _this.isFeature = function (feature = {}) {
    var required = ['destroy', 'id', 'name'];

    return required.every(prop => feature[prop]);
  };

  /**
   * Reload the given Feature.
   *
   * @param id {Object}
   *     Feature id
   * @param mode {String} optional; default is ''
   *     Feature mode - REQUIRED when reloading after a failed request
   */
  _this.reloadFeature = function (id, mode = '') {
    var mainshock = _this.getMainshock();

    if (_this.isFeature(mainshock) && mode !== 'base') {
      mainshock.disableDownload();
    }

    if (id === 'mainshock') {
      _this.createFeatures();
    } else if (id === 'dd-mainshock') {
      _this.createFeatures('dd');
    } else {
      mode = mode || _getMode(id);

      _createFeature(_modules[id], mode, _getOptions(id));
    }
  };

  /**
   * Reset to default state.
   */
  _this.reset = function () {
    _this.clearQueue();
    _removeFeatures();
    _initFeatures();
  };

  /**
   * Store the given Feature and delete it from the list of loading Features.
   * Also create the RTF doc or render, depending on the mode.
   *
   * @param feature {Object}
   */
  _this.storeFeature = function (feature) {
    var mainshock;

    feature.status = 'ready';
    _features[feature.mode][feature.id] = feature;

    delete _features.loading[feature.id];

    if (feature.mode === 'rtf') {
      mainshock = _this.getMainshock();

      mainshock.createRtf();
    } else {
      _render();
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Features;
