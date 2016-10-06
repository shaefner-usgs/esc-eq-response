'use strict';


var Earthquake = require('Earthquake'),
    EarthquakesLayer = require('features/EarthquakesLayer'),
    EditPane = require('EditPane'),
    MapPane = require('MapPane'),
    Moment = require('Moment'),
    Navigation = require('Navigation');


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

  _addAftershocks = function () {
    var eq,
        params,
        url;

    eq = _earthquake.features[0];
    params = {
      latitude: eq.geometry.coordinates[1],
      longitude: eq.geometry.coordinates[0],
      maxradiuskm: document.getElementById('ashockDistance').value,
      starttime: Moment(eq.properties.time).utc().toISOString().slice(0, -5)
    };

    url = _getFeedUrl(params);
  };

  _addHistorical = function () {
    var eq,
        params,
        url,
        years;

    eq = _earthquake.features[0];
    years = document.getElementById('histYears').value;
    params = {
      endtime: Moment(eq.properties.time).utc().toISOString().slice(0, -5),
      latitude: eq.geometry.coordinates[1],
      longitude: eq.geometry.coordinates[0],
      maxradiuskm: document.getElementById('histDistance').value,
      starttime: Moment(eq.properties.time).utc().subtract(years, 'years')
        .toISOString().slice(0, -5)
    };

    url = _getFeedUrl(params);
  };

  /**
   * Add feature layer to map
   *
   * @param layer {L.Layer} Leaflet layer
   * @param name {String} layer name
   */
  _addLayer = function (layer, name) {
    _mapPane.map.addLayer(layer);
    _mapPane.layerController.addOverlay(layer, name);

    _features[name] = layer;
  };

  /**
   * Create and then add earthquake (mainshock) layer
   */
  _addMainshock = function () {
    var mainshock;

    mainshock = EarthquakesLayer({
      data: _earthquake
    });

    _addLayer(mainshock, 'Mainshock');
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
   * Get feed url for for querying aftershocks / historical seismicity
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

    pairs = ['format=geojson'];
    Object.keys(params).forEach(function(key) {
      pairs.push(key + '=' + params[key]);
    });
    queryString = '?' + pairs.join('&');

    return baseUri + queryString;
  };

  /**
   * Set up environment and map and call methods for adding feature layers
   *
   * @param geojson {Object}
   *     Geojson layer returned by Earthquake class
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
   * Remove all feature (i.e. event-related) layers from map / layer controller
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
