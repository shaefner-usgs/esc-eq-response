'use strict';


var Earthquake = require('Earthquake'),
    EarthquakesLayer = require('features/EarthquakesLayer'),
    EditPane = require('EditPane'),
    MapPane = require('MapPane'),
    Moment = require('Moment'),
    Navigation = require('Navigation'),
    Xhr = require('util/Xhr');


var Application = function (options) {
  var _this,
      _initialize,

      _earthquake,
      _editPane,
      _eqid,
      _els,
      _features,
      _mapPane,
      _navigation,

      _addAftershocks,
      _addHistorical,
      _addLayer,
      _addMainshock,
      _createEarthquake,
      _getFeedUrl,
      _initFeatureLayers,
      _loadFeed,
      _removeLayers;


  _this = {};

  _initialize = function (options) {
    _els = {
      map: options.map,
      summary: options.summary
    };
    _eqid = document.getElementById('eqid');
    _features = {};

    _editPane = EditPane();
    _mapPane = MapPane({
      el: _els.map
    });
    _navigation = Navigation({
      mapPane: _mapPane
    });

    if (_eqid.value) {
      _createEarthquake();
    }
    _eqid.addEventListener('change', _createEarthquake);
  };

  /**
   * Set params for aftershocks feature layer and then load the feed
   */
  _addAftershocks = function () {
    var mainshock,
        params;

    mainshock = _earthquake.features[0];
    params = {
      latitude: mainshock.geometry.coordinates[1],
      longitude: mainshock.geometry.coordinates[0],
      maxradiuskm: document.getElementById('ashockDistance').value,
      starttime: Moment(mainshock.properties.time + 1000).utc().toISOString().slice(0, -5)
    };

    _loadFeed({
      layerClass: EarthquakesLayer,
      name: 'Aftershocks',
      url: _getFeedUrl(params)
    });
  };

  /**
   * Set params for Historical seismicity feature layer and then load the feed
   */
  _addHistorical = function () {
    var mainshock,
        params,
        years;

    mainshock = _earthquake.features[0];
    years = document.getElementById('histYears').value;
    params = {
      endtime: Moment(mainshock.properties.time).utc().toISOString().slice(0, -5),
      latitude: mainshock.geometry.coordinates[1],
      longitude: mainshock.geometry.coordinates[0],
      maxradiuskm: document.getElementById('histDistance').value,
      starttime: Moment(mainshock.properties.time).utc().subtract(years, 'years')
        .toISOString().slice(0, -5)
    };

    _loadFeed({
      layerClass: EarthquakesLayer,
      name: 'Historical seismicity',
      url: _getFeedUrl(params)
    });
  };

  /**
   * Create and add a feature layer to map and layer controller
   *
   * @param opts {Object}
   *   {
   *     layerClass: {Function} // creates Leaflet layer
   *     layerOptions: {Object} // contains data prop (req'd) with geojson data
   *     name: {String} // layer name
   *   }
   */
  _addLayer = function (opts) {
    var layer;

    // Create Leaflet layer using Layer class specified in opts
    layer = opts.layerClass(opts.layerOptions);

    // Add it (and store it in _features for later removal)
    _mapPane.map.addLayer(layer);
    _mapPane.layerController.addOverlay(layer, opts.name);
    _features[opts.name] = layer;
  };

  /**
   * Wrapper for earthquake (mainshock) layer
   */
  _addMainshock = function () {
    _addLayer({
      layerClass: EarthquakesLayer,
      layerOptions: {
        data: _earthquake,
        mainshockTime: _earthquake.features[0].properties.time,
      },
      name: 'Mainshock'
    });
  };

  /**
   * Create a new earthquake instance using event id provided by user
   */
  _createEarthquake = function () {
    Earthquake({
      callback: _initFeatureLayers,
      id: _eqid.value
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
   * Set up environment / map and call methods for adding feature layers
   *
   * @param geojson {Object}
   *     Geojson data returned by Earthquake class
   */
  _initFeatureLayers = function (geojson) {
    var coords;

    _earthquake = geojson;
    coords = _earthquake.features[0].geometry.coordinates;

    _editPane.setDefaults(_earthquake);
    _mapPane.map.setView([coords[1], coords[0]], 9, true);

    _removeLayers();

    _addMainshock();
    _addAftershocks();
    _addHistorical();
  };

  /**
   * Load data feed for feature layer and then call _addLayer to create / add it
   *
   * @param opts {Object}
   *   {
   *     layerClass: {Function}
   *     name: {String}
   *     url: {String}
   *   }
   */
  _loadFeed = function (opts) {
    Xhr.ajax({
      url: opts.url,
      success: function (data) {
        _addLayer({
          layerClass: opts.layerClass,
          layerOptions: {
            data: data,
            mainshockTime: _earthquake.features[0].properties.time
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
   * Remove all feature layers from map / layer controller
   */
  _removeLayers = function () {
    var layer;

    if (_features) {
      Object.keys(_features).forEach(function(key) {
        layer = _features[key];

        _mapPane.map.removeLayer(layer);
        _mapPane.layerController.removeLayer(layer);
      });
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Application;
