/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
    Lightbox = require('util/Lightbox'),
    Moment = require('moment'),
    Util = require('hazdev-webutils/src/util/Util');


var _DEFAULTS,
    _ICON_DEFAULTS,
    _MARKER_DEFAULTS;

_ICON_DEFAULTS = {
  iconAnchor: L.point(10, 25),
  iconRetinaUrl: 'img/pin-s-star+c0f@2x.png',
  iconSize: L.point(20, 50),
  iconUrl: 'img/pin-s-star+c0f.png',
  popupAnchor: L.point(0, -25),
  tooltipAnchor: L.point(0, -15)
};
_MARKER_DEFAULTS = {
  opacity: 0.85
};
_DEFAULTS = {
  iconOptions: _ICON_DEFAULTS,
  markerOptions: _MARKER_DEFAULTS
};

/**
 * Create FieldNotes Feature.
 *
 * @param options {Object}
 *   {
 *     app: {Object}, // Application
 *     eqid: {String} // Mainshock event id
 *   }
 *
 * @return _this {Object}
 *   {
 *     count: {Integer},
 *     destroy: {Function},
 *     id: {String},
 *     initFeature: {Function},
 *     mapLayer: {L.Layer},
 *     name: {String},
 *     showLayer: {Boolean},
 *     url: {String},
 *     zoomToLayer: {Boolean}
 *   }
 */
var FieldNotes = function (options) {
  var _this,
      _initialize,

      _app,
      _markerOptions,
      _Lightbox,

      _addListeners,
      _createList,
      _createPopup,
      _getFeedUrl,
      _onEachFeature,
      _pointToLayer,
      _updatePopup;


  _this = {};

  _initialize = function (options) {
    options = Util.extend({}, _DEFAULTS, options);

    _app = options.app;
    _Lightbox = Lightbox();

    _this.id = 'fieldnotes';
    _this.mapLayer = null;
    _this.name = 'Fieldnotes';
    _this.showLayer = false;
    _this.url = _getFeedUrl();
    _this.zoomToLayer = false;

    _markerOptions = Util.extend({
      icon: L.icon(options.iconOptions),
      pane: _this.id // control stacking order
    }, options.markerOptions);
  };

  /**
   * Add event listeners to map popup.
   *
   * @param div {Element}
   *     L.Popup div
   */
  _addListeners = function (div) {
    var photo,
        toggle;

    photo = div.querySelector('.photo');
    toggle = div.querySelector('.toggle');

    if (photo) {
      photo.addEventListener('click', function(e) {
        e.preventDefault();
        _Lightbox.show();
      });
    }

    if (toggle) {
      toggle.addEventListener('click', function(e) {
        e.preventDefault();
        this.closest('.properties').classList.toggle('hide');
      });
    }
  };

  /**
   * Create 'Additional properties' list html. These are 'custom' props that
   *   vary based on observation type.
   *
   * @param props {Object}
   *
   * @return html {String}
   */
  _createList = function (props) {
    var html,
        list,
        skipProps,
        value;

    html = '';
    list = '';
    skipProps = ['accuracy', 'attachment', 'description', 'form', 'igid',
      'notes', 'operator', 'recorded', 'site', 'synced', 'timestamp',
      'timezone', 'title', 'zaccuracy'];

    Object.keys(props).forEach(function (key) {
      if (skipProps.indexOf(key) === -1) { // skip props shared by all types
        value = props[key] || '&ndash;';
        list += '<dt>' + key + '</dt><dd>' + value + '</dd>';
      }
    });

    if (list) {
      html = '<p class="properties hide">' +
          '<a href="#" class="toggle">Additional properties</a>' +
        '</p>' +
        '<dl class="custom">' + list + '</dl>';
    }

    return html;
  };

  /**
   * Create Leaflet popup content.
   *
   * @param data {Object}
   *
   * @return div {Element}
   */
  _createPopup = function (data) {
    var div,
        html,
        img,
        props;

    div = L.DomUtil.create('div');
    img = '';
    props = _createList(data);

    if (data.attachment) {
      img = '<a class="photo" href="{attachment}">' +
          '<div class="spinner"></div>' +
          '<img src="{attachment}" alt="photo" />' +
        '</a>';
    }

    html = L.Util.template(
      '<h4>{title}</h4>' +
        '<time>{timestamp} {timezone}</time>' +
        '<p class="description">{description}</p>' +
        '<p class="notes">{notes}</p>' +
        img +
        props +
        '<p class="operator">' +
          '<a href="mailto:{operator}">{operator}</a>' +
        '</p>',
      data
    );
    div.innerHTML = html;

    _addListeners(div);

    return div;
  };

  /**
   * Get URL of JSON feed.
   *
   * @return {String}
   */
  _getFeedUrl = function () {
    var after,
        before,
        mainshock,
        pairs,
        urlParams;

    mainshock = _app.Features.getFeature('mainshock');
    after = Moment(mainshock.json.properties.time + 1000).utc().format('X');
    before = Moment(mainshock.json.properties.time).utc().add(30, 'days').format('X');
    pairs = [];
    urlParams = {
      between: after + ',' + before,
      lat: mainshock.json.geometry.coordinates[1],
      lon: mainshock.json.geometry.coordinates[0],
      radius: AppUtil.getParam('as-dist') // use aftershocks radius
    };

    Object.keys(urlParams).forEach(function(key) {
      pairs.push(key + '=' + urlParams[key]);
    });

    return 'https://bayquakealliance.org/fieldnotes/features.json.php?' +
      pairs.join('&');
  };

  /**
   * Create Leaflet popups and tooltips.
   *
   * @param feature {Object}
   * @param layer (L.Layer)
   */
  _onEachFeature = function (feature, layer) {
    var props = feature.properties;

    // Strip slashes from JSON encoded values
    Object.keys(props).forEach(function(key) {
      props[key] = AppUtil.stripslashes(props[key]);
    });

    props.title = props.form;
    if (props.site) {
      props.title += ': ' + props.site;
    }

    layer
      .bindPopup(_createPopup(props), {
        autoPanPadding: L.point(50, 50),
        className: 'fieldnotes',
        maxWidth: 398, /* fits 4X3 images 'flush' in popup (max-height is 300px) */
        minWidth: 320
      })
      .bindTooltip(props.title)
      .on('popupopen', _updatePopup);
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
    return L.marker(latlng, _markerOptions);
  };

  /**
   * Update popup position after image loads and add Lightbox.
   *
   * @param e {Event}
   */
  _updatePopup = function (e) {
    var image,
        popup,
        regex,
        url;

    image = new Image();
    popup = e.popup;
    regex = /https:\/\/bayquakealliance\.org\/fieldnotes\/uploads\/\d+\.jpg/;
    url = regex.exec(popup.getContent().outerHTML);

    if (url) { // popup includes a photo
      image.src = url[0];
      image.onload = function () {
        popup.update(); // pan map to contain popup after image loads
      };

      _Lightbox.add('<img src="' + image.src + '" alt="enlarged photo" />');
    }
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
    _Lightbox = null;

    _addListeners = null;
    _createList = null;
    _createPopup = null;
    _getFeedUrl = null;
    _onEachFeature = null;
    _pointToLayer = null;
    _updatePopup = null;

    _this = null;
  };

  /**
   * Initialize Feature (set properties that depend on external feed data).
   *
   * @param json {Object}
   *     feed data for Feature
   */
  _this.initFeature = function (json) {
    _this.count = json.features.length;
    _this.mapLayer = L.geoJson(json, {
      onEachFeature: _onEachFeature,
      pointToLayer: _pointToLayer
    });
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = FieldNotes;
