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
    ShakeMapStations = require('features/ShakeMapStations'),
    Xhr = require('util/Xhr');


var _FEATURECLASSES;

/**
 * Set which Features get added, and the order they are loaded (Mainshock must
 *   be first). Stacking order is set in CSS.
 *
 * IMPORTANT: the Object key must match the id property set in the Feature class.
 *   This id value is sometimes used as a reference in other .js/.css files.
 */
_FEATURECLASSES = {
  mainshock: Mainshock,
  'pager-exposures': PagerExposures, // dependency for PagerCities
  'focal-mechanism': FocalMechanism,
  'moment-tensor': MomentTensor,
  aftershocks: Aftershocks,
  foreshocks: Foreshocks,
  historical: Historical,
  'pager-cities': PagerCities,
  'shakemap-stations': ShakeMapStations,
  fieldnotes: FieldNotes
};


/**
 * Create, load and add/remove Features on map, plots and summary panes
 *
 * @param options {Object}
 *   {
 *     app: {Object} // Application
 *   }
 *
 * @return _this {Object}
 *   {
 *     getFeature: {Function},
 *     getFeatureId: {Function},
 *     getFeatures: {Function},
 *     getStatus: {Function},
 *     instantiateMainshock: {Function},
 *     refreshFeature: {Function},
 *     reset: {Function}
 *   }
 */
