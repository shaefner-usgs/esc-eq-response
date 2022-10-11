/* global L */
'use strict';


var AppUtil = require('util/AppUtil');


var _DEFAULTS,
    _FLAG_DESCRIPTIONS;

_FLAG_DESCRIPTIONS = {
  G: 'Glitch (clipped or below noise)',
  I: 'Incomplete time series',
  M: 'Manually flagged',
  N: 'Not in list of known stations',
  T: 'Outlier'
};
_DEFAULTS = {
  iconAnchor: [7, 5],
  iconSize: [14, 10],
  popupAnchor: [0, -5]
};


/**
 * Create the ShakeMap Stations Feature.
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *       defaults: {Object}
 *     }
 *
 * @return _this {Object}
 *     {
 *       count: {Integer}
 *       deferFetch: {Boolean}
 *       destroy: {Function}
 *       id: {String}
 *       mapLayer: {L.FeatureGroup}
 *       name: {String}
 *       showLayer: {Boolean}
 *       url: {String}
 *       zoomToLayer: {Boolean}
 *     }
 */
var ShakeMapStations = function (options) {
  var _this,
      _initialize,

      _app,
      _markerOptions,

      _filter,
      _getAmplitudes,
      _getComponent,
      _getPopup,
      _getRow,
      _getTable,
      _getTooltip,
      _getUrl,
      _onEachFeature,
      _pointToLayer;


  _this = {};

  _initialize = function (options = {}) {
    options = Object.assign({}, _DEFAULTS, options);

    Object.assign(_this, options.defaults);

    _app = options.app;
    _markerOptions = {
      iconAnchor: options.iconAnchor,
      iconSize: options.iconSize,
      popupAnchor: options.popupAnchor
    };

    _this.count = 0;
    _this.deferFetch = true;
    _this.id = 'shakemap-stations';
    _this.mapLayer = null; // default
    _this.name = 'ShakeMap Stations';
    _this.showLayer = false;
    _this.url = _getUrl();
    _this.zoomToLayer = false;

    if (_this.url) {
      _this.mapLayer = L.geoJSON.async(_this.url, {
        app: _app,
        feature: _this,
        filter: _filter,
        onEachFeature: _onEachFeature,
        pointToLayer: _pointToLayer
      });
    }
  };

  /**
   * Filter out DYFI stations.
   *
   * @param station {Object}
   *
   * @return {Number}
   */
  _filter = function (station) {
    var props = station.properties;

    if (props.network !== 'DYFI' && props.network !== 'INTENSITY') {
      return ++ _this.count;
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
   * Get the HTML content for the given amplitude's channel component.
   *
   * @param amplitude {Object}
   *
   * @return html {String}
   */
  _getComponent = function (amplitude) {
    var flag, html, value;

    if (amplitude) {
      flag = amplitude.flag;
      value = AppUtil.round(amplitude.value, 2);

      // Add flag class for all non-zero flags
      if (flag && flag !== '0') {
        html = '<span class="station-flag">' + value;

        // display flag with title text
        if (_FLAG_DESCRIPTIONS[flag]) {
          html += ` <abbr title="${_FLAG_DESCRIPTIONS[flag]}">(${flag})</abbr>`;
        } else {
          html += ` (${flag})`;
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
   * Get the HTML content for the given station's Leaflet popup.
   *
   * @param station {Object}
   *
   * @return html {String}
   */
  _getPopup = function (station) {
    var coords = station.geometry.coordinates,
        props = station.properties,
        data = {
          channels: _getTable(props.channels),
          pga: AppUtil.round(props.pga, 2),
          pgv: AppUtil.round(props.pgv, 2),
          distance: AppUtil.round(props.distance, 1),
          intensity: AppUtil.round(props.intensity, 1),
          network: props.network || '–',
          location: AppUtil.formatLatLon(coords),
          romanIntensity: AppUtil.romanize(props.intensity) || 'I',
          source: props.source || '–',
          title: _getTooltip(station)
        },
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
            '<dl class="station-metadata horizontal props">' +
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
   * Get the HTML <tr> for the given channel.
   *
   * @param channel {Object}
   *
   * @return html {String}
   */
  _getRow = function (channel) {
    var amplitudes = _getAmplitudes(channel.amplitudes),
        data = {
          name: channel.name,
          pga: _getComponent(amplitudes.pga),
          pgv: _getComponent(amplitudes.pgv),
          psa03: _getComponent(amplitudes['sa(0.3)']),
          psa10: _getComponent(amplitudes['sa(1.0)']),
          psa30: _getComponent(amplitudes['sa(3.0)'])
        },
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
   * Get the HTML <table> for the given channels.
   *
   * @param channels {Array}
   *
   * @return html {String}
   */
  _getTable = function (channels) {
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
      html += _getRow(channel)
    );

    html += '</tbody></table>';

    return html;
  };

  /**
   * Get the HTML content for the given station's Leaflet tooltip.
   *
   * @param station {Object}
   *
   * @return {String}
   */
  _getTooltip = function (station) {
    var props = station.properties,
        data = {
          code: props.code || '–',
          name: props.name || '–'
        };

    return L.Util.template('<strong>{code}</strong> {name}', data);
  };

  /**
   * Get the JSON feed's URL.
   *
   * @return url {String}
   */
  _getUrl = function () {
    var contents,
        mainshock = _app.Features.getFeature('mainshock'),
        shakemap = mainshock.json.properties.products.shakemap,
        url = '';

    if (shakemap) {
      contents = shakemap[0].contents;

      if (contents['download/stationlist.json']) {
        url = contents['download/stationlist.json'].url;
      }
    }

    return url;
  };

  /**
   * Add Leaflet popups and tooltips.
   *
   * @param feature {Object}
   * @param layer (L.Layer)
   */
  _onEachFeature = function (feature, layer) {
    var tooltip = _getTooltip(feature);

    layer.bindPopup(_getPopup(feature), {
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
    var props = feature.properties,
        romanIntensity = AppUtil.romanize(props.intensity) || 'I',
        options = Object.assign({}, _markerOptions, {
          className: 'station-layer-icon station-mmi' + romanIntensity
        });

    return L.marker(latlng, {
      icon: L.divIcon(options),
      pane: _this.id // controls stacking order
    });
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;
    _markerOptions = null;

    _filter = null;
    _getAmplitudes = null;
    _getComponent = null;
    _getPopup = null;
    _getRow = null;
    _getTable = null;
    _getTooltip = null;
    _getUrl = null;
    _onEachFeature = null;
    _pointToLayer = null;

    _this = null;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = ShakeMapStations;
