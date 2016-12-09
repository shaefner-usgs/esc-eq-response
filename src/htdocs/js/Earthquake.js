'use strict';


var AppUtil = require('AppUtil'),
    Moment = require('moment'),
    Xhr = require('util/Xhr');


/**
 * Factory for creating an earthquake (mainshock) instance
 *
 * @param options {Object}
 *   {
 *     callback: {Function},
 *     editPane: {Object}, // EditPane instance
 *     id: {String},
 *     loadingModule: {Object} // LoadingModule instance
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
      _loadFeed;


  _this = {};

  _initialize = function (options) {
    options = options || {};
    _callback = options.callback;
    _editPane = options.editPane;
    _id = options.id;
    _loadingModule = options.loadingModule;

    _loadFeed();
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
   * Load GeoJson feed for selected event id, then call _createGeoJson()
   */
  _loadFeed = function () {
    var url;

    // Alert user that feature is loading (removed by Features class)
    _loadingModule.addItem('mainshock', 'Mainshock');

    url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/' +
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
          _loadingModule.addError('mainshock', 'Error Loading Mainshock' +
            ' <span>Event ID: ' + _id + ' not found</span>');
        }
      }
    });
  };

  /**
   * Get html for pulldown menu of significant eqs
   *
   * @param data {Object}
   *     GeoJson data
   *
   * @return html {String}
   */
  _this.getHtml = function (data) {
    var coords,
        depth,
        eqMoment,
        html,
        isoTime,
        latlng,
        localTime,
        mag,
        props,
        utcTime;

    coords = data.geometry.coordinates;
    props = data.properties;

    eqMoment = Moment.utc(props.time, 'x');
    isoTime = eqMoment.toISOString();
    utcTime = eqMoment.format('MMM D, YYYY HH:mm:ss') + ' UTC';

    if (props.tz) {
      localTime = eqMoment.utcOffset(props.tz).format('MMM D, YYYY h:mm:ss A') +
        ' at epicenter';
    }

    depth = AppUtil.round(coords[2], 1);
    latlng = AppUtil.round(coords[1], 3) + ', ' + AppUtil.round(coords[0], 3);
    mag = AppUtil.round(props.mag, 1);

    html = '<h4><a href="' + props.url + '">' + props.magType + ' ' + mag +
      ' - ' + props.place + '</a></h4>';
    html += '<dl>' +
        '<dt>Time</dt>' +
        '<dd>';
    if (localTime) {
      html += '<time datetime="' + isoTime + '">' + localTime + '</time>';
    }
    html += '<time datetime="' + isoTime + '">' + utcTime + '</time></dd>' +
        '<dt>Location</dt>' +
        '<dd>' + latlng + '</dd>' +
        '<dt>Depth</dt>' +
        '<dd>' + depth + ' km</dd>' +
        '<dt>Status</dt>' +
        '<dd>' + props.status + '</dd>' +
      '</dl>';

    return html;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Earthquake;
