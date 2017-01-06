/* global L */
'use strict';


var AppUtil = require('AppUtil'),
    Earthquakes = require('features/Earthquakes'),
    Moment = require('moment'),
    Xhr = require('util/Xhr');


/**
 * Adds 'feature' layers to map, summary panes
 *
 * Feature layers are event specific layers added dynamically to the map
 * and summary panes, based on the Event ID entered by user
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
      _initialLoad,
      _layers,
      _mainshock,
      _mapPane,
      _statusBar,
      _summaryPane,

      _addLayer,
      _addMainshock,
      _addSummary,
      _createFeature,
      _getFeedUrl,
      _loadFeed;


  _this = {};

  _initialize = function (options) {
    options = options || {};
    _mapPane = options.mapPane;
    _statusBar = options.statusBar;
    _summaryPane = options.summaryPane;
  };

  /**
   * Add feature layer to map
   *
   * @param layer {Object}
   */
  _addLayer = function (layer) {
    _mapPane.map.addLayer(layer);
    _mapPane.layerController.addOverlay(layer, layer.name);

    // Set bounds to contain added layer if adding for the first time
    if (_initialLoad) {
      _bounds.extend(layer.getBounds());
      _mapPane.map.fitBounds(_bounds, {
        paddingTopLeft: L.point(0, 45), // accommodate navbar
        reset: true
      });
    }

    // Render mainshock on top of other features
    if (_layers.mainshock) {
      _layers.mainshock.bringToFront();
    }
  };

  /**
   * Wrapper for creating mainshock feature
   *
   * @param data {Object}
   *     GeoJson data returned by Mainshock class
   */
  _addMainshock = function (data) {
    var id;

    id = 'mainshock';

    _createFeature({
      feature: Earthquakes,
      featureParams: {
        data: data,
        id: id,
        mainshock: _mainshock,
        name: 'Mainshock'
      },
    });
  };

  /**
   * Add feature layer to summary pane
   *
   * @param layer {Object}
   */
  _addSummary = function (layer) {
    if (layer.summary) {
      _summaryPane.addSummary({
        id: layer.id,
        name: layer.name,
        summary: layer.summary
      });
    }
  };

  /**
   * Create feature layer for map, summary panes
   *
   * @param opts {Object}
   *   {
   *     id: {String}, // layer id (req'd)
   *     feature: {Function}, // class that creates Leaflet layer (req'd)
   *     featureParams: {Object} // contains geojson data, etc (req'd)
   *     {
   *       data: {Object},
   *       id: {String},
   *       mainshock: {Object},
   *       name: {String}
   *     }
   *   }
   */
  _createFeature = function (opts) {
    var id,
        layer;

    id = opts.featureParams.id;

    try {
      // Feature should be removed already, but stacked ajax requests cause issues
      _this.removeFeature(id);

      // Create Leaflet layer (and store it in _layers for access later)
      layer = opts.feature(opts.featureParams);
      _layers[id] = layer;

      // Add feature layer to map, summary panes
      if (id === 'aftershocks' || id === 'historical') {
        // Load both layers before adding to ensure aftershocks are on top
        if (_layers.aftershocks && _layers.historical) {
          // Remove / add both layers so order is correct after params tweaked
          _mapPane.map.removeLayer(_layers.aftershocks);
          _mapPane.map.removeLayer(_layers.historical);
          _addLayer(_layers.historical);
          _addLayer(_layers.aftershocks);

          _initialLoad = false;
        }
      } else {
        _addLayer(layer);
      }
      _addSummary(layer);

      // Feature done loading; remove alert
      _statusBar.removeItem(id);
    }
    catch (error) {
      console.error(error);
      _statusBar.addError(opts.id, 'Error Loading ' + opts.featureParams.name +
        '<span>' + error + '</span>');
    }
  };

  /**
   * Get the feed url for aftershock / historical seismicity layers
   *
   * @param params {Object}
   *
   * @return {String}
   */
  _getFeedUrl = function (params) {
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
   * Load data feed and then call _createFeature when it's finished loading
   *
   * @param opts {Object}
   *   {
   *     id: {String},
   *     feature: {Function},
   *     name: {String},
   *     url: {String}
   *   }
   */
  _loadFeed = function (opts) {
    var msg;

    // Alert user that feature is loading
    _statusBar.addItem(opts.id, opts.name);

    Xhr.ajax({
      url: opts.url,
      success: function (data) {
        _createFeature({
          feature: opts.feature,
          featureParams: {
            data: data,
            id: opts.id,
            mainshock: _mainshock,
            name: opts.name
          }
        });
      },
      error: function (status, xhr) {
        console.error(xhr.responseText);

        msg = 'Error Loading ' + opts.name;
        if (xhr.responseText.match('limit of 20000')) {
          msg += ' <span>Modify the parameters to match fewer earthquakes' +
            ' (max 20,000)</span>';
        }
        else if (xhr.responseText.match('parameter combination')){
          msg += ' <span>All parameters are required</span>';
        }

        _statusBar.addError(opts.id, msg);
      }
    });
  };

  /**
   * Aftershocks feature layer
   *   loads feed then adds it to map, summary panes thru callbacks
   */
  _this.addAftershocks = function () {
    var params;

    params = {
      latitude: _mainshock.geometry.coordinates[1],
      longitude: _mainshock.geometry.coordinates[0],
      maxradiuskm: AppUtil.getParam('aftershocks-dist'),
      minmagnitude: AppUtil.getParam('aftershocks-minmag'),
      starttime: Moment(_mainshock.properties.time + 1000).utc().toISOString()
        .slice(0, -5)
    };

    _loadFeed({
      id: 'aftershocks',
      feature: Earthquakes,
      name: 'Aftershocks',
      url: _getFeedUrl(params)
    });
  };

  /**
   * Historical seismicity feature layer
   *   loads feed then adds it to map, summary panes thru callbacks
   */
  _this.addHistorical = function () {
    var params,
        years;

    years = AppUtil.getParam('historical-years');

    params = {
      endtime: Moment(_mainshock.properties.time).utc().toISOString()
        .slice(0, -5),
      latitude: _mainshock.geometry.coordinates[1],
      longitude: _mainshock.geometry.coordinates[0],
      maxradiuskm: AppUtil.getParam('historical-dist'),
      minmagnitude: AppUtil.getParam('historical-minmag'),
      starttime: Moment(_mainshock.properties.time).utc()
        .subtract(years, 'years').toISOString().slice(0, -5)
    };

    _loadFeed({
      id: 'historical',
      feature: Earthquakes,
      name: 'Historical Seismicity',
      url: _getFeedUrl(params)
    });
  };

  /**
   * Set up environment / map and call methods for adding 'feature' layers
   *
   * @param mainshock {Object}
   *     GeoJson data returned by Mainshock class
   */
  _this.initFeatures = function (mainshock) {
    var coords;

    _initialLoad = true;
    _bounds = new L.LatLngBounds();
    _layers = {};
    _mainshock = mainshock;

    coords = _mainshock.geometry.coordinates;

    // Center map around mainshock for now
    //   (each added feature will set map extent to contain itself)
    _mapPane.map.setView([coords[1], coords[0]], 13, { reset: true });
    _bounds = _mapPane.map.getBounds();

    // First, remove any existing event-specific features
    _this.removeFeatures();

    // Now, add event-specific features
    _addMainshock(_mainshock);
    _this.addHistorical();
    _this.addAftershocks();
  };

  /**
   * Remove feature layer from map / layer controller, summary pane
   *
   * @param id {String}
   *     feature to remove
   */
  _this.removeFeature = function (id) {
    var layer,
        summary;

    layer = _layers[id];
    summary = document.getElementById(id);

    if (layer) {
      _mapPane.map.removeLayer(layer);
      _mapPane.layerController.removeLayer(layer);
    }

    if (summary) {
      _summaryPane.removeSummary(summary);
    }
  };

  /**
   * Remove all feature layers from map / layer controller, summary pane
   */
  _this.removeFeatures = function () {
    if (_layers) {
      Object.keys(_layers).forEach(function(id) {
        _this.removeFeature(id);
      });
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Features;
