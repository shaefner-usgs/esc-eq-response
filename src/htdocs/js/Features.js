'use strict';


var Aftershocks = require('features/event/Aftershocks'),
    AppUtil = require('util/AppUtil'),
    CatalogSearch = require('features/base/CatalogSearch'),
    DdMainshock = require('features/event/DdMainshock'),
    Dyfi = require('features/event/mainshock/Dyfi'),
    FieldNotes = require('features/event/FieldNotes'),
    FocalMechanism = require('features/event/mainshock/FocalMechanism'),
    Forecast = require('features/event/aftershocks/Forecast'),
    Foreshocks = require('features/event/Foreshocks'),
    Historical = require('features/event/Historical'),
    HistoricalEvents = require('features/rtf/HistoricalEvents'),
    Lightbox = require('util/Lightbox'),
    Mainshock = require('features/event//Mainshock'),
    MomentTensor = require('features/event/mainshock/MomentTensor'),
    NearbyCities = require('features/rtf/NearbyCities'),
    Pager = require('features/event/mainshock/Pager'),
    PagerCities = require('features/event/mainshock/PagerCities'),
    PagerExposures = require('features/event/mainshock/PagerExposures'),
    Rtf = require('util/Rtf'),
    ShakeAlert = require('features/event/mainshock/ShakeAlert'),
    ShakeMap = require('features/event/mainshock/ShakeMap'),
    ShakeMapStations = require('features/event/ShakeMapStations'),
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
  comcat: [ // 'event' Features added when ComCat catalog is selected
    Aftershocks,
    Foreshocks,
    Historical
  ],
  dd: [ // 'event' Features added when Double-difference catalog is selected
    DdMainshock,
    Aftershocks,
    Foreshocks,
    Historical
  ],
  event: [ // Features added when a new Mainshock (event) is selected
    Mainshock, // must be first
    Dyfi,
    FieldNotes,
    FocalMechanism,
    Forecast,
    MomentTensor,
    Pager,
    PagerCities,
    PagerExposures,
    ShakeAlert,
    ShakeMap,
    ShakeMapStations
  ],
  rtf: [ // Features added when the Event Summary RTF is created
    HistoricalEvents,
    NearbyCities
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
 *       getLightbox: {Function}
 *       getStatus: {Function}
 *       isFeature: {Function}
 *       postInit: {Function)
 *       refreshFeature: {Function}
 *       reloadFeature: {Function}
 *       removeFeature: {Function}
 *       reset: {Function}
 *       restoreFeature: {Function}
 *       showLightbox: {Function}
 *     }
 */
