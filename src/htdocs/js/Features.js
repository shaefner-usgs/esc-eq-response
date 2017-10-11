'use strict';


var Aftershocks = require('features/AftershocksFeature'),
    AppUtil = require('AppUtil'),
    FocalMechanismFeature = require('features/FocalMechanismFeature'),
    Historical = require('features/HistoricalFeature'),
    Mainshock = require('features/MainshockFeature'),
    Moment = require('moment'),
    MomentTensorFeature = require('features/MomentTensorFeature'),
    Stations = require('features/StationsFeature'),
    Xhr = require('util/Xhr');


/**
 * Retrieves and adds 'features' to map, plot, and summary panes
 *
 * Features are event-specific layers added dynamically, based on the mainshock
 * Event ID entered by user
 *
 * Feature data comes from GeoJson web services on earthquake.usgs.gov
 *
 * The stacking order of features is set via css
 *
 * @param options {Object}
 *   {
 *     mapPane: {Object}, // MapPane instance
 *     plotsPane: {Object}, // PlotsPane instance
 *     statusBar: {Object}, // StatusBar instance
 *     summaryPane: {Object} // SummaryPane instance
 *   }
 */
var Features = function (options) {
  var _this,
      _initialize,

      _editPane,
      _eqid,
      _features,
      _initialLoad,
      _mainshockJson,
      _plotdata,

      _MapPane,
      _PlotsPane,
      _StatusBar,
      _SummaryPane,

      _addFeature,
      _addPlots,
      _addSummary,
      _getAftershocks,
      _getEqFeedUrl,
      _getFocalMechanism,
      _getHistorical,
      _getMainshock,
      _getMomentTensor,
      _getStations,
      _getStatusBarId,
      _loadFeed,
      _removeFeature;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _MapPane = options.mapPane;
    _PlotsPane = options.plotsPane;
    _StatusBar = options.statusBar;
    _SummaryPane = options.summaryPane;
  };

  /**
   * Create and add feature to map, plots, summary panes
   *
   * @param opts {Object}
   *   {
   *     jsClass: {Function}, // class that creates Feature
   *     json: {Object}, // geojson data
   *     mainshockJson: {Object}, // geojson data
   *     name: {String}
   *   }
   */
  _addFeature = function (opts) {
    var id,
        feature,
        name,
        statusBarId;

    name = opts.name;
    statusBarId = _getStatusBarId(name);

    try {
      // Create feature (and store it in _features for access later)
      feature = opts.jsClass({
        json: opts.json,
        mainshockJson: opts.mainshockJson,
        name: name
      });
      id = feature.id;
      _features[id] = feature;

      // First, remove any existing previous version of feature
      //   (should be removed already, but stacked ajax requests can cause issues)
      _removeFeature(id);

      // Create a new map pane and add feature to map, summary panes
      _MapPane.createMapPane(id, 'overlayPane');
      _MapPane.addFeatureLayer(feature, _initialLoad);
      _addSummary(feature);

      if (id === 'mainshock') {
        // Show mainshock details on editPane
        _editPane.addMainshock(feature.getSummaryData().detailsHtml,
        opts.mainshockJson.properties);

        // Store mainshock's plotdata
        _plotdata[id] = feature.getPlotData();

        // Add other (non-mainshock) features
        _this.getFeatures();
      } else if (id === 'aftershocks') {
        // Add aftershock plots to plots pane
        _plotdata[id] = feature.getPlotData();

        _addPlots(feature);
      }

      // Feature finished loading; remove alert
      _StatusBar.removeItem(statusBarId);

      if (_features.aftershocks && _features.historical) {
        _initialLoad = false;
      }
    }
    catch (error) {
      console.error(error);
      _StatusBar.addError(statusBarId, 'Error Creating ' + name +
        '<span>' + error + '</span>');
    }
  };

  /**
   * Add feature to plots pane
   *
   * @param feature {Object}
   */
  _addPlots = function (feature) {
    _PlotsPane.addPlots({
      id: feature.id,
      name: feature.name,
      data: _plotdata
    });
  };

  /**
   * Add feature to summary pane
   *
   * @param feature {Object}
   */
  _addSummary = function (feature) {
    if (feature.getSummaryData) { // check 1st if feature has summary to add
      _SummaryPane.addSummary({
        id: feature.id,
        name: feature.name,
        data: feature.getSummaryData()
      });
    }
  };


  /**
   * Get aftershocks feature
   */
  _getAftershocks = function () {
    var params;

    params = {
      latitude: _mainshockJson.geometry.coordinates[1],
      longitude: _mainshockJson.geometry.coordinates[0],
      maxradiuskm: AppUtil.getParam('aftershocks-dist'),
      minmagnitude: AppUtil.getParam('aftershocks-minmag'),
      starttime: Moment(_mainshockJson.properties.time + 1000).utc().toISOString()
        .slice(0, -5)
    };

    _loadFeed({
      jsClass: Aftershocks,
      name: 'Aftershocks',
      url: _getEqFeedUrl(params)
    });
  };

  /**
   * Get the feed url for aftershock / historical seismicity features
   *
   * @param params {Object}
   *
   * @return {String}
   */
  _getEqFeedUrl = function (params) {
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
   * Get focal mechanism feature
   */
  _getFocalMechanism = function () {
    var focalmechanism;

    focalmechanism = _mainshockJson.properties.products['focal-mechanism'];
    if (focalmechanism) {
      _addFeature({
        jsClass: FocalMechanismFeature,
        json: focalmechanism[0].properties,
        mainshockJson: _mainshockJson,
        name: 'Focal Mechanism'
      });
    }
  };

  /**
   * Get historical seismicity feature
   */
  _getHistorical = function () {
    var params,
        years;

    years = AppUtil.getParam('historical-years');

    params = {
      endtime: Moment(_mainshockJson.properties.time).utc().toISOString()
        .slice(0, -5),
      latitude: _mainshockJson.geometry.coordinates[1],
      longitude: _mainshockJson.geometry.coordinates[0],
      maxradiuskm: AppUtil.getParam('historical-dist'),
      minmagnitude: AppUtil.getParam('historical-minmag'),
      starttime: Moment(_mainshockJson.properties.time).utc()
        .subtract(years, 'years').toISOString().slice(0, -5)
    };

    _loadFeed({
      jsClass: Historical,
      name: 'Historical Seismicity',
      url: _getEqFeedUrl(params)
    });
  };

  /**
   * Get mainshock feature
   */
  _getMainshock = function () {
    var url;

    url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/' +
      _eqid + '.geojson';

    _loadFeed({
      jsClass: Mainshock,
      name: 'Mainshock',
      url: url
    });
  };

  /**
   * Get moment tensor feature
   */
  _getMomentTensor = function () {
    var momentTensor;

    momentTensor = _mainshockJson.properties.products['moment-tensor'];
    if (momentTensor) {
      _addFeature({
        jsClass: MomentTensorFeature,
        json: momentTensor[0].properties,
        mainshockJson: _mainshockJson,
        name: 'Moment Tensor'
      });
    }
  };

  /**
   * Get ShakeMap stations feature
   */
  _getStations = function () {
    var shakemap,
        url;

    shakemap = _mainshockJson.properties.products.shakemap;
    if (shakemap) {
      url = shakemap[0].contents['download/stationlist.json'].url;

      _loadFeed({
        jsClass: Stations,
        name: 'ShakeMap Stations',
        url: url
      });
    }
  };

  /**
   * Get id for status bar item (first word in name, lowercase)
   *
   * @param name {String}
   *   name of feature
   *
   * @return {String}
   */
  _getStatusBarId = function (name) {
    return /[^\s]+/.exec(name)[0].toLowerCase();
  };

  /**
   * Load json feed and then call _addFeature() when it's finished loading
   *
   * @param opts {Object}
   *   {
   *     name: {String}
   *     jsClass: {Function},
   *     url: {String}
   *   }
   */
  _loadFeed = function (opts) {
    var coords,
        name,
        msg,
        statusBarId;

    name = opts.name;
    statusBarId = _getStatusBarId(name);

    // Alert user that feature is loading
    _StatusBar.addItem(statusBarId, name);

    Xhr.ajax({
      url: opts.url,
      success: function (json) {
        if (json.id === _eqid) { // mainshock
          _mainshockJson = json; // store mainshock's json (other features depend on it)

          // Set default param values on edit pane
          _editPane.setDefaults(_mainshockJson);

          // Center map around mainshock for now
          //   (some added features set map extent to contain itself)
          coords = _mainshockJson.geometry.coordinates;
          _MapPane.map.setView([coords[1], coords[0]], 13, { reset: true });
          _MapPane.bounds = _MapPane.map.getBounds();
        }

        _addFeature({
          jsClass: opts.jsClass,
          json: json,
          mainshockJson: _mainshockJson,
          name: name
        });
      },
      error: function (status, xhr) {
        console.error(xhr.responseText);

        msg = 'Error Loading ' + name;

        // Add additional info to error message
        if (status === 404 && name === 'Mainshock') {
          msg += ' <span>Event ID ' + _eqid + ' not found</span>';
        }
        else if (xhr.responseText.match('limit of 20000')) {
          msg += ' <span>Modify the parameters to match fewer earthquakes' +
            ' (max 20,000)</span>';
        }
        else if (xhr.responseText.match('parameter combination')){
          msg += ' <span>Missing required parameters</span>';
        }

        _StatusBar.addError(statusBarId, msg);
      }
    });
  };

  /**
   * Remove feature from map, plots, summary panes
   *
   * @param id {String}
   *     id of feature to remove
   */
  _removeFeature = function (id) {
    var className,
        mapLayer,
        plots,
        summary;

    className = id;

    if (_features[id]) {
      mapLayer = _features[id].getMapLayer();
      plots = document.querySelector('#plotsPane .' + className);
      summary = document.querySelector('#summaryPane .feature.' + className);
    }

    if (mapLayer) {
      _MapPane.map.removeLayer(mapLayer);
      _MapPane.layerControl.removeLayer(mapLayer);
    }

    if (plots) {
      _PlotsPane.removePlots(plots);
    }

    if (summary) {
      _SummaryPane.removeSummary(summary);
    }
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Initialize and begin process of adding feature layers
   *
   * Called each time a new Event ID is entered by user
   *
   * @param opts {Object}
   *   {
   *     editPane: {Object} // EditPane instance
   *   }
   */
  _this.getFeatures = function (opts) {
    if (opts && opts.hasOwnProperty('editPane')) { // new mainshock
      // 1. Initialize environment
      _editPane = opts.editPane;
      _eqid = AppUtil.getParam('eqid');
      _initialLoad = true;
      _features = {};
      _plotdata = {};

      // 2. Create mainshock feature
      _getMainshock();
    } else {
      // 3. Create other features (called via mainshock's callback)
      _getAftershocks();
      _getHistorical();
      _getMomentTensor();
      _getFocalMechanism();
      _getStations();
    }
  };

  /**
   * Refresh earthquakes feature layer when user tweaks form fields on edit pane
   *
   * @param id {String}
   */
  _this.refresh = function (id) {
    _removeFeature(id);

    if (id === 'aftershocks') {
      _getAftershocks();
    } else if (id === 'historical') {
      _getHistorical();
    }
  };

  /**
   * Remove all features from map, plots, summary panes
   */
  _this.removeFeatures = function () {
    if (_features) {
      Object.keys(_features).forEach(function(id) {
        _removeFeature(id);
      });
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Features;
