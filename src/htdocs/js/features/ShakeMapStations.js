/* global L */
'use strict';


require('leaflet/L.GeoJSON.DateLine.Center');

var AppUtil = require('util/AppUtil');


var _DEFAULTS,
    _FLAG_DESCRIPTIONS,
    _MARKER_DEFAULTS;

_FLAG_DESCRIPTIONS = {
  G: 'Glitch (clipped or below noise)',
  I: 'Incomplete time series',
  M: 'Manually flagged',
  N: 'Not in list of known stations',
  T: 'Outlier'
};
_MARKER_DEFAULTS = {
  iconAnchor: [7, 5],
  iconSize: [14, 10],
  popupAnchor: [0, -5]
};
_DEFAULTS = {
  markerOptions: _MARKER_DEFAULTS
};


/**
 * Create ShakeMap Stations Feature.
 *
 * @param options {Object}
 *   {
 *     app: {Object} Application
 *   }
 *
 * @return _this {Object}
 *   {
 *     count: {Integer}
 *     create: {Function}
 *     destroy: {Function}
 *     id: {String}
 *     mapLayer: {L.Layer}
 *     name: {String}
 *     reset: {Function}
 *     setFeedUrl: {Function}
 *     showLayer: {Boolean}
 *     url: {String}
 *     zoomToLayer: {Boolean}
 *   }
 */
