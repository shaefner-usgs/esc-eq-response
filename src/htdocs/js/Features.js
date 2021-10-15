'use strict';


var Aftershocks = require('features/Aftershocks'),
    FieldNotes = require('features/FieldNotes'),
    FocalMechanism = require('features/FocalMechanism'),
    Foreshocks = require('features/Foreshocks'),
    Historical = require('features/Historical'),
    Mainshock = require('features/Mainshock'),
    MomentTensor = require('features/MomentTensor'),
    PagerCities = require('features/PagerCities'),
    PagerExposures = require('features/PagerExposures'),
    ShakeMapStations = require('features/ShakeMapStations');


/**
 * Set which Features get added, and the order they are loaded (Mainshock must
 * be first). Stacking order is set in CSS.
 */
var _FEATURECLASSES = [
  Mainshock,
  PagerCities, // load ASAP: dependency for PagerExposures
  FocalMechanism,
  MomentTensor,
  Aftershocks,
  Foreshocks,
  Historical,
  PagerExposures,
  ShakeMapStations,
  FieldNotes
];


/**
 * Load, create, add, remove and refresh Features on Map/Plots/SummaryPanes.
 *
 * @param options {Object}
 *   {
 *     app: {Object} Application
 *   }
 *
 * @return _this {Object}
 *   {
 *     createFeature: {Function}
 *     getFeature: {Function}
 *     getFeatures: {Function}
 *     getLoadingStatus: {Function}
 *     isFeature: {Function}
 *     postInit: {Function}
 *     refreshFeature: {Function}
 *     reset: {Function}
 *   }
 */
