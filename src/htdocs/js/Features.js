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
 *     data: {Object}, // Geojson data
 *     mainshock: {Object} // magnitude, time, etc.
 *   }
 */
var Features = function (options) {
  var _this,
      _initialize,

      _editPane,
      _layers,
      _mainshock,
      _mapPane,
      _summaryPane,

      _addAftershocks,
      _addFeature,
      _addHistorical,
      _addMainshock,
      _getFeedUrl,
      _loadFeed,
      _removeFeatures;


  _this = {};

  _initialize = function (options) {
    _layers = {};

    _editPane = options.editPane;
    _mapPane = options.mapPane;
    _summaryPane = options.summaryPane;
  };

  /**
   * Aftershocks feature layer
   *   loads feed then adds it to map, summary panes thru callbacks
   */
  _addAftershocks = function () {
    var params;

    params = {
      latitude: _mainshock.geometry.coordinates[1],
      longitude: _mainshock.geometry.coordinates[0],
      maxradiuskm: document.getElementById('ashockDistance').value,
      starttime: Moment(_mainshock.properties.time + 1000).utc().toISOString().slice(0, -5)
    };

    _loadFeed({
      id: 'aftershocks',
      layerClass: EarthquakesLayer,
      name: 'Aftershocks',
      url: _getFeedUrl(params)
    });
  };

  /**
   * Create and add a feature layer to map / layer controller, summary pane
   *
   * @param opts {Object}
   *   {
   *     id: {String}, // layer id
   *     layerClass: {Function}, // creates Leaflet layer
   *     layerOptions: {Object}, // contains data prop (req'd) with geojson data
   *     name: {String} // layer name
   *   }
   */
  _addFeature = function (opts) {
    var layer,
        name;

    // Create Leaflet layer using Layer class specified in opts
    layer = opts.layerClass(opts.layerOptions);

    name = opts.name;
    if (opts.count) {
      name += ' (' + opts.count + ')';
    }

    // Add it (and store it in _layers for potential removal later)
    _mapPane.map.addLayer(layer);
    _mapPane.layerController.addOverlay(layer, name);
    _layers[opts.id] = layer;

    // Render mainshock on top of other features
    if (opts.name === 'Mainshock') {
      layer.bringToFront();
    } else {
      layer.bringToBack();
    }

    _summaryPane.addFeature({
      id: opts.id,
      name: name,
      summary: layer.summary
    });
  };

  /**
   * Historical seismicity feature layer
   *   loads feed then adds it to map, summary panes thru callbacks
   */
  _addHistorical = function () {
    var params,
        years;

    years = document.getElementById('histYears').value;
    params = {
      endtime: Moment(_mainshock.properties.time).utc().toISOString().slice(0, -5),
      latitude: _mainshock.geometry.coordinates[1],
      longitude: _mainshock.geometry.coordinates[0],
      maxradiuskm: document.getElementById('histDistance').value,
      starttime: Moment(_mainshock.properties.time).utc().subtract(years, 'years')
        .toISOString().slice(0, -5)
    };

    _loadFeed({
      id: 'historical',
      layerClass: EarthquakesLayer,
      name: 'Historical seismicity',
      url: _getFeedUrl(params)
    });
  };

  /**
   * Wrapper for earthquake (mainshock) layer
   *   _addFeature adds it to map, summary panes
   *
   * @param data {Object} GeoJson data
   */
  _addMainshock = function (data) {
    _addFeature({
      id: 'mainshock',
      layerClass: EarthquakesLayer,
      layerOptions: {
        data: data,
        mainshock: _mainshock,
      },
      name: 'Mainshock'
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

    baseUri = 'http://earthquake.usgs.gov/fdsnws/event/1/query';

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
   *     layerClass: {Function},
   *     name: {String},
   *     url: {String}
   *   }
   */
  _loadFeed = function (opts) {
    Xhr.ajax({
      url: opts.url,
      success: function (data) {
        _addFeature({
          count: data.metadata.count,
          id: opts.id,
          layerClass: opts.layerClass,
          layerOptions: {
            data: data,
            mainshock: _mainshock
          },
          name: opts.name
        });
      },
      error: function (status) {
        console.log(status);
      }
    });
  };

  /**
   * Remove all feature layers from map / layer controller, summary pane
   */
  _removeFeatures = function () {
    var layer,
        summary;

    if (_layers) {
      Object.keys(_layers).forEach(function(id) {
        layer = _layers[id];
        summary = document.getElementById(id);

        _mapPane.map.removeLayer(layer);
        _mapPane.layerController.removeLayer(layer);

        _summaryPane.removeFeature(summary);
      });
    }
  };

  /**
   * Set up environment / map and call methods for adding 'feature' layers
   *
   * @param geojson {Object}
   *     Geojson data returned by Earthquake class
   */
  _this.initFeatures = function (geojson) {
    var coords;

    _mainshock = geojson.features[0];
    coords = _mainshock.geometry.coordinates;

    _editPane.setDefaults(_mainshock);
    _mapPane.map.setView([coords[1], coords[0]], 10, true);

    // First, remove any existing event-specific features
    _removeFeatures();

    // Now, add event-specific features
    _addMainshock(geojson);
    _addAftershocks();
    _addHistorical();
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Features;