var ShakeMapStations = function (options) {
  var _this,
      _initialize,

      _mainshock,
      _markerOptions,
      _shakemap,

      _createComponent,
      _createMapLayer,
      _createPopup,
      _createRow,
      _createTable,
      _filter,
      _getAmplitudes,
      _getTitle,
      _onEachFeature,
      _pointToLayer;


  _this = {};

  _initialize = function (options) {
    options = Object.assign({}, _DEFAULTS, options);

    _mainshock = options.app.Features.getFeature('mainshock');
    _markerOptions = options.markerOptions;

    _this.count = 0;
    _this.id = 'shakemap-stations';
    _this.mapLayer = null;
    _this.name = 'ShakeMap Stations';
    _this.showLayer = false;
    _this.url = '';
    _this.zoomToLayer = false;
  };

  /**
   * Create channel component HTML.
   *
   * @param data {Object}
   *
   * @return html {String}
   */
  _createComponent = function (data) {
    var flag,
        html,
        value;

    if (data) {
      flag = data.flag;
      value = AppUtil.round(data.value, 2);

      // Add flag class for all non-zero flags
      if (flag && flag !== '0') {
        html = '<span class="station-flag">' + value;

        // display flag with title text
        if (Object.prototype.hasOwnProperty.call(_FLAG_DESCRIPTIONS, flag)) {
          html += `<abbr title="${_FLAG_DESCRIPTIONS[flag]}">(${flag})</abbr>`;
        } else {
          html += `(${flag})`;
        }
        html += '</span>';
      } else {
        html = `<span>${value}</span>`;
      }
    } else {
      html = '<span>–</span>';
    }

    return html;
  };

  /**
   * Create Leaflet map layer.
   *
   * @param json {Object}
   *
   * @return mapLayer {L.Layer}
   */
  _createMapLayer = function (json) {
    var mapLayer;

    if (_shakemap) {
      mapLayer = L.geoJSON.dateLine(json, {
        filter: _filter,
        onEachFeature: _onEachFeature,
        pointToLayer: _pointToLayer
      });
    }

    return mapLayer;
  };

  /**
   * Create Leaflet popup content.
   *
   * @param station {Object}
   *
   * @return html {String}
   */
  _createPopup = function (station) {
    var coords,
        data,
        html,
        props;

    coords = station.geometry.coordinates;
    props = station.properties;
    data = {
      channels: _createTable(props.channels),
      pga: AppUtil.round(props.pga, 2),
      pgv: AppUtil.round(props.pgv, 2),
      distance: AppUtil.round(props.distance, 1),
      intensity: AppUtil.round(props.intensity, 1),
      network: props.network || '–',
      location: AppUtil.formatLatLon(coords),
      romanIntensity: AppUtil.romanize(props.intensity) || 'I',
      source: props.source || '–',
      title: _getTitle(station)
    };
    html = L.Util.template(
      '<div class="shakemap-stations">' +
        '<h4>{title}</h4>' +
        '<ul class="station-summary impact-bubbles">' +
          '<li class="station-summary-intensity mmi{romanIntensity} impact-bubble">' +
            '<strong class="roman">{romanIntensity}</strong>' +
            '<abbr title="Modified Mercalli Intensity">MMI</abbr>' +
          '</li>' +
          '<li class="station-summary-pga">' +
            '{pga}' +
            '<abbr title="Maximum Horizontal Peak Ground Acceleration (%g)">PGA</abbr>' +
          '</li>' +
          '<li class="station-summary-pgv">' +
            '{pgv}' +
            '<abbr title="Maximum Horizontal Peak Ground Velocity (cm/s)">PGV</abbr>' +
          '</li>' +
          '<li class="station-summary-distance">' +
            '{distance}' +
            '<abbr title="Distance from mainshock (km)">Dist</abbr>' +
          '</li>' +
        '</ul>' +
        '<dl class="station-metadata horizontal params">' +
          '<dt>Network</dt>' +
          '<dd>{network}</dd>' +
          '<dt>Location</dt>' +
          '<dd>{location}</dd>' +
          '<dt>Source</dt>' +
          '<dd>{source}</dd>' +
          '<dt>Intensity</dt>' +
          '<dd>{intensity}</dd>' +
        '</dl>' +
        '<h5>Channels</h5>' +
        '<div class="scroll-wrapper">' +
        '{channels}' +
        '</div>' +
      '</div>',
      data
    );

    return html;
  };

  /**
   * Create channel row HTML.
   *
   * @param channel {Object}
   *
   * @return html {String}
   */
  _createRow = function (channel) {
    var amplitude,
        data,
        html;

    amplitude = _getAmplitudes(channel.amplitudes);
    data = {
      name: channel.name,
      pga: _createComponent(amplitude.pga),
      pgv: _createComponent(amplitude.pgv),
      psa03: _createComponent(amplitude['sa(0.3)']),
      psa10: _createComponent(amplitude['sa(1.0)']),
      psa30: _createComponent(amplitude['sa(3.0)'])
    };
    html = L.Util.template(
      '<tr>' +
        '<th scope="row" class="station-channel-name freeze">{name}</th>' +
        '<td class="station-channel-pga">{pga}</td>' +
        '<td class="station-channel-pgv">{pgv}</td>' +
        '<td class="station-channel-psa03">{psa03}</td>' +
        '<td class="station-channel-psa10">{psa10}</td>' +
        '<td class="station-channel-psa30">{psa30}</td>' +
      '</tr>',
      data
    );

    return html;
  };

  /**
   * Create channels table HTML.
   *
   * @param channels {Array}
   *
   * @return html {String}
   */
  _createTable = function (channels) {
    var html =
      '<table class="station-channels-map">' +
        '<thead>' +
          '<tr>' +
            '<th scope="col" class="station-channels-map-name freeze">Name</th>' +
            '<th scope="col" class="station-channels-map-pga">' +
              '<abbr title="Peak Ground Acceleration (%g)">PGA</abbr>' +
            '</th>' +
            '<th scope="col" class="station-channels-map-pgv">' +
              '<abbr title="Peak Ground Velocity (cm/s)">PGV</abbr>' +
            '</th>' +
            '<th scope="col" class="station-channels-map-psa03">' +
              '<abbr title="Spectral Acceleration at 0.3 s period, 5% damping (%g)">PSA(0.3)</abbr>' +
            '</th>' +
            '<th scope="col" class="station-channels-map-psa10">' +
              '<abbr title="Spectral Acceleration at 1.0 s period, 5% damping (%g)">PSA(1.0)</abbr>' +
            '</th>' +
            '<th scope="col" class="station-channels-map-psa30">' +
              '<abbr title="Spectral Acceleration at 3.0 s period, 5% damping (%g)">PSA(3.0)</abbr>' +
            '</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>';

    channels.forEach(channel =>
      html += _createRow(channel)
    );

    html += '</tbody></table>';

    return html;
  };

  /**
   * Filter out DYFI stations.
   *
   * @param station {Object}
   */
  _filter = function (station) {
    var props = station.properties;

    if (props.network !== 'DYFI' && props.network !== 'INTENSITY') {
      _this.count ++;

      return true;
    }
  };

  /**
   * Get an amplitudes object keyed by 'name'.
   *
   * @param amps {Array}
   *
   * @return amplitudes {Object}
   */
  _getAmplitudes = function (amps) {
    var amplitudes = {};

    amps.forEach(amplitude =>
      amplitudes[amplitude.name] = amplitude
    );

    return amplitudes;
  };

  /**
   * Get station's title.
   *
   * @param station {Object}
   *
   * @return {String}
   */
  _getTitle = function (station) {
    var data,
        props;

    props = station.properties;
    data = {
      code: props.code || '–',
      name: props.name || '–'
    };

    return L.Util.template('<strong>{code}</strong> {name}', data);
  };

  /**
   * Create Leaflet popups and tooltips.
   *
   * @param feature {Object}
   * @param layer (L.Layer)
   */
  _onEachFeature = function (feature, layer) {
    var tooltip = _getTitle(feature);

    layer.bindPopup(_createPopup(feature), {
      maxWidth: 425,
      minWidth: 300
    }).bindTooltip(tooltip);
  };

  /**
   * Create Leaflet markers.
   *
   * @param feature {Object}
   * @param latlng {L.LatLng}
   *
   * @return {L.Marker}
   */
  _pointToLayer = function (feature, latlng) {
    var props,
        romanIntensity;

    props = feature.properties;
    romanIntensity = AppUtil.romanize(props.intensity) || 'I';

    _markerOptions.className = 'station-layer-icon station-mmi' + romanIntensity;

    return L.marker(latlng, {
      icon: L.divIcon(_markerOptions),
      pane: _this.id // put markers in custom Leaflet map pane
    });
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Create Feature (set properties that depend on external feed data).
   *
   * @param json {Object}
   *     feed data for feature
   */
  _this.create = function (json) {
    _this.mapLayer = _createMapLayer(json);
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _initialize = null;

    _mainshock = null;
    _markerOptions = null;
    _shakemap = null;

    _createComponent = null;
    _createMapLayer = null;
    _createPopup = null;
    _createRow = null;
    _createTable = null;
    _filter = null;
    _getAmplitudes = null;
    _getTitle = null;
    _onEachFeature = null;
    _pointToLayer = null;

    _this = null;
  };

  /**
   * Set the JSON feed's URL.
   */
  _this.setFeedUrl = function () {
    var contents;

    _shakemap = _mainshock.json.properties.products.shakemap;

    if (_shakemap) {
      contents = _shakemap[0].contents;

      if (contents['download/stationlist.json']) {
        _this.url = contents['download/stationlist.json'].url;
      }
    }
  };

  /**
   * Reset to initial state.
   */
  _this.reset = function () {
    _this.count = 0;
    _this.mapLayer = null;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = ShakeMapStations;
