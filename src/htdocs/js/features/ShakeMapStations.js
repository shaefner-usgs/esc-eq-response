/* global L */
'use strict';


var AppUtil = require('AppUtil'),
    Util = require('hazdev-webutils/src/util/Util');


var _DEFAULTS,
    _FLAG_DESCRIPTIONS,
    _MARKER_DEFAULTS;

_FLAG_DESCRIPTIONS = {
  'G': 'Glitch (clipped or below noise)',
  'I': 'Incomplete time series',
  'M': 'Manually flagged',
  'N': 'Not in list of known stations',
  'T': 'Outlier'
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
 * Create ShakeMap Stations Feature
 *
 * @param options {Object}
 *   {
 *     app: {Object}, // Application
 *     eqid: {String} // Mainshock event id
 *   }
 *
 * @return _this {Object}
 *   {
 *     destroy: {Function},
 *     id: {String},
 *     initFeature: {Function},
 *     mapLayer: {L.layer},
 *     name: {String},
 *     showLayer: {Boolean},
 *     title: {String},
 *     url: {String},
 *     zoomToLayer: {Boolean}
 *   }
 */
var ShakeMapStations = function (options) {
  var _this,
      _initialize,

      _app,
      _count,
      _markerOptions,
      _shakemap,

      _filter,
      _createAmplitudesObject,
      _createChannelRow,
      _createChannelTable,
      _formatComponent,
      _formatLocation,
      _formatTitle,
      _generatePopupContent,
      _getFeedUrl,
      _getMapLayer,
      _onEachFeature,
      _pointToLayer;


  _this = {};

  _initialize = function (options) {
    var mainshock;

    options = Util.extend({}, _DEFAULTS, options);
    mainshock = options.app.Features.getFeature('mainshock');

    _app = options.app;
    _count = 0;
    _markerOptions = options.markerOptions;
    _shakemap = mainshock.json.properties.products.shakemap;

    _this.id = 'shakemap-stations';
    _this.name = 'ShakeMap Stations';
    _this.showLayer = false;
    _this.url = _getFeedUrl();
    _this.zoomToLayer = false;
  };

  _createAmplitudesObject = function (amplitudes) {
    var amp = {},
        i,
        len = amplitudes.length,
        amplitude = null;

    for (i = 0; i < len; i++) {
      amplitude = amplitudes[i];
      amp[amplitude.name] = amplitude;
    }

    return amp;
  };

  _createChannelRow = function (channel) {
    var amplitude = _createAmplitudesObject(channel.amplitudes);

    return [
      '<tr>',
        '<th scope="row" class="station-channel-name freeze">',
          channel.name,
        '</th>',
        '<td class="station-channel-pga">',
          _formatComponent(amplitude.pga),
        '</td>',
        '<td class="station-channel-pgv">',
          _formatComponent(amplitude.pgv),
        '</td>',
        '<td class="station-channel-psa03">',
          _formatComponent(amplitude.psa03),
        '<td class="station-channel-psa10">',
          _formatComponent(amplitude.psa10),
        '</td>',
        '<td class="station-channel-psa30">',
          _formatComponent(amplitude.psa30),
        '</td>',
      '</tr>'
    ].join('');
  };

  _createChannelTable = function (channels) {
    var i = 0, numChannels = channels.length;

    var markup = [
      '<div class="scroll-wrapper">',
        '<table class="station-channels-map">',
          '<tr>',
            '<th scope="col" class="station-channels-map-name freeze">name</th>',
            '<th scope="col" class="station-channels-map-pga">pga</th>',
            '<th scope="col" class="station-channels-map-pgv">pgv</th>',
            '<th scope="col" class="station-channels-map-psa03">psa03</th>',
            '<th scope="col" class="station-channels-map-psa10">psa10</th>',
            '<th scope="col" class="station-channels-map-psa30">psa30</th>',
          '</tr>',
    ];

    for (; i < numChannels; i++) {
      markup.push(_createChannelRow(channels[i]));
    }

    markup.push('</div></table>');

    return markup.join('');
  };

  /**
   * Filter out DYFI stations
   *
   * @param feature {Object}
   */
  _filter = function (feature) {
    var props = feature.properties;

    if (props.network !== 'DYFI' && props.network !== 'INTENSITY') {
      return true;
    }
  };

  _formatComponent = function (data) {
    var content = [],
        flag,
        value;

    if (data) {
      flag = data.flag;
      value = data.value;

      // Add flag class for all non-zero flags
      if (flag && flag !== '0') {
        content.push('<span class="station-flag">');
        content.push(parseFloat(value, 10).toFixed(3));

        // display flag with title text
        if (_FLAG_DESCRIPTIONS.hasOwnProperty(flag)) {
          content.push('<abbr title="' + _FLAG_DESCRIPTIONS[flag] + '">(' +
              flag + ')</abbr>');
        } else {
          content.push('(' + flag + ')');
        }
        content.push('</span>');
      } else {
        content.push('<span>');
        content.push(parseFloat(value, 10).toFixed(3));
        content.push('</span>');
      }
    } else {
      content.push('<span>&ndash;</span>');
    }

    return content.join('');
  };

  _formatLocation = function (feature) {
    return ((feature.properties.location) ?
        (feature.properties.location + '<br/>') : '') + ' (' +
        feature.geometry.coordinates[1] + ', ' +
        feature.geometry.coordinates[0] + ')';
  };

  _formatTitle = function (feature, plainText) {
    var p = feature.properties;

    var title = [];

    if (!plainText) { title.push('<span class="station-code">'); }
    title.push(p.code || '&ndash;');
    if (!plainText) { title.push('</span>'); }

    title.push(' ');

    if (!plainText) { title.push('<span class="station-name">'); }
    title.push(p.name || '&ndash;');
    if (!plainText) { title.push('</span>'); }

    return title.join('');
  };

  _generatePopupContent = function (feature) {
    var p = feature.properties,
        romanIntensity = AppUtil.romanize(p.intensity) || 'I';

    var markup = ['<div class="station-popup">',
      '<h4 class="station-title">', _formatTitle(feature), '</h4>',
      '<ul class="station-summary">',
        '<li class="station-summary-intensity roman mmi', romanIntensity, '">',
          romanIntensity,
          '<br><abbr title="Modified Mercalli Intensity">mmi</abbr></br>',
        '</li>',
        '<li class="station-summary-pga">',
          AppUtil.round(p.pga, 3, '&ndash;'),
          '<br><abbr title="Maximum Horizontal Peak Ground Acceleration (%g)">PGA</abbr></br>',
        '</li>',
        '<li class="station-summary-pgv">',
          AppUtil.round(p.pgv, 3, '&ndash;'),
          '<br><abbr title="Maximum Horizontal Peak Ground Velocity (cm/s)">PGV</abbr></br>',
        '</li>',
        '<li class="station-summary-distance">',
          AppUtil.round(p.distance, 1, '&ndash;'),' km',
          '<br><abbr title="Distance (km)">Dist</abbr></br>',
        '</li>',
      '</ul>',
      '<dl class="station-metadata horizontal">',
        '<dt class="station-metadata-network">Network</dt>',
        '<dd class="station-metadata-network">',
          (p.network || '&ndash;'),
        '</dd>',
        '<dt class="station-metadata-location">Location</dt>',
        '<dd class="station-metadata-location">',
          _formatLocation(feature),
        '</dd>',
        '<dt class="station-metadata-source">Source</dt>',
        '<dd class="station-metadata-source">', (p.source || '&ndash;'), '</dd>',
        '<dt class="station-metadata-intensity">Intensity</dt>',
        '<dd class="station-metadata-intensity">',
          AppUtil.round(p.intensity, 1/*, '&ndash;'*/),
        '</dd>',
      '</dl>',
      _createChannelTable(p.channels),
    '</div>'];

    return markup.join('');
  };

  /**
   * Get URL of json feed
   *
   * @return url {String}
   */
  _getFeedUrl = function () {
    var contents,
        url;

    url = '';

    if (_shakemap) {
      contents = _shakemap[0].contents;
      if (contents['download/stationlist.json']) {
        url = contents['download/stationlist.json'].url;
      }
    }

    return url;
  };

  /**
   * Get Leaflet map layer
   *
   * @param json {Object}
   *
   * @return mapLayer {L.layer}
   */
  _getMapLayer = function (json) {
    var mapLayer;

    if (_shakemap) {
      mapLayer = L.geoJson(json, {
        filter: _filter,
        onEachFeature: _onEachFeature,
        pointToLayer: _pointToLayer
      });
    }

    return mapLayer;
  };

  /**
   * Create Leaflet popups and tooltips
   *
   * @param feature {Object}
   * @param layer (L.Layer)
   */
  _onEachFeature = function (feature, layer) {
    var tooltip;

    tooltip = _formatTitle(feature, true);
    layer.bindPopup(_generatePopupContent(feature), {
      autoPanPadding: L.point(50, 50),
      minWidth: 300,
      maxWidth: 425
    }).bindTooltip(tooltip);

    _count ++;
  };

  /**
   * Create Leaflet markers
   *
   * @param feature {Object}
   * @param latlng {L.LatLng}
   *
   * @return {L.CircleMarker}
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
   * Destroy this Class to aid in garbage collection
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;
    _count = null;
    _markerOptions = null;
    _shakemap = null;

    _filter = null;
    _createAmplitudesObject = null;
    _createChannelRow = null;
    _createChannelTable = null;
    _formatComponent = null;
    _formatLocation = null;
    _formatTitle = null;
    _generatePopupContent = null;
    _getFeedUrl = null;
    _getMapLayer = null;
    _onEachFeature = null;
    _pointToLayer = null;

    _this = null;
  };

  /**
   * Init Feature (set properties that depend on external feed data)
   *
   * @param json {Object}
   *     feed data for feature
   */
  _this.initFeature = function (json) {
    _this.mapLayer = _getMapLayer(json);
    _this.title = _this.name + ' (' + _count + ')';
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = ShakeMapStations;
