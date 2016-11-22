/* global L */
'use strict';


var EarthquakesLayer = require('features/EarthquakesLayer'),
    Moment = require('moment'),
    Xhr = require('util/Xhr');


/**
 * Adds 'feature' layers to map, summary panes
 *
 * Feature layers are event specific layers added dynamically to the map
 * and summary panes, based on the eqid entered by user
 *
 * @param options {Object}
 *   {
 *     mapPane: {Object}, // MapPane instance
 *     summaryPane: {Object} // SummaryPane instance
 *   }
 */
var Features = function (options) {
  var _this,
      _initialize,

      _bounds,
      _layers,
      _loadingModule,
      _mainshock,
      _mapPane,
      _summaryPane,

      _addFeature,
      _addMainshock,
      _getFeedUrl,
      _loadFeed;


  _this = {};

  _initialize = function (options) {
    options = options || {};
    _loadingModule = options.loadingModule;
    _mapPane = options.mapPane;
    _summaryPane = options.summaryPane;

    _bounds = new L.LatLngBounds();
    _layers = {};
  };

  /**
   * Create and add a feature layer to map / layer controller, summary pane
   *
   * @param opts {Object}
   *   {
   *     count: {Integer}, // number of features in layer (optional)
   *     id: {String}, // layer id (req'd)
   *     layerClass: {Function}, // class that creates Leaflet layer (req'd)
   *     layerOptions: {Object}, // contains data prop with geojson data (req'd)
   *     name: {String} // layer name (req'd)
   *   }
   */
  _addFeature = function (opts) {
    var count,
        id,
        layer,
        name;

    count = opts.count;
    id = opts.id;
    name = opts.name;

    try {
      if (count >= 0) {
        name += ' (' + count + ')';
      }

      // Feature should be removed already, but stacked ajax requests cause issues
      _this.removeFeature(id);

      // Create Leaflet layer using Layer class specified in opts
      layer = opts.layerClass(opts.layerOptions);

      // Add layer to map (and store it in _layers for potential removal later)
      _mapPane.map.addLayer(layer);
      _mapPane.layerController.addOverlay(layer, name);
      _layers[id] = layer;

      // Set bounds to contain added layer
      _bounds.extend(layer.getBounds());
      _mapPane.map.fitBounds(_bounds, { reset: true });

      // Render mainshock on top of other features
      if (id === 'mainshock') {
        layer.bringToFront();
      } else {
        layer.bringToBack();
      }

      // Add Summary
      if (layer.summary) {
        _summaryPane.addSummary({
          id: id,
          name: name,
          summary: layer.summary
        });
      }

      // Feature done loading; remove alert
      _loadingModule.removeItem(id);
    }
    catch (error) {
      console.error(error);
      _loadingModule.showError(opts.id, 'Error Loading ' + opts.name +
        '<span>' + error + '</span>');
    }
  };

  /**
   * Wrapper for mainshock layer (_addFeature adds it to map, summary panes)
   *
   * @param data {Object}
   *     GeoJson data returned by Earthquake class
   */
  _addMainshock = function (data) {
    var id,
        name;

    id = 'mainshock';
    name = 'Mainshock';

    _addFeature({
      id: id,
      layerClass: EarthquakesLayer,
      layerOptions: {
        id: id,
        data: data,
        mainshock: _mainshock,
      },
      name: name
    });
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
   * Load data feed and then call _addFeature when it's finished loading
   *
   * @param opts {Object}
   *   {
   *     id: {String},
   *     layerClass: {Function},
   *     name: {String},
   *     url: {String}
   *   }
   */
  _loadFeed = function (opts) {
    var msg;

    // Alert user that feature is loading
    _loadingModule.addItem(opts.id, opts.name);

    Xhr.ajax({
      url: opts.url,
      success: function (data) {
        _addFeature({
          count: data.metadata.count,
          id: opts.id,
          layerClass: opts.layerClass,
          layerOptions: {
            id: opts.id,
            data: data,
            mainshock: _mainshock
          },
          name: opts.name
        });
      },
      error: function (status) {
        console.error('Error loading feed (' + status + ').');
        if (status === 400) {
          msg = 'You might need to modify parameters to match fewer ' +
              ' events (20,000 max)';
          _loadingModule.showError(opts.id, 'Error Loading ' + opts.name +
            ' <span>' + msg + '</span>');
        }
      }
    });
  };

  /**
   * Aftershocks feature layer
   *   loads feed then adds it to map, summary panes thru callbacks
   */
  _this.addAftershocks = function () {
    var id,
        name,
        params;

    id = 'aftershocks';
    name = 'Aftershocks';

    params = {
      latitude: _mainshock.geometry.coordinates[1],
      longitude: _mainshock.geometry.coordinates[0],
      maxradiuskm: document.getElementById('aftershocks-dist').value,
      starttime: Moment(_mainshock.properties.time + 1000).utc().toISOString()
        .slice(0, -5)
    };

    _loadFeed({
      id: id,
      layerClass: EarthquakesLayer,
      name: name,
      url: _getFeedUrl(params)
    });
  };

  /**
   * Historical seismicity feature layer
   *   loads feed then adds it to map, summary panes thru callbacks
   */
  _this.addHistorical = function () {
    var id,
        name,
        params,
        years;

    id = 'historical';
    name = 'Historical Seismicity';
    years = document.getElementById('historical-years').value;

    params = {
      endtime: Moment(_mainshock.properties.time).utc().toISOString()
        .slice(0, -5),
      latitude: _mainshock.geometry.coordinates[1],
      longitude: _mainshock.geometry.coordinates[0],
      maxradiuskm: document.getElementById('historical-dist').value,
      starttime: Moment(_mainshock.properties.time).utc()
        .subtract(years, 'years').toISOString().slice(0, -5)
    };

    _loadFeed({
      id: id,
      layerClass: EarthquakesLayer,
      name: name,
      url: _getFeedUrl(params)
    });
  };

  /**
   * Set up environment / map and call methods for adding 'feature' layers
   *
   * @param mainshock {Object}
   *     GeoJson data returned by Earthquake class
   */
  _this.initFeatures = function (mainshock) {
    var coords;

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
    _this.addAftershocks();
    _this.addHistorical();
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