var Features = function (options) {
  var _this,
      _initialize,

      _app,
      _features,
      _lightboxes,
      _modules,
      _queue,

      _addCount,
      _addFeature,
      _addLightbox,
      _createFeature,
      _createRtf,
      _flagCount,
      _getMode,
      _getOptions,
      _initFeatures,
      _isReady,
      _removeCount,
      _removeFeatures;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;
    _lightboxes = {};
    _modules = {};
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

    els.forEach(el => el.innerHTML = feature.name + count);

    // Layer control's count is handled by its Leaflet plugin
    _app.MapPane.layerControl.addCount(count, feature.id);

    _flagCount(feature.id, els);
  };

  /**
   * Add the given Feature to the Map/Plots/SummaryPanes. This is typically a
   * placeholder where content is subsequently added when it is ready.
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
    * Add the given Feature's Lightbox to the DOM.
    *
    * @param feature {Object}
    */
  _addLightbox = function (feature) {
    var id = feature.id;

    _lightboxes[id] = Lightbox({
      content: feature.lightbox,
      id: id,
      title: feature.title || feature.name
    });
  };

  /**
   * Create a new Feature (when its dependencies are ready) using the given
   * module and then add it. Also store it in _features and store its module.
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
   *         mode: {String <base|comcat|dd|event|rtf>} display mode
   *         prevFeature: {Object} existing Feature before a refresh
   *         status: {String} loading status
   *         updated: {String} fetch time (milliseconds)
   *
   *       Common props:
   *
   *         addData: {Function} receives fetched JSON data
   *         addListeners: {Function} event listeners added with Feature
   *         content: {String} HTML content added to SideBar (in Element#feature-id)
   *         count: {Integer} Feature's count value added next to its name
   *         deferFetch: {Boolean} fetch data on demand when map layer turned 'on'
   *           Note: only Features with a map layer; showLayer prop must be false
   *         dependencies: {Array} Features (besides Mainshock) that must be ready
   *         json: {String} JSON feed data (Mainshock only)
   *         lightbox: {String} HTML content of Feature's Lightbox
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
   * @param options {Object} optional; default is {}
   */
  _createFeature = function (mode, module, options = {}) {
    var feature,
        status = 'initialized'; // default

    if (_isReady(mode)) { // create Feature when dependencies are ready
      options = Object.assign({}, _DEFAULTS, options, {
        app: _app
      });
      feature = module(options);

      if (!feature.url) {
        status = 'ready';
      } else if (feature.status) {
        status = feature.status; // preserve assigned status
      }

      Object.assign(feature, {
        isRefreshing: options.isRefreshing || false,
        mode: mode,
        prevFeature: options.prevFeature || {},
        status: status
      });

      _features[mode][feature.id] = feature;
      _modules[feature.id] = module;

      if (mode === 'rtf') {
        _createRtf(); // creates RTF doc when no RTF Features exist
      }

      _addFeature(feature);
    } else { // dependencies not ready
      _queue.push(setTimeout(() => {
        _createFeature(mode, module, options);
      }, 50));
    }
  };

  /**
   * Create the RTF Event Summary document if all RTF Features are ready.
   */
  _createRtf = function () {
    var status = _this.getStatus('rtf');

    if (status === 'ready') {
      Rtf({
        app: _app
      });
    }
  };

  /**
   * Add a flag so the count animation is played only once.
   *
   * @param id {String}
   *     Feature id
   * @param headers {NodeList}
   */
  _flagCount = function (id, headers) {
    var subheaders = document.querySelectorAll(`#summaryPane .${id} h3`),
        els = Array.from(headers).concat(Array.from(subheaders));

    setTimeout(() => {
      els.forEach(el => {
        var count = el.querySelector('.count');

        if (count) {
          count.classList.add('played');
        }
      });
    }, 500);
  };

  /**
   * Get the display mode for the Feature with the given id.
   *
   * @param id {String}
   *     Feature id
   *
   * @return match {String <base|comcat|dd|event|rtf>} default is ''
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
   * Get the given Feature's refresh options.
   *
   * @param feature {Object}
   *
   * @return options {Object}
   */
  _getOptions = function (feature) {
    var th,
        magThreshold = sessionStorage.getItem(feature.id + '-mag'),
        options = {
          isRefreshing: true,
          prevFeature: feature,
          showLayer: feature.showLayer
        },
        table = document.querySelector(`#summaryPane .${feature.id} .sortable`);

    if (magThreshold) {
      options.magThreshold = Number(magThreshold);
    }
    if (table) {
      th = table.querySelector('.sort-down, .sort-up');

      Object.assign(options, {
        sortField: Array.from(th.classList).find(className =>
          !className.includes('sort-')
        ),
        sortOrder: th.classList.contains('sort-down') ? 'asc' : 'desc'
      });
    }

    return options;
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
      event: {},
      rtf: {}
    };
  };

  /**
   * Determine if a Feature with the given display mode is ready to be fetched.
   * All 'event', 'comcat', and 'dd' mode Features are dependent on the
   * Mainshock being fetched first.
   *
   * @param mode {String <base|comcat|dd|event|rtf>}
   *
   * @return {Boolean}
   */
  _isReady = function (mode) {
    var mainshock = _this.getFeature('mainshock');

    if (
      mode === 'base' || // no dependencies
      mode === 'comcat' && mainshock.status === 'ready' ||
      mode === 'dd' && mainshock.status === 'ready' ||
      mode === 'event' && (
        !_this.isFeature(mainshock) || // first create the Mainshock...
        mainshock.status === 'ready' // then create the other 'event' Features
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
   * Remove all Features, except 'base' Features. Also remove their associated
   * storage items.
   */
  _removeFeatures = function () {
    Object.keys(_features).forEach(mode => {
      if (mode !== 'base') {
        Object.keys(_features[mode]).forEach(id => {
          _this.removeFeature(_this.getFeature(id));

          // Remove potentially saved values of Feature's Sliders
          sessionStorage.removeItem(id + '-depth');
          sessionStorage.removeItem(id + '-mag');
        });
      }
    });
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add the given Feature's content (i.e. the fetched data). Also render and
   * add its event listeners and Lightbox, if applicable.
   *
   * Optionally create the RTF document depending on the Feature's mode.
   *
   * @param feature {Object}
   */
  _this.addContent = function (feature) {
    var el;

    _app.MapPane.addContent(feature);
    _app.PlotsPane.addContent(feature);
    _app.SummaryPane.addContent(feature);
    _app.SettingsBar.updateTimeStamp(feature);
    _addCount(feature);

    if (feature.content) { // SideBar content
      el = document.getElementById(feature.id);
      el.innerHTML = feature.content;
    }
    if (feature.lightbox) {
      _addLightbox(feature);
    }
    if (feature.render) {
      feature.render();
    }
    if (feature.addListeners) {
      feature.addListeners();
    }

    if (feature.id === 'mainshock') {
      el.classList.remove('hide');
    }

    if (feature.mode === 'rtf') {
      _createRtf();
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
   * @param mode {String <base|comcat|dd|event|rtf>} default is 'event'
   */
  _this.createFeatures = function (mode = 'event') {
    var catalog = AppUtil.getParam('catalog') || 'comcat';

    if (mode === 'rtf') {
      _features.rtf = {}; // reset so _this.getStatus() is accurate
    }

    _MODULES[mode].forEach(module => {
      _createFeature(mode, module);
    });

    // Add the catalog-specific Features
    if (mode === 'event') {
      _this.createFeatures(catalog);
    }
  };

  /**
   * Get the Feature matching the given id.
   *
   * @param id {String}
   *     Feature id
   *
   * @return feature {Object}
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
   * @param mode {String <base|comcat|dd|event|rtf>} default is 'event'
   *
   * @return {Object}
   *     Features keyed by id
   */
  _this.getFeatures = function (mode = 'event') {
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
   * Get the given Feature's Lightbox instance.
   *
   * @param id {Object}
   *     Feature id
   *
   * @return {Object}
   */
  _this.getLightbox = function (id) {
    return _lightboxes[id] || {};
  };

  /**
   * Get the collective loading status (ready or not) of all Features for the
   * given display mode.
   *
   * @param mode {String <base|comcat|dd|event|rtf>} default is 'event'
   *
   * @return status {String <error|initialized|loading|ready>} default is ''
   */
  _this.getStatus = function (mode = 'event') {
    var numFeatures, numModules,
        catalog = AppUtil.getParam('catalog') || 'comcat',
        count = Object.keys(_features[mode]).length,
        status = ''; // default

    if (count === 1 && (mode === 'event' || mode === 'dd')) {
      status = 'loading'; // only the Mainshock is ready
    } else if (count !== 0) {
      status = 'ready';

      Object.keys(_features[mode]).forEach(id => {
        var feature = _this.getFeature(id);

        if (feature.status !== 'ready') {
          status = feature.status;
        }
      });

      // Account for status of Mainshock's ComCat or double-difference Features
      if (mode === 'event' && status === 'ready') {
        status = _this.getStatus(catalog);
      }
    }

    // Check that all RTF Features have been instantiated
    if (mode === 'rtf') {
      numFeatures = Object.keys(_features.rtf).length;
      numModules = _MODULES.rtf.length;

      if (numFeatures !== numModules) {
        status = 'loading';
      }
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
   * Refresh (update) the given Feature.
   *
   * @param id {Object}
   *     Feature id
   */
  _this.refreshFeature = function (id) {
    var feature = _this.getFeature(id),
        mode = _getMode(id),
        options = _getOptions(feature);

    feature.isRefreshing = true;

    if (mode !== 'base') {
      _this.getFeature('mainshock').disableDownload();
    }

    if (feature.mapLayer) { // layer control item is replaced by loader
      _app.MapPane.layerControl.removeLayer(feature.mapLayer);
    }

    _createFeature(mode, _modules[id], options);
  };

  /**
   * Re-create the given Feature after a failed request.
   *
   * @param id {String}
   *     Feature id
   * @param mode {String}
   *     display mode
   */
  _this.reloadFeature = function (id, mode) {
    if (id === 'mainshock') {
      _this.createFeatures(mode);
    } else {
      _createFeature(mode, _modules[id]);
    }
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
   *     set to false when swapping catalogs
   */
  _this.removeFeature = function (feature, destroy = true) {
    var id = feature.id;

    if (_this.isFeature(feature)) {
      _app.MapPane.removeFeature(feature);
      _app.PlotsPane.removeFeature(feature);
      _app.SummaryPane.removeFeature(feature);

      // SelectBar
      if (id === 'mainshock') {
        document.getElementById(id).innerHTML = ''; // Mainshock details
      } else if (id === 'significant-eqs') {
        document.getElementById(id).innerHTML = ''; // removes loader
      }

      if (destroy) {
        if (feature.removeListeners) {
          feature.removeListeners();
        }

        _removeCount(feature);
        feature.destroy();

        delete _features[feature.mode][id];
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

    _lightboxes = {};
  };

  /**
   * Restore the given Feature to its previous state, after a failed refresh.
   *
   * @param feature {Object}
   */
  _this.restoreFeature = function (feature) {
    var id = feature.id,
        mode = _getMode(id),
        prevFeature = feature.prevFeature;

    _addCount(prevFeature);
    _app.MapPane.layerControl.removeLayer(feature.mapLayer);
    _app.MapPane.layerControl.addOverlay(prevFeature.mapLayer, feature.name);

    _features[mode][id] = prevFeature;
    _features[mode][id].prevFeature = {};
  };

  /**
   * Event handler that shows a Feature's Lightbox.
   *
   * @param e {Event}
   */
  _this.showLightbox = function (e) {
    var el = e.target.closest('.feature'),
        id = Array.from(el.classList).find(className =>
          className !== 'content' && className !== 'feature'
        );

    e.preventDefault();

    if (_lightboxes[id]) {
      _lightboxes[id].show();
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Features;
