/* global L */
'use strict';


var Aftershocks = require('features/Aftershocks'),
    AppUtil = require('AppUtil'),
    Historical = require('features/Historical'),
    Mainshock = require('features/Mainshock'),
    Moment = require('moment'),
    Xhr = require('util/Xhr');


/**
 * Retrieves and adds 'features' to map, plots, summary panes
 *
 * Features are event-specific layers added dynamically to the map, plots
 * and summary panes, based on the mainshock Event ID entered by user.
 *
 * Feature data comes from GeoJson web services hosted on earthquake.usgs.gov
 *
 * @param options {Object}
 *   {
 *     mapPane: {Object}, // MapPane instance
 *     statusBar: {Object}, // StatusBar instance
 *     summaryPane: {Object} // SummaryPane instance
 *   }
 */
var Features = function (options) {
  var _this,
      _initialize,

      _bounds,
      _editPane,
      _eqid,
      _features,
      _initialLoad,
      _mainshockJson,
      _mapPane,
      _statusBar,
      _summaryPane,

      _addFeature,
      _addMapLayer,
      _addPlots,
      _addSummary,
      _getAftershocks,
      _getEqFeedUrl,
      _getHistorical,
      _getMainshock,
      _getStatusBarId,
      _loadFeed,
      _removeFeature;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _mapPane = options.mapPane;
    _statusBar = options.statusBar;
    _summaryPane = options.summaryPane;
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
      feature = opts.jsClass(opts);
      id = feature.id;
      _features[id] = feature;

      // First, remove any existing previous version of feature
      //   (should be removed already, but stacked ajax requests can cause issues)
      _removeFeature(id);

      // Show mainshock details on editPane
      if (id === 'mainshock') {
        _editPane.addMainshock(feature.getSummary(), opts.mainshockJson.properties);
      }

      // Add feature to map, plots, summary panes
      if (id === 'aftershocks' || id === 'historical') {
        // Load both layers before adding
        if (_features.aftershocks && _features.historical) {
          // Always plot aftershocks above historical on map
          _mapPane.map.removeLayer(_features.aftershocks.getMapLayer());
          _mapPane.map.removeLayer(_features.historical.getMapLayer());
          _addMapLayer(_features.historical);
          _addMapLayer(_features.aftershocks);

          _initialLoad = false;
        }
      } else {
        _addMapLayer(feature);
      }
      _addSummary(feature);

      // Feature finished loading; remove alert
      _statusBar.removeItem(statusBarId);
    }
    catch (error) {
      console.error(error);
      _statusBar.addError(statusBarId, 'Error Loading ' + name +
        '<span>' + error + '</span>');
    }
  };

  /**
   * Add feature to map pane
   *
   * @param feature {Object}
   */
  _addMapLayer = function (feature) {
    var layer;

    layer = feature.getMapLayer();
    _mapPane.map.addLayer(layer);
    _mapPane.layerController.addOverlay(layer, feature.name);

    // Set bounds to contain added layer if adding for the first time
    if (_initialLoad) {
      _bounds.extend(layer.getBounds());
      _mapPane.map.fitBounds(_bounds, {
        paddingTopLeft: L.point(0, 45), // accommodate navbar
        reset: true
      });
    }

    // Render mainshock on top of other features
    if (_features.mainshock) {
      _features.mainshock.getMapLayer().bringToFront();
    }
  };

  /**
   * Add feature to plots pane
   *
   * @param feature {Object}
   */
  _addPlots = function (/*feature*/) {

  };

  /**
   * Add feature to summary pane
   *
   * @param feature {Object}
   */
  _addSummary = function (feature) {
    if (feature.getSummary) {
      _summaryPane.addSummary({
        id: feature.id,
        name: feature.name,
        summary: feature.getSummary()
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
      name: 'Aftershocks',
      jsClass: Aftershocks,
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
      name: 'Historical Seismicity',
      jsClass: Historical,
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
      name: 'Mainshock',
      jsClass: Mainshock,
      url: url
    });
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
    _statusBar.addItem(statusBarId, name);

    Xhr.ajax({
      url: opts.url,
      success: function (json) {
        if (json.id === _eqid) {
          _mainshockJson = json; // store mainshock's json; other features depend on it

          // Set default param values on edit pane
          _editPane.setDefaults(_mainshockJson);

          // Center map around mainshock for now
          //   (each added feature will set map extent to contain itself)
          coords = _mainshockJson.geometry.coordinates;
          _mapPane.map.setView([coords[1], coords[0]], 13, { reset: true });
          _bounds = _mapPane.map.getBounds();

          // Recursively call getFeatures() to add other (non-mainshock) features
          _this.getFeatures();
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
        if (status === 404) {
          msg += ' <span>Event ID ' + _eqid + ' not found</span>';
        }
        else if (xhr.responseText.match('limit of 20000')) {
          msg += ' <span>Modify the parameters to match fewer earthquakes' +
            ' (max 20,000)</span>';
        }
        else if (xhr.responseText.match('parameter combination')){
          msg += ' <span>Missing required parameters</span>';
        }

        _statusBar.addError(statusBarId, msg);
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
    var mapLayer,
        summary;

    if (_features[id]) {
      mapLayer = _features[id].getMapLayer();
      summary = document.getElementById(id);
    }

    if (mapLayer) {
      _mapPane.map.removeLayer(mapLayer);
      _mapPane.layerController.removeLayer(mapLayer);
    }

    if (summary) {
      _summaryPane.removeSummary(summary);
    }
  };

  /**
   * Initialize features and begin process of adding new features
   *   called each time a new Event ID is entered by user
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

      // 2. Create mainshock feature
      _getMainshock();
    }
    else {
      // 3. Create additional features (called recursively via mainshock's callback)
      _getAftershocks();
      _getHistorical();
    }
  };

  /**
   * Refresh earthquakes feature layer when user tweaks form field params
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
    _mainshockJson = null; // clear any existing mainshock

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
