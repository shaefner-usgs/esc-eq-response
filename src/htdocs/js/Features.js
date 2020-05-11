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
    Xhr = require('util/Xhr');


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
 *     getStatus: {Function},
 *     instantiateFeature: {Function},
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
      _showLayer,

      _addFeature,
      _addLoadingSpinner,
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
    _showLayer = {};
  };

  /**
   * Add a Feature to map, plots and summary panes; add count to edit pane
   *
   * @param feature {Object}
   */
  _addFeature = function (feature) {
    _features[feature.id] = feature; // store added feature

    try {
      // Add Feature to map, plots and summary panes if property is set
      _app.MapPane.addFeature(feature); // 'mapLayer' property
      _app.PlotsPane.addFeature(feature); // 'plotTraces' property
      _app.SummaryPane.addFeature(feature); // 'summary' property

      // Add Feature's count if applicable (aftershocks, foreshocks, historical)
      _app.EditPane.addCount(feature);

      if (feature.id === 'mainshock') {
        _app.EditPane.showMainshock();
        _app.EditPane.setDefaults();

        // Instantiate other Features now that Mainshock ready
        _instantiateFeatures();
      }
    }
    catch (error) {
      console.error(error);

      _app.StatusBar.addError(feature.id, '<h4>Error Adding ' + feature.name +
        '</h4><ul><li>' + error + '</li></ul>');
      _removeFeature(feature);
    }
  };

  /**
   * Add a container with only the Feature's name and a loading 'spinner' to
   *   map, plots and summary panes while data is being fetched
   *
   * @param feature {Object}
   */
  _addLoadingSpinner = function (feature) {
    _app.EditPane.addLoadingSpinner(feature);
    _app.MapPane.addLoadingSpinner(feature);
    _app.PlotsPane.addLoadingSpinner(feature);
    _app.SummaryPane.addLoadingSpinner(feature);
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
    var flag;

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

    if (_showLayer.hasOwnProperty(feature.id)) { // used cached value if set
      feature.showLayer = _showLayer[feature.id];
    }

    if (feature.url) {
      _addLoadingSpinner(feature);
      _loadJson(feature);
    } else { // Feature does not require feed data, or it's not available
      feature.initFeature();
      _addFeature(feature);
    }
  };

  /**
   * Wrapper method to loop through Feature classes and instantiate them
   *
   * Skip mainshock which is added separately so it's available for other
   *   Features that depend on it.
   */
  _instantiateFeatures = function () {
    _numFeatures = Object.keys(_FEATURECLASSES).length;

    Object.keys(_FEATURECLASSES).forEach(function(id) {
      if (id !== 'mainshock') { // skip mainshock (already done)
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
        feature.isLoading = false;
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

        _app.StatusBar.addError(feature.id, errorMsg);
        _removeFeature(feature);
      },
      ontimeout: function (xhr) {
        console.error(xhr);

        matches = feature.url.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
        domain = matches && matches[1];
        errorMsg += '<ul><li>Request timed out (can&rsquo;t connect to ' + domain +
          ')</li></ul>';

        _app.StatusBar.addError(feature.id, errorMsg);
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
  _this.getStatus = function () {
    var status = '';

    if (Object.keys(_features).length === _numFeatures) {
      status = 'finished';
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

      _initFeature(feature);
    }
  };

  /**
   * Refresh a Feature when user manipulates parameters on edit pane
   *
   * @param feature {Object}
   */
  _this.refreshFeature = function (feature) {
    if (feature) {
      feature.isLoading = true; // flag to block multiple/simultaneous refreshes
      if (feature.plotTraces) {
        _app.PlotsPane.rendered = false;
      }

      _removeFeature(feature);
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
    _numFeatures = null;
    _showLayer = {};
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Features;
