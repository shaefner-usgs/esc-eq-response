'use strict';


var Xhr = require('util/Xhr');


/**
 * Factory for creating an earthquake instance
 *
 * @param options {Object}
 *   {
 *     callback: {Function},
 *     id: {String}
 *   }
 */
var Earthquake = function (options) {
  var _this,
      _initialize,

      _createGeoJson,
      _getFeatures,
      _loadDetailFeed,

      _callback,
      _editPane,
      _id;


  _this = {};

  _initialize = function (options) {
    _callback = options.callback;
    _editPane = options.editPane;
    _id = options.id;

    _loadDetailFeed();
  };

  /**
   * Create GeoJson object for selected earthquake and return via _callback()
   *
   * @param data {Object} GeoJson data
   */
  _createGeoJson = function (data) {
    var geojson,
        props;

    props = data.properties;

    geojson = {
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
            tz: props.tz,
            updated: props.updated,
            url: props.url
          },
          type: 'Feature'
        }
      ],
      metadata: {
        generated: Date.now(),
        title: 'Mainshock'
      }
    };

    _callback(geojson);
  };

  /**
   * Get urls to data feeds needed for feature layers on map, summary panes
   *
   * @return features {Object}
   */
  _getFeatures = function (products) {
    var features;

    if (products.shakemap) {
      features = {
        shakemap_mmi: products.shakemap[0].contents['download/cont_mi.json'].url
      };
    }

    return features;
  };

  /**
   * Load GeoJson detail feed for selected event id, then call _createGeoJson()
   */
  _loadDetailFeed = function () {
    var url;

    url = 'http://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/' +
      _id + '.geojson';

    Xhr.ajax({
      url: url,
      success: function (data) {
        _editPane.setDefaults(data);
        _createGeoJson(data);
      },
      error: function (status) {
        console.log(status);
      }
    });
  };


  _initialize(options);
  options = null;
  return _this;
};

module.exports = Earthquake;