var Features = function (options) {
  var _this,
      _initialize,

      _app,
      _eqid,
      _features,
      _numFeatures,

      _addFeature,
      _initFeature,
      _instantiateFeature,
      _instantiateFeatures,
      _loadJson,
      _removeFeature,
      _removeAllFeatures;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _features = {};
  };

  /**
   * Add a Feature to map, plots and summary panes
   *
   * @param feature {Object}
   */
  _addFeature = function (feature) {
    _features[feature.id] = feature;

    try {
      // Add feature to map, summary and plot panes
      _app.MapPane.addFeature(feature);
      _app.PlotsPane.addFeature(feature);
      _app.SummaryPane.addFeature(feature);

      if (feature.id === 'mainshock') {
        _app.EditPane.showMainshock();
        _app.EditPane.setDefaults();

        // Instantiate other Features now that Mainshock ready
        _instantiateFeatures();
      }

      // Feature finished loading; remove alert
      _app.StatusBar.removeItem(feature.id);
    }
    catch (error) {
      console.error(error);
      _app.StatusBar.addError(feature, '<h4>Error Creating ' + feature.name +
        '</h4><ul><li>' + error + '</li></ul>');
    }
  };

  /**
   * Initialize a Feature
   *
   * First, load feed data if Feature's getFeedUrl method is set, then
   *   initialize (create) and add feature
   *
   * @param feature {Object}
   */
  _initFeature = function (feature) {
    var flag;

    if (typeof feature.getFeedUrl === 'function') { // gets url of feed data
      if (feature.dependencies) { // finish loading dependencies first
        feature.dependencies.forEach(function(dependency) {
          if (!_this.getFeature(dependency)) { // dependency not ready
            flag = 'waiting';
            window.setTimeout(function() {
              _initFeature(feature);
            }, 250);
          }
        });
        if (flag === 'waiting') {
          return; // exit if dependencies are not ready
        }
      }
      _loadJson(feature); // load feature's feed data
    } else { // no external feed data needed
      feature.initFeature();
      _addFeature(feature);
    }
  };

  /**
   * Instantiate a Feature
   *
   * @param FeatureClass {Object}
   */
  _instantiateFeature = function (FeatureClass) {
    var feature;

    feature = FeatureClass({
      app: _app,
      eqid: _eqid
    });

    _initFeature(feature);
  };

  /**
   * Wrapper method to loop through Feature classes and instantiate them
   *
   * Skip mainshock which was already added (via _this.instantiateMainshock)
   *   so it's available for other Features that depend on it.
   *
   * @param featureClasses {Object}
   *     optional; uses _FEATURECLASSES if no parameter is passed
   */
  _instantiateFeatures = function (featureClasses) {
    var FeatureClass;

    featureClasses = featureClasses || _FEATURECLASSES;
    _numFeatures = Object.keys(featureClasses).length;

    Object.keys(featureClasses).forEach(function(id) {
      if (id !== 'mainshock') { // skip mainshock (already done)
        _features[id] = false; // flag as not yet loaded

        FeatureClass = featureClasses[id];
        _instantiateFeature(FeatureClass);
      }
    });
  };

  /**
   * Load a json feed
   *
   * @param feature {Object}
   */
  _loadJson = function (feature) {
    var domain,
        errorMsg,
        matches,
        url;

    errorMsg = '<h4>Error Loading ' + feature.name + '</h4>';
    url = feature.getFeedUrl();

    _app.StatusBar.addItem(feature);

    Xhr.ajax({
      url: url,
      success: function (json) {
        if (feature.id === 'mainshock') {
          feature.json = json; // store mainshock json (used by other features)
        }
        feature.initFeature(json);
        _addFeature(feature);

        feature.isRefreshing = false;
      },
      error: function (status, xhr) {
        errorMsg += '<ul>';

        // Show response in console and add additional info to error message
        if (xhr.responseText) {
          console.error(xhr.responseText);

          if (xhr.responseText.match('limit of 20000')) { // status code 400
            errorMsg += '<li>Modify the parameters to match fewer ' +
              'earthquakes (max 20,000)</li>';
          }
          else if (xhr.responseText.match('parameter combination')){ // status code 400
            errorMsg += '<li>Missing required parameters (all fields are ' +
              'required)</li>';
          }
        }
        if (status) {
          if (status === 404 && feature.id === 'mainshock') {
            errorMsg += '<li>Event ID ' + _eqid + ' not found</li>';
          }
          else if (status.message) {
            errorMsg += '<li>' + status.message + '</li>';
          }
          else {
            errorMsg += '<li>http status code: ' + status + '</li>';
          }
        }

        errorMsg += '</ul>';
        _app.StatusBar.addError(feature, errorMsg);

        feature.isRefreshing = false;
      },
      ontimeout: function (xhr) {
        console.error(xhr);

        matches = url.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
        domain = matches && matches[1];
        errorMsg += '<ul><li>Request timed out (can&rsquo;t connect to ' + domain +
          ')</li></ul>';
        //errorMsg += '<a href="#" class="reload"></a>';

        _app.StatusBar.addError(feature, errorMsg);

        feature.isRefreshing = false;
      },
      timeout: 20000
    });
  };

  /**
   * Remove a Feature from map, plots and summary panes
   *
   * @param feature {Object}
   */
  _removeFeature = function (feature) {
    if (feature) {
      _app.MapPane.removeFeature(feature);
      _app.PlotsPane.removeFeature(feature);
      _app.SummaryPane.removeFeature(feature);
    }
  };

  /**
   * Remove all Features from map, plots and summary panes
   */
  _removeAllFeatures = function () {
    if (_features) {
      Object.keys(_features).forEach(function(id) {
        _removeFeature(_features[id]);
      });
    }
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Get a Feature
   *
   * @param id {String}
   *     id of feature
   *
   * @return feature {Object}
   *   {
   *     showLayer: {Boolean}, // whether or not map layer is "on" by default
   *     id: {String}, // unique id of feature
   *     name: {String}, // display name of feature
   *     zoomToLayer: {Boolean}, // whether or not map zoooms to fit layer
   *
   *   The following (optional) props are set after external feed data is loaded
   *
   *     description: {String}, // text description of feature's parameters
   *     json: {String}, // json feed data (mainshock only)
   *     mapLayer: {L.Layer}, // Leaflet map layer for MapPane
   *     plotTraces: {Object}, // data traces for PlotPane formatted for Plot.ly
   *     summary: {String}, // HTML for SummaryPane
   *     title: {Number} // typically the feature's name with count appended
   *   }
   */
  _this.getFeature = function (id) {
    var feature;

    Object.keys(_features).forEach(function(key) {
      if (id === key) {
        feature = _features[id];
      }
    });

    return feature;
  };

  /**
   * Get a Feature's id from its name/title
   *
   * @param name {String}
   *     name (or title) property of Feature
   *
   * @return id {String}
   */
  _this.getFeatureId = function (name) {
    var feature,
        id;

    Object.keys(_features).forEach(function(key) {
      feature = _features[key];
      if (name === feature.name || name === feature.title) {
        id = key;
      }
    });

    return id;
  };

  /**
   * Get all Features
   *
   * @return _features {Object}
   */
  _this.getFeatures = function () {
    return _features;
  };

  /**
   * Get status of loading Features
   *
   * @return status {String}
   *     Returns 'finished' if all Features are loaded
   */
  _this.getStatus = function () {
    var allFeatures,
        status;

    status = 'finished';

    if (Object.keys(_features).length === _numFeatures) {
      allFeatures = true; // all Features have been instantiated
    }

    Object.keys(_features).some(function(id) {
      if (!allFeatures || !_features[id]) {
        status = '';
      }
    });

    return status;
  };

  /**
   * Wrapper method to instantiate mainshock Feature
   */
  _this.instantiateMainshock = function () {
    _eqid = _app.AppUtil.getParam('eqid');

    _instantiateFeature(_FEATURECLASSES.mainshock);
  };

  /**
   * Refresh a Feature when user manipulates parameters on edit pane
   *
   * @param feature {Object}
   */
  _this.refreshFeature = function (feature) {
    if (feature) {
      feature.isRefreshing = true; // flag to block multiple/simultaneous refreshes

      _removeFeature(feature);
      _initFeature(feature);

      // Also refresh FieldNotes when Aftershocks Feature is refreshed
      if (feature.id === 'aftershocks') {
        _this.refreshFeature(_this.getFeature('fieldnotes'));
      }
    }
  };

  /**
   * Reset to initial state
   */
  _this.reset = function () {
    _removeAllFeatures();

    _eqid = null;
    _features = {};
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Features;
