'use strict';


var Xhr = require('util/Xhr');

var Earthquake = function (options) {
  var _this,
      _initialize,

      _createGeoJson,
      _getFeatures,
      _loadDetailFeed,
      _setDefaults,

      _controller,
      _editPane,
      _id;

  _this = {};

  _initialize = function (options) {
    _controller = options.controller;
    _editPane = options.editPane;
    _id = options.id;

    _loadDetailFeed();
  };

  /**
   * Get urls to data feeds needed for map layers & summary
   *
   * @return urls {Object}
   */
  _getFeatures = function (products) {
    var features;

    features = {
      shakemap_mmi: products.shakemap[0].contents['download/cont_mi.json'].url
    };

    return features;
  };

  /**
   * Load GeoJson detail feed for selected event id
   */
  _loadDetailFeed = function () {
    var url;

    url = 'http://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/' +
      _id + '.geojson';

    Xhr.ajax({
      url: url,
      success: function (data) {
        _createGeoJson(data);
      },
      error: function (status) {
        console.log(status);
      }
    });
  };

  /**
   * Create GeoJson object for selected earthquake and attach to _this
   *
   * @param data {Object} GeoJson data
   */
  _createGeoJson = function (data) {
    var props,
        server;

    props = data.properties;
    server = 'http://earthquake.usgs.gov/';

    _this = {
      type: 'FeatureCollection',
      features: [
        {
          id: data.id,
          geometry: data.geometry,
          properties: {
            features: _getFeatures(data.properties.products),
            mag: props.mag,
            magType: props.magType,
            place: props.place,
            status: props.status,
            time: props.time,
            url: server + 'earthquakes/eventpage/' + data.id,
            utcOffset: props.tz,
            updated: props.updated
          },
          type: 'Feature'
        }
      ]
    };

    _setDefaults();
  };

  /**
   * Set default form field values based on selected event's details
   */
  _setDefaults = function () {
    var defaults;

    defaults = _editPane.getDefaults(_this);
    Object.keys(defaults).forEach(function(key) {
      // first, update url params
      if (_controller.getParam(key) === '') { // only set empty fields
        _controller.setParam(key, defaults[key]);
      }
    });

    // next, update all form fields to match url params
    _controller.setFormFields();
  };


  _initialize(options);
  options = null;
  return _this;
};

module.exports = Earthquake;