var Features = function (options) {
  var _this,
      _initialize,

      _app,
      _features,
      _prevFeatures,

      _addFeature,
      _addLoaders,
      _cacheFeature,
      _checkDependencies,
      _createFeatures,
      _initFeatures,
      _loadFeature,
      _removeFeatures,
      _removeFeature;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _features = {};
    _prevFeatures = {};
  };

  /**
   * Add the given Feature to Map/Plots/SummaryPanes; add the Feature's count to
   * SettingsBar.
   *
   * @param feature {Object}
   */
  _addFeature = function (feature) {
    var status = _this.getLoadingStatus();

    try {
      _app.MapPane.addFeature(feature);
      _app.PlotsPane.addFeature(feature);
      _app.SettingsBar.addCount(feature);
      _app.SummaryPane.addFeature(feature);

      if (feature.id === 'mainshock') {
        feature.addListeners();
        _app.SelectBar.showMainshock();
        _app.SettingsBar.setDefaults();
        _app.SignificantEqs.replaceList(); // select the Mainshock if it exists

        document.body.classList.add('mainshock');

        // Create the other Features now that the Mainshock is ready
        _createFeatures();
      }

      if (status === 'complete') {
        _this.getFeature('mainshock').enableButton();
      }
    } catch (error) {
      _app.StatusBar.addError({
        id: feature.id,
        message: `<h4>Error Adding ${feature.name}</h4><ul><li>${error}</li></ul>`
      });
      _removeFeature(feature);

      console.error(error);
    }
  };

  /**
   * Add a 'loader' on Edit/Map/Plots/SummaryPanes while fetching data for a
   * Feature. Also adds the Feature's name in a container <div> on
   * Plots/SummaryPanes and in the layer controller on MapPane.
   *
   * @param feature {Object}
   */
  _addLoaders = function (feature) {
    _app.MapPane.addLoader(feature);
    _app.PlotsPane.addLoader(feature);
    _app.SettingsBar.addLoader(feature);
    _app.SummaryPane.addLoader(feature);
  };

  /**
   * Cache an existing Feature (in an Array due to the potential of 'stacked'
   * Fetch requests). Used to purge the 'previous' Feature when a refresh
   * completes.
   *
   * @param feature {Object}
   */
  _cacheFeature = function (feature) {
    if (!Object.prototype.hasOwnProperty.call(_prevFeatures, feature.id)) {
      _prevFeatures[feature.id] = [];
    }

    _prevFeatures[feature.id].push(feature);
  };

  /**
   * Check for dependencies for a given Feature and delay creating the Feature
   * until its dependencies are ready.
   *
   * @param feature {Object}
   *
   * @return status {String}
   */
  _checkDependencies = function (feature) {
    var dependency,
        status;

    status = 'complete'; // default

    if (Array.isArray(feature.dependencies)) { // load dependencies first
      feature.dependencies.forEach(id => {
        dependency = _features[id];

        if (dependency.isLoading) {
          status = 'loading';

          setTimeout(() => {
            _this.createFeature(feature.id);
          }, 250);
        }
      });
    }

    return status;
  };

  /**
   * Wrapper method to create Features. Skips the Mainshock which was already
   * created since other Features depend on it.
   */
  _createFeatures = function () {
    Object.keys(_features).forEach(id => {
      if (id !== 'mainshock') {
        _this.createFeature(id);
      }
    });
  };

  /**
   * Instantiate Features and store them in _features.
   */
  _initFeatures = function () {
    var feature;

    _FEATURECLASSES.forEach(FeatureClass => {
      feature = FeatureClass({
        app: _app
      });

      feature.isLoading = true;
      _features[feature.id] = feature;
    });
  };

  /**
   * Load feed data (if available) for a given Feature and then create/add it.
   *
   * @param feature {Object}
   */
  _loadFeature = function (feature) {
    if (feature.url) {
      _addLoaders(feature);
      _app.JsonFeed.fetch(feature).then(json => {
        if (json) {
          feature.isLoading = false;

          feature.create(json);
          _addFeature(feature);
        } else {
          _removeFeature(feature);
        }
      }).catch(error => {
        _app.StatusBar.addError({
          id: feature.id,
          message: `<h4>Error Adding ${feature.name}</h4><ul><li>${error}</li></ul>`
        });

        console.error(error);
      });
    } else { // data feed not available
      feature.isLoading = false;
    }
  };

  /**
   * Remove all Features from Map/Plots/SummaryPanes and destroy them.
   */
  _removeFeatures = function () {
    var feature;

    if (_features) {
      Object.keys(_features).forEach(id => {
        feature = _features[id];

        _removeFeature(feature);
        feature.destroy();
      });
    }

    document.body.classList.remove('mainshock');
  };

  /**
   * Remove the given Feature from Map/Plots/SummaryPanes; remove the Feature's
   * count from SettingsBar.
   *
   * @param feature {Object}
   */
  _removeFeature = function (feature) {
    if (_this.isFeature(feature.id)) {
      _app.MapPane.removeFeature(feature);
      _app.PlotsPane.removeFeature(feature);
      _app.SettingsBar.removeCount(feature);
      _app.SummaryPane.removeFeature(feature);
    }
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Create the Feature matching the given id value.
   *
   * @param id {String}
   *     Feature id
   */
  _this.createFeature = function (id) {
    var feature,
        status;

    if (_this.isFeature(id)) {
      feature = _features[id];
      feature.isLoading = true;
      status = _checkDependencies(feature);

      if (status === 'loading') {
        return; // dependencies are not ready
      }

      if (feature.setFeedUrl) {
        feature.setFeedUrl();
        _loadFeature(feature); // creates Feature after loading data
      } else { // data feed not required
        feature.isLoading = false;

        feature.create();
        _addFeature(feature);
      }
    }
  };

  /**
   * Get the Feature matching the given id value.
   *
   * @param id {String}
   *     Feature id
   *
   * @return feature {Object|undefined}
   *   {
   *     Required props
   *
   *     create: {Function}
   *     id: {String} unique Feature id
   *     name: {String} display name of Feature
   *
   *     Example of optional props that might also be set
   *
   *     count: {Integer} number of items
   *     dependencies: {Array} other Features that need to be loaded first
   *     description: {String} text description of Feature
   *     json: {String} JSON feed data (Mainshock only)
   *     mapLayer: {L.Layer} Leaflet map layer for MapPane
   *     plotTraces: {Object} data traces for PlotsPane formatted for Plot.ly
   *     showLayer: {Boolean} whether or not map layer is "on" by default
   *     summary: {String} HTML for SummaryPane
   *     url: {String} URL of feed data for Feature
   *     zoomToLayer: {Boolean} whether or not map zooms to fit layer by default
   *   }
   */
  _this.getFeature = function (id) {
    return _features[id];
  };

  /**
   * Get all Features, keyed by their id value.
   *
   * @return _features {Object}
   */
  _this.getFeatures = function () {
    return _features;
  };

  /**
   * Get the loading status of Features.
   *
   * @return status {String}
   */
  _this.getLoadingStatus = function () {
    var status = 'complete'; // default

    Object.keys(_features).forEach(id => {
      if (_features[id].isLoading) {
        status = 'loading';
      }
    });

    return status;
  };

  /**
   * Check if the given id matches an existing Feature's id value.
   *
   * @param id {String}
   *
   * @return isFeature {Boolean}
   */
  _this.isFeature = function (id) {
    var isFeature = false; // default

    Object.keys(_features).forEach(function(key) {
      if (id === key) {
        isFeature = true;
      }
    });

    return isFeature;
  };

  /**
   * Initialization that depends on other Classes being ready before running.
   */
  _this.postInit = function () {
    _initFeatures();
  };

  /**
   * Refresh the given Feature.
   *
   * @param feature {Object}
   *     existing Feature before refresh
   */
  _this.refreshFeature = function (feature) {
    var prevFeature;

    if (_this.isFeature(feature.id)) {
      _this.getFeature('mainshock').disableButton();
      _cacheFeature(feature);

      prevFeature = _prevFeatures[feature.id].shift(); // 'oldest' Feature

      _removeFeature(prevFeature);

      if (feature.reset) {
        feature.reset();
      }

      _this.createFeature(feature.id);

      // Refresh FieldNotes when Aftershocks is refreshed (shares SettingsBar params)
      if (feature.id === 'aftershocks') {
        _this.refreshFeature(_features.fieldnotes);
      }
    }
  };

  /**
   * Reset to initial state; remove all Features.
   */
  _this.reset = function () {
    _removeFeatures();

    _features = {};
    _prevFeatures = {};

    _initFeatures();
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Features;
