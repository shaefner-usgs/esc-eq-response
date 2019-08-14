'use strict';


var /*AftershocksFeature = require('features/AftershocksFeature'),
    FieldNotesFeature = require('features/FieldNotesFeature'),
    FocalMechanismFeature = require('features/FocalMechanismFeature'),
    ForeshocksFeature = require('features/ForeshocksFeature'),
    HistoricalFeature = require('features/HistoricalFeature'),*/
    MainshockFeature = require('features/MainshockFeature'),
    /* MomentTensorFeature = require('features/MomentTensorFeature'),
    StationsFeature = require('features/StationsFeature'),*/
    Xhr = require('util/Xhr');


var _FEATURECLASSES;

/**
 * Set which features get added, and the order they are loaded. Stacking order
 *   is set in CSS.
 *
 *   Mainshock must be first
 *
 *   IMPORTANT: the Object key must match the id property set in the Feature class
 *     This id value may be used in other .js and .css files; changing not recommended
 *
 * To add a new feature, create a new Feature class and then add it here.
 */
_FEATURECLASSES = {
  mainshock: MainshockFeature
  //aftershocks: AftershocksFeature,
  //foreshocks: ForeshocksFeature,
  //historical: HistoricalFeature,
  //stations: StationsFeature,
  //'focal-mechanism': FocalMechanismFeature,
  //'moment-tensor': MomentTensorFeature,
  //fieldnotes: FieldNotesFeature
};


/**
 * Create and add Features to map, plots and summary panes
 *
 * @param options {Object}
 *   {
 *     app: {Object}, // application props / methods
 *   }
 */
var Features = function (options) {
  var _this,
      _initialize,

      _app,
      _eqid,
      _features,

      _add,
      _load,
      _remove,
      _removeAll;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _features = {};

    // Flag to block mult. instances of feature from refreshing at the same time
    _this.isRefreshing = false;
  };

  /**
   * Add a feature to map, plots and summary panes
   *
   * @param feature {Object}
   */
  _add = function (feature) {
    _features[feature.id] = feature;

    try {
      // Create a new map pane and add feature to map, summary panes
      _app.MapPane.createMapPane(feature.id, 'overlayPane');
      _app.MapPane.addFeatureLayer(feature);
      _app.SummaryPane.add(feature);
      // TODO: add plots using feature.plotData

      if (feature.id === 'mainshock') {
        _app.EditPane.showMainshock();
        _app.EditPane.setDefaults();
      }
      // Feature finished loading; remove alert / set isRefreshing to false
      _app.StatusBar.removeItem(feature.id);
    }
    catch (error) {
      console.error(error);
      _app.StatusBar.addError(feature, '<h4>Error Creating ' + feature.name +
        '</h4><ul><li>' + error + '</li></ul>');
    }

    _this.isRefreshing = false;
  };

  /**
   * Load a feature (via json feed) and then call _add it once it's loaded
   *
   * @param feature {Object}
   */
  _load = function (feature) {
    var domain,
        errorMsg,
        matches;

    Xhr.ajax({
      url: feature.url,
      success: function (json) {
        if (feature.id === 'mainshock') {
          feature.json = json;
        }
        feature.createFeature();
        _add(feature);
      },
      error: function (status, xhr) {
        errorMsg = '<ul>';

        // Show response in console and add additional info to error message
        if (xhr.responseText) {
          console.error(xhr.responseText);

          if (xhr.responseText.match('limit of 20000')) { // status code 400
            errorMsg += '<li>Modify the parameters to match fewer ' +
              'earthquakes (max 20,000)</li>';
          }
          else if (xhr.responseText.match('parameter combination')){ // status code 400
            errorMsg += ' <li>Missing required parameters (all fields are ' +
              'required)</li>';
          }
        }
        if (status) {
          if (status === 404 && feature.id === 'mainshock') {
            errorMsg += ' <li>Event ID ' + _eqid + ' not found</li>';
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
      },
      ontimeout: function (xhr) {
        console.error(xhr);

        matches = feature.url.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
        domain = matches && matches[1];
        errorMsg += '<ul><li>Request timed out (can&rsquo;t connect to ' + domain +
          ')</li></ul>';
        //errorMsg += '<a href="#" class="reload"></a>';

        _app.StatusBar.addError(feature, errorMsg);
      },
      timeout: 20000
    });

    _this.isRefreshing = false;
  };

  /**
   * Remove a feature from map, plots and summary panes
   *
   * @param feature {Object}
   */
  _remove = function (feature) {
    var mapLayer,
        plotsEl,
        summaryEl;

    if (feature) {
      mapLayer = feature.mapLayer;
      plotsEl = document.querySelector('#plotsPane .' + feature.id);
      summaryEl = document.querySelector('#summaryPane .' + feature.id);

      if (mapLayer) {
        _app.MapPane.map.removeLayer(mapLayer);
        _app.MapPane.layerControl.removeLayer(mapLayer);
      }
      if (plotsEl) {
        _app.PlotsPane.remove(plotsEl);
      }
      if (summaryEl) {
        _app.SummaryPane.remove(summaryEl);
      }

      _features[feature.id] = {};
    }
  };

  /**
   * Remove all features from map, plots and summary panes
   */
  _removeAll = function () {
    if (_features) {
      Object.keys(_features).forEach(function(key) {
        _remove(_features[key]);
      });
    }
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Get a feature
   *
   * @param id {String}
   *     id of feature
   *
   * @return feature {Object}
   *   {
   *     displayLayer : {Boolean}, // Whether or not layer is "on" by default on map
   *     id : {String}, // Unique id of feature
   *     name : {String}, // Display name of feature
   *     url : {String}, // URL of json feed to fetch data from
   *     zoomToLayer : {Boolean}, // Whether or not map zoooms to fit layer
   *
   *     Note: The following props are set after external feed data is loaded
   *
   *     json : {Object}, // JSON feed data (mainshock only)
   *     mapLayer : {}, // Leaflet map layer for MapPane
   *     plotData : {}, // Plot data formatted for Plot.ly for PlotPane
   *     summary : {}, // HTML for SummaryPane
   *   }
   */
  _this.getFeature = function (id) {
    var feature;

    Object.keys(_features).forEach(function(key) {
      if (id === key) {
        feature = _features[key];
      }
    });

    return feature;
  };

  /**
   * Initialize (execute) each Feature class and then load its feed data
   *
   * @param addMe {Object}
   */
  _this.initFeatures = function (featureClasses) {
    var FeatureClass;

    featureClasses = featureClasses || _FEATURECLASSES;
    _eqid = _app.AppUtil.getParam('eqid');

    Object.keys(featureClasses).forEach(function(key) {
      FeatureClass = featureClasses[key];

      var feature = FeatureClass({
        app: _app,
        eqid: _eqid
      });
      _load(feature);
    });
  };

  /**
   * Refresh a feature
   *
   * @param id {String}
   */
  _this.refresh = function (id) {
    var feature,
        options;

    feature = _this.getFeature(id);
    options = {};
    options[feature.id] = _FEATURECLASSES[feature.id]; // use variable value for key name

    _this.isRefreshing = true;

    _remove(feature);

    _this.initFeatures(options);

    // TODO: also refresh Fieldnotes if refreshing aftershocks
  };

  /**
   * Reset to initial state
   */
  _this.reset = function () {
    _removeAll();

    _eqid = null;
    _features = {};
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Features;
