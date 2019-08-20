'use strict';


var Aftershocks = require('features/Aftershocks'),
    /*FieldNotes = require('features/FieldNotes'),
    FocalMechanism = require('features/FocalMechanism'),
    Foreshocks = require('features/Foreshocks'),
    Historical = require('features/Historical'),*/
    Mainshock = require('features/Mainshock'),
    /* MomentTensor = require('features/MomentTensor'),
    ShakeMapStations = require('features/ShakeMapStations'),*/
    Xhr = require('util/Xhr');


var _FEATURECLASSES;

/**
 * Set which features get added, and the order they are loaded (Mainshock must
 *   be first). Stacking order is set in CSS.
 *
 * IMPORTANT: the Object key must match the id property set in the Feature class.
 *   This id value is used in other .js and .css files for some features.
 */
_FEATURECLASSES = {
  mainshock: Mainshock,
  aftershocks: Aftershocks
  //foreshocks: Foreshocks,
  //historical: Historical,
  //'shakemap-stations': ShakeMapStations,
  //'focal-mechanism': FocalMechanism,
  //'moment-tensor': MomentTensor,
  //fieldnotes: FieldNotes
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
      _intiFeature,
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
      // Create a new map pane and add feature to map, summary and plot panes
      _app.MapPane.createMapPane(feature.id, 'overlayPane');
      _app.MapPane.addFeatureLayer(feature);
      _app.PlotsPane.add(feature);
      _app.SummaryPane.add(feature);

      if (feature.id === 'mainshock') {
        _app.EditPane.showMainshock();
        _app.EditPane.setDefaults();

        // Initialize other features now that mainshock ready
        _this.initFeatures();
      }

      // Feature finished loading; remove alert
      _app.StatusBar.remove(feature.id);
    }
    catch (error) {
      console.error(error);
      _app.StatusBar.addError(feature, '<h4>Error Creating ' + feature.name +
        '</h4><ul><li>' + error + '</li></ul>');
    }

    _this.isRefreshing = false;
  };

  /**
   * Initialize (execute) Feature class and then load its feed data
   */
  _intiFeature = function (FeatureClass) {
    _eqid = _app.AppUtil.getParam('eqid');

    var feature = FeatureClass({
      app: _app,
      eqid: _eqid
    });
    _load(feature);
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

    _app.StatusBar.addLoadingMsg(feature);

    Xhr.ajax({
      url: feature.url,
      success: function (json) {
        if (feature.id === 'mainshock') {
          feature.json = json; // store mainshock json (used by other features)
        }
        feature.createFeature(json);
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
   * Get the feed url for aftershocks, foreshocks and historical features
   *
   * @param params {Object}
   *
   * @return {String}
   */
  _this.getEqFeedUrl = function (params) {
    var baseUri,
        pairs,
        queryString;

    baseUri = 'https://earthquake.usgs.gov/fdsnws/event/1/query';

    pairs = ['format=geojson', 'orderby=time-asc'];
    Object.keys(params).forEach(function(key) {
      pairs.push(key + '=' + params[key]);
    });
    queryString = '?' + pairs.join('&');

    return baseUri + queryString;
  };

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
   * Get all features
   *
   * @return _features {Object}
   */
  _this.getFeatures = function () {
    return _features;
  };

  /**
   * Wrapper method to loop through Feature classes and initialze them
   *
   * Skip mainshock which is added separately so it's already available
   *   for other features that depend on it.
   *
   * @param featureClasses {Object}
   *     optional; uses _FEATURECLASSES if no parameter is passed
   */
  _this.initFeatures = function (featureClasses) {
    var FeatureClass;

    featureClasses = featureClasses || _FEATURECLASSES;

    Object.keys(featureClasses).forEach(function(key) {
      if (key !== 'mainshock') {
        FeatureClass = featureClasses[key];
        _intiFeature(FeatureClass);
      }
    });
  };

  /**
   * Wrapper method to initialze mainshock Feature
   */
  _this.initMainshockFeature = function () {
    var FeatureClass;

    FeatureClass = _FEATURECLASSES.mainshock;
    _intiFeature(FeatureClass);
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
