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

      _layers,
      _loadingModule,
      _mainshock,
      _mapPane,
      _summaryPane,

      _addFeature,
      _addMainshock,
      _getFeedUrl,
      _loadFeed,
      _removeFeatures;


  _this = {};

  _initialize = function (options) {
    options = options || {};
    _loadingModule = options.loadingModule;
    _mapPane = options.mapPane;
    _summaryPane = options.summaryPane;

    _layers = {};
  };

  /**
   * Create and add a feature layer to map / layer controller, summary pane
   *
   * @param opts {Object}
   *   {
   *     count: {Integer}, // number of features in feature layer
   *     id: {String}, // layer id
   *     layerClass: {Function}, // creates Leaflet layer
   *     layerOptions: {Object}, // contains data prop (req'd) with geojson data
   *     name: {String} // layer name
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
    if (count) {
      name += ' (' + count + ')';
    }

    // Create Leaflet layer using Layer class specified in opts
    layer = opts.layerClass(opts.layerOptions);

    // Add it (and store it in _layers for potential removal later)
    _mapPane.map.addLayer(layer);
    _mapPane.layerController.addOverlay(layer, name);
    _layers[id] = layer;

    // Render mainshock on top of other features
    if (opts.name === 'Mainshock') {
      layer.bringToFront();
    } else {
      layer.bringToBack();
    }

    _summaryPane.addSummary({
      id: id,
      name: name,
      summary: layer.summary
    });

    // Feature done loading; remove alert
    _loadingModule.removeItem(id);
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

    // Alert user that feature is loading
    _loadingModule.addItem(id, name);

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
   *     id: {String},
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
            id: opts.id,
            data: data,
            mainshock: _mainshock
          },
          name: opts.name
        });
      },
      error: function (status) {
        console.log(status);
        if (status === 400) {
          _loadingModule.showError(opts.id, 'Error Loading ' + opts.name +
            ' <span>Modify the parameters to match fewer events (20,000 max)</span>');
        }
      }
    });
  };

  /**
   * Remove all feature layers from map / layer controller, summary pane
   */
  _removeFeatures = function () {
    if (_layers) {
      Object.keys(_layers).forEach(function(id) {
        _this.removeFeature(id);
      });
    }
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

    // Alert user that feature is loading
    _loadingModule.addItem(id, name);

    params = {
      latitude: _mainshock.geometry.coordinates[1],
      longitude: _mainshock.geometry.coordinates[0],
      maxradiuskm: document.getElementById('aftershocks-dist').value,
      starttime: Moment(_mainshock.properties.time + 1000).utc().toISOString().slice(0, -5)
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

    // Alert user that feature is loading
    _loadingModule.addItem(id, name);

    years = document.getElementById('historical-years').value;
    params = {
      endtime: Moment(_mainshock.properties.time).utc().toISOString().slice(0, -5),
      latitude: _mainshock.geometry.coordinates[1],
      longitude: _mainshock.geometry.coordinates[0],
      maxradiuskm: document.getElementById('historical-dist').value,
      starttime: Moment(_mainshock.properties.time).utc().subtract(years, 'years')
        .toISOString().slice(0, -5)
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

    _mapPane.map.setView([coords[1], coords[0]], 10, true);

    // First, remove any existing event-specific features
    _removeFeatures();

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

    _mapPane.map.removeLayer(layer);
    _mapPane.layerController.removeLayer(layer);

    _summaryPane.removeSummary(summary);
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Features;
