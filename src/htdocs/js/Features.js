'use strict';


var Aftershocks = require('features/Aftershocks'),
    AppUtil = require('AppUtil'),
    FieldNotes = require('features/FieldNotes'),
    FocalMechanism = require('features/FocalMechanism'),
    Foreshocks = require('features/Foreshocks'),
    Historical = require('features/Historical'),
    Mainshock = require('features/Mainshock'),
    MomentTensor = require('features/MomentTensor'),
    PagerCities = require('features/PagerCities'),
    PagerExposures = require('features/PagerExposures'),
    ShakeMapStations = require('features/ShakeMapStations'),
    Xhr = require('hazdev-webutils/src/util/Xhr');


var _FEATURECLASSES;

/**
 * Set which Features get added, and the order they are loaded (Mainshock must
 *   be first). Stacking order is set in CSS.
 *
 * IMPORTANT: the Object key must match the id property set in the Feature class.
 *   This id value might also used as a reference in other .js/.css files.
 */
_FEATURECLASSES = {
  mainshock: Mainshock,
  'pager-exposures': PagerExposures, // load ASAP: dependency for PagerCities
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
 * Create, load, refresh and add/remove Features on map, plots and summary panes
 *
 * @param options {Object}
 *   {
 *     app: {Object} // Application
 *   }
 *
 * @return _this {Object}
 *   {
 *     getFeature: {Function},
 *     getFeatures: {Function},
 *     getLoadingStatus: {Function},
 *     instantiateFeature: {Function},
 *     isFeature: {Function},
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
      _prevFeatures,
      _showLayer,
      _totalFeatures,

      _addFeature,
      _addLoader,
      _cacheFeature,
      _initFeature,
      _instantiateFeatures,
      _loadJson,
      _removeFeature,
      _removeAllFeatures;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _features = {};
    _prevFeatures = {};
    _showLayer = {};
  };

  /**
   * Add a Feature to map, plots and summary panes; add count to edit pane
   *
   * @param feature {Object}
   */
  _addFeature = function (feature) {
    feature.isLoading = false;

    try {
      // Add Feature to map, plots and summary panes if property is set
      _app.MapPane.addFeature(feature); // 'mapLayer' property
      _app.PlotsPane.addFeature(feature); // 'plotTraces' property
      _app.SummaryPane.addFeature(feature); // 'summary' property
      _app.EditPane.addFeature(feature); // 'count' property

      if (feature.id === 'mainshock') {
        _app.EditPane.showMainshock();
        _app.EditPane.setDefaults();

        // Instantiate other Features now that Mainshock ready
        _instantiateFeatures();
      }
    }
    catch (error) {
      console.error(error);

      _app.StatusBar.addError({
        id: feature.id,
        message: '<h4>Error Adding ' + feature.name + '</h4><ul><li>' + error +
          '</li></ul>'
      });
      _removeFeature(feature);
    }
  };

  /**
   * Add a container with only the Feature's name and a 'loader' to map, plots
   *   and summary panes while data is being fetched
   *
   * @param feature {Object}
   */
  _addLoader = function (feature) {
    _app.EditPane.addLoader(feature);
    _app.MapPane.addLoader(feature);
    _app.PlotsPane.addLoader(feature);
    _app.SummaryPane.addLoader(feature);
  };

  /**
   * Cache a previous Feature - store in Array because multiple Ajax requests
   *   can 'stack up'
   *
   * Used to purge former Feature when Feature refresh is complete
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
   * Initialize a Feature
   *
   * First, load feed data (if Feature's url property is set); call methods to
   *    create / add Feature (via _loadJson's callback if loading feed data)
   *
   * @param feature {Object}
   */
  _initFeature = function (feature) {
    var dependency,
        flag;

    if (Array.isArray(feature.dependencies)) { // finish loading dependencies first
      feature.dependencies.forEach(function(id) {
        dependency = _this.getFeature(id);
        if (!dependency || dependency.isLoading) {
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

    if (Object.prototype.hasOwnProperty.call(_showLayer, feature.id)) {
      feature.showLayer = _showLayer[feature.id]; // used cached value
    }

    if (typeof(feature.url) === 'string') {
      if (feature.url) {
        _addLoader(feature);
        _loadJson(feature);
      } else { // no feed data available
        feature.isLoading = false;
      }
    } else { // Feature does not require remote feed data
      feature.initFeature();
      _addFeature(feature);
    }
  };

  /**
   * Wrapper method to loop through Feature classes and instantiate them
   *
   * Mainshock already created separately so it's available for Features that
   *   depend on it.
   */
  _instantiateFeatures = function () {
    _totalFeatures = Object.keys(_FEATURECLASSES).length;

    Object.keys(_FEATURECLASSES).forEach(function(id) {
      if (id !== 'mainshock') { // skip mainshock
        _this.instantiateFeature(id);
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
        matches;

    errorMsg = '<h4>Error Loading ' + feature.name + '</h4>';

    _app.StatusBar.addItem(feature);

    Xhr.ajax({
      url: feature.url,
      success: function (json) {
        if (feature.id === 'mainshock') {
          feature.json = json; // store mainshock json (used by other features)
        }

        feature.initFeature(json);
        _addFeature(feature);
        _app.StatusBar.removeItem(feature.id);
      },
      error: function (status, xhr) {
        errorMsg += '<ul>';

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

        _app.StatusBar.addError({
          id: feature.id,
          message: errorMsg,
          status: status
        });
        _removeFeature(feature);
      },
      ontimeout: function (xhr) {
        console.error(xhr);

        matches = feature.url.match(/^https?:\/\/([^/?#]+)(?:[/?#]|$)/i);
        domain = matches && matches[1];
        errorMsg += '<ul><li>Request timed out (can&rsquo;t connect to ' + domain +
          ')</li></ul>';

        _app.StatusBar.addError({
          id: feature.id,
          message: errorMsg
        });
        _removeFeature(feature);
      },
      timeout: 20000
    });
  };

  /**
   * Remove a Feature from map, plots and summary panes, and destroy it
   *
   * @param feature {Object}
   */
  _removeFeature = function (feature) {
    if (feature) {
      _app.EditPane.removeFeature(feature);
      _app.MapPane.removeFeature(feature);
      _app.PlotsPane.removeFeature(feature);
      _app.SummaryPane.removeFeature(feature);

      _showLayer[feature.id] = feature.showLayer; // cache value

      delete _features[feature.id];
      feature.destroy();
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
   *     Required props:
   *
   *     destroy: {Function}, // garbage collection
   *     id: {String}, // unique id of feature
   *     name: {String}, // display name of feature
   *
   *     Example of optional props that might also be set:
   *
   *     count: {Integer}, // number of items
   *     dependencies: {Array}, // other features that need to be loaded first
   *     description: {String}, // text description of feature
   *     json: {String}, // json feed data (mainshock only)
   *     mapLayer: {L.Layer}, // Leaflet map layer for MapPane
   *     plotTraces: {Object}, // data traces for PlotPane formatted for Plot.ly
   *     showLayer: {Boolean}, // whether or not mapLayer is "on" by default
   *     summary: {String}, // HTML for SummaryPane
   *     url: {String}, // URL of feed data for Feature
   *     zoomToLayer: {Boolean}, // whether or not map zooms to fit layer by default
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
   */
  _this.getLoadingStatus = function () {
    var numFeatures,
        status;

    numFeatures = Object.keys(_features).length;
    status = 'loading';

    if (numFeatures === _totalFeatures) {
      status = 'finished';

      Object.keys(_features).forEach(function(id) {
        if (_features[id].isLoading) {
          status = 'loading';
        }
      });
    }

    return status;
  };

  /**
   * Instantiate a Feature
   *
   * @param id {String}
   */
  _this.instantiateFeature = function (id) {
    var feature,
        FeatureClass;

    FeatureClass = _FEATURECLASSES[id];

    if (FeatureClass) {
      if (id === 'mainshock') {
        _eqid = AppUtil.getParam('eqid');
      }

      feature = FeatureClass({
        app: _app,
        eqid: _eqid
      });
      feature.isLoading = true;

      _features[feature.id] = feature; // store new feature

      _initFeature(feature);
    }
  };

  /**
   * Check if id matches any Feature's id value
   *
   * @param id {String}
   *
   * @return isFeature {Boolean}
   */
  _this.isFeature = function (id) {
    var isFeature = false;

    Object.keys(_FEATURECLASSES).forEach(function(key) {
      if (id === key) {
        isFeature = true;
      }
    });

    return isFeature;
  };

  /**
   * Refresh a Feature - called when user manipulates parameters on edit pane
   *
   * @param feature {Object}
   *     existing Feature before refresh
   */
  _this.refreshFeature = function (feature) {
    var oldestFeature;

    if (feature) {
      _cacheFeature(feature);

      // Remove previous Feature ('oldest' in Array), then create new Feature
      oldestFeature = _prevFeatures[feature.id].shift();
      _removeFeature(oldestFeature);
      _this.instantiateFeature(feature.id);

      // Also refresh FieldNotes when Aftershocks is refreshed (uses same params)
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
    _showLayer = {};
    _totalFeatures = null;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Features;
