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

// Set which features get added, and the order (ASC)
_FEATURECLASSES = [
  MainshockFeature
  //AftershocksFeature,
  //ForeshocksFeature,
  //HistoricalFeature,
  //StationsFeature,
  //FocalMechanismFeature,
  //MomentTensorFeature,
  //FieldNotesFeature
];


/**
 * Add Features to map, plots and summary
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
      _features;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _features = {};

    // Flag to block mult. instances of feature from refreshing at the same time
    _this.isRefreshing = false;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add a feature to map, plots and summary panes
   *
   * @param feature {Object}
   */
  _this.add = function (feature) {
    try {
      // Create a new map pane and add feature to map, summary panes
      _app.MapPane.createMapPane(feature.id, 'overlayPane');
      _app.MapPane.addFeatureLayer(feature);
      _app.SummaryPane.addSummary(feature);
      // TODO: add plots using feature.plotData

      if (feature.id === 'mainshock') {
        _app.EditPane.showMainshock();
        //_app.EditPane.setDefaults();
      }
      // Feature finished loading; remove alert / set isRefreshing to false
      _app.StatusBar.removeItem(feature.id);
    }
    catch (error) {
      console.error(error);
      _app.StatusBar.addError(feature.id, '<h4>Error Creating ' + feature.name +
        '</h4><ul><li>' + error + '</li></ul>');
    }

    _this.isRefreshing = false;
  };

  /**
   * Get a feature
   *
   * @param id {String}
   *     id of feature
   *
   * @return feature {Object}
   */
  _this.getFeature = function (id) {
    Object.keys(_features).forEach(function(key) {
      if (id === key) {
        return _features[key];
      }
    });
  };

  /**
   * Initialize (execute) each feature class and store it in _features
   */
  _this.initFeatures = function () {
    _eqid = _app.AppUtil.getParam('eqid');

    _FEATURECLASSES.forEach(function(FeatureClass) {
      var feature = FeatureClass({
        app: _app,
        eqid: _eqid
      });

      _features[feature.id] = feature;
      _this.remove(feature); // remove any previous instances
      _this.load(feature);
    });
  };

  /**
   * Load a feature (via json feed) and then add it once it's loaded
   *
   * @param feature {Object}
   */
  _this.load = function (feature) {
    var domain,
        errorMsg,
        matches;

    Xhr.ajax({
      url: feature.url,
      success: function (json) {
        feature.json = json;
        feature.createFeature();
        _this.add(feature);
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
        _app.StatusBar.addError(feature.id, errorMsg);
      },
      ontimeout: function (xhr) {
        console.error(xhr);

        matches = feature.url.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
        domain = matches && matches[1];
        errorMsg += '<ul><li>Request timed out (can&rsquo;t connect to ' + domain +
          ')</li></ul>';
        //errorMsg += '<a href="#" class="reload"></a>';

        _app.StatusBar.addError(feature.id, errorMsg);
      },
      timeout: 20000
    });

    _this.isRefreshing = false;
  };

  /**
   * Refresh a feature
   *
   * @param feature {Object}
   */
  _this.refresh = function (feature) {
    _this.isRefreshing = true;
    _this.remove(feature);
    _this.load(feature);

    // TODO: also refresh Fieldnotes if refreshing aftershocks
  };

  /**
   * Remove a feature from map, plots and summary panes
   *
   * @param feature {Object}
   */
  _this.remove = function (feature) {
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
        _app.PlotsPane.removePlots(plotsEl);
      }
      if (summaryEl) {
        _app.SummaryPane.removeSummary(summaryEl);
      }
    }
  };

  /**
   * Remove all features from map, plots and summary panes
   */
  _this.removeFeatures = function () {
    if (_features) {
      Object.keys(_features).forEach(function(key) {
        _this.remove(_features[key]);
      });
    }
  };

  /**
   * Reset to initial state
   */
  _this.reset = function () {
    this.removeFeatures();

    _eqid = null;
    _features = {};
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Features;
