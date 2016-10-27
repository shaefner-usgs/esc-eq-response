'use strict';


var Xhr = require('util/Xhr');


/**
 * Factory for creating an earthquake instance
 *
 * @param options {Object}
 *   {
 *     callback: {Function},
 *     editPane: {Object}, // EditPane instance
 *     id: {String},
 *     loadingModule: {Object}, // LoadingModule instance
 *   }
 */
var Earthquake = function (options) {
  var _this,
      _initialize,

      _callback,
      _editPane,
      _id,
      _loadingModule,

      _createGeoJson,
      _getFeatures,
      _loadDetailFeed;


  _this = {};

  _initialize = function (options) {
    options = options || {};
    _callback = options.callback;
    _editPane = options.editPane;
    _id = options.id;
    _loadingModule = options.loadingModule;

    _loadDetailFeed();
  };

  /**
   * Create GeoJson object for selected earthquake and return via _callback()
   *
   * @param data {Object}
   *     GeoJson data
   */
  _createGeoJson = function (data) {
    var geojson,
        props;

    props = data.properties;

    geojson = {
      id: data.id,
      geometry: data.geometry,
      metadata: {
        generated: Date.now(),
        title: 'Mainshock'
      },
      properties: {
        alert: props.alert,
        cdi: props.cdi,
        features: _getFeatures(data.properties.products),
        felt: props.felt,
        mag: props.mag,
        magType: props.magType,
        mmi: props.mmi,
        place: props.place,
        status: props.status,
        time: props.time,
        tz: props.tz,
        updated: props.updated,
        url: props.url
      },
      type: 'Feature'
    };

    _callback(geojson);
  };

  /**
   * Get urls to data feeds needed for feature layers on map, summary panes
   *
   * @param products {Object}
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

    // Alert user that feature is loading
    _loadingModule.addItem('mainshock', 'Mainshock');

    url = 'http://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/' +
      _id + '.geojson';

    Xhr.ajax({
      url: url,
      success: function (data) {
        _editPane.setDefaults(data);
        _editPane.showEqDetails(data);
        _createGeoJson(data);
      },
      error: function (status) {
        console.log(status);
        if (status === 404) {
          _loadingModule.showError('mainshock', 'Error Loading Mainshock' +
            ' <span>Earthquake id (' + _id + ') not found</span>');
        }
      }
    });
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Earthquake;
