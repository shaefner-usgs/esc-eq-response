/* global L */
'use strict';


var Lightbox = require('Lightbox'),
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
 * Create Fieldnotes Feature
 *
 * @param options {Object}
 *   {
 *     app: {Object}, // Application
 *     eqid: {String} // Mainshock event id
 *   }
 */
var FieldNotes = function (options) {
  var _this,
      _initialize,

      _app,
      _count,
      _markerOptions,
      _popup,
      _Lightbox,

      _addEventListeners,
      _genPopupContent,
      _getCustomProps,
      _onEachFeature,
      _pointToLayer,
      _updatePopup;


  _this = {};

  _initialize = function (options) {
    options = Util.extend({}, _DEFAULTS, options);

    _app = options.app;
    _Lightbox = Lightbox();

    _this.showLayer = false;
    _this.id = 'fieldnotes';
    _this.name = 'Fieldnotes';
    _this.zoomToLayer = false;

    _markerOptions = Util.extend({
      icon: L.icon(options.iconOptions),
      pane: _this.id // put markers in custom Leaflet map pane
    }, options.markerOptions);
  };

  /**
   * Add listeners to popups for expanding custom props and lightboxing photos
   *
   * @param div {Element}
   */
  _addEventListeners = function (div) {
    var photo,
        toggle;

    photo = div.querySelector('.photo');
    if (photo) {
      photo.addEventListener('click', function(e) {
        e.preventDefault();
        _Lightbox.show();
      });
    }

    toggle = div.querySelector('.toggle');
    if (toggle) {
      toggle.addEventListener('click', function(e) {
        e.preventDefault();
        this.closest('.properties').classList.toggle('hide');
        _popup.update();
      });
    }
  };

  /**
   * Create popup content
   *
   * @param props {Object}
   *
   * @return div {Element}
   */
  _genPopupContent = function (props) {
    var div,
        img,
        innerHTML;

    img = '';
    if (props.attachment) {
      img = '<a class="photo" href="{attachment}">' +
          '<div class="spinner"></div>' +
          '<img src="{attachment}" alt="photo" />' +
        '</a>';
    }

    innerHTML = L.Util.template('<h4>{title}</h4>' +
      '<time>{timestamp} {timezone}</time>' +
      '<p class="description">{description}</p>' +
      '<p class="notes">{notes}</p>' +
      img + _getCustomProps(props) +
      '<p class="operator"><a href="mailto:{operator}">{operator}</a></p>',
      props
    );

    div = L.DomUtil.create('div');
    div.innerHTML = innerHTML;
    _addEventListeners(div);

    return div;
  };

  /**
   * Get 'custom' properties that only apply to each observation type
   *
   * @param props {Object}
   *
   * @return html {String}
   */
  _getCustomProps = function (props) {
    var foundProps,
        html,
        skipProps,
        value;

    foundProps = false;

    // Props that are shared by all types
    skipProps = ['accuracy', 'attachment', 'description', 'form', 'igid',
      'notes', 'operator', 'recorded', 'site', 'synced', 'timestamp',
      'timezone', 'title', 'zaccuracy'];

    html = '<dl class="custom">';
    Object.keys(props).forEach(function (key) {
      if (skipProps.indexOf(key) === -1) { // prop is not in skipProps
        foundProps = true;
        value = props[key] || '&ndash;';
        html += '<dt>' + _app.AppUtil.ucfirst(key) + '</dt><dd>' + value + '</dd>';
      }
    });
    html += '</dl>';

    if (foundProps) {
      html = '<p class="properties hide">' +
        '<a href="#" class="toggle">Additional properties</a></p>' + html;
    }

    return html;
  };

  /**
   * Create Leaflet popups and tooltips
   *
   * @param feature {Object}
   * @param layer (L.Layer)
   */
  _onEachFeature = function (feature, layer) {
    var props;

    props = feature.properties;

    // Strip slashes from json encoded values
    Object.keys(props).forEach(function(key) {
      props[key] = _app.AppUtil.stripslashes(props[key]);
    });

    // Create title prop
    props.title = props.form;
    if (props.site) {
      props.title += ': ' + props.site;
    }

    layer
      .bindPopup(_genPopupContent(props), {
        autoPanPadding: L.point(50, 50),
        className: 'fieldnotes',
        maxWidth: 398, /* fits 4X3 images 'flush' in popup (max-height is 300px) */
        minWidth: 320
      })
      .bindTooltip(props.title)
      .on('popupopen', _updatePopup);

    _count ++;
  };

  /**
   * Create Leaflet markers
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
   * Update popup position and add Lightbox after image loads
   *
   * @param e {Event}
   */
  _updatePopup = function (e) {
    var image,
        regex,
        url;

    _popup = e.popup; // store in closure for access in other methods

    image = new Image();
    regex = /https:\/\/bayquakealliance\.org\/fieldnotes\/uploads\/\d+\.jpg/;
    url = regex.exec(_popup.getContent().outerHTML);

    if (url) { // popup has a photo
      image.onload = function () {
        _popup.update(); // pan map to contain popup after image loads
      };
      image.src = url[0];
      _Lightbox.add('<img src="' + image.src + '" alt="enlarged photo" />');
    }
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Get url of data feed
   *
   * @return {String}
   */
  _this.getFeedUrl = function () {
    var after,
        before,
        mainshock,
        pairs,
        urlParams;

    mainshock = _app.Features.getFeature('mainshock');
    after = _app.AppUtil.Moment(mainshock.json.properties.time + 1000).utc()
      .format('X');
    before = _app.AppUtil.Moment(mainshock.json.properties.time).utc()
      .add(30, 'days').format('X');
    pairs = [];
    urlParams = {
      between: after + ',' + before,
      lat: mainshock.json.geometry.coordinates[1],
      lon: mainshock.json.geometry.coordinates[0],
      radius: _app.AppUtil.getParam('as-dist') // use aftershocks radius
    };
    Object.keys(urlParams).forEach(function(key) {
      pairs.push(key + '=' + urlParams[key]);
    });

    return 'https://bayquakealliance.org/fieldnotes/features.json.php?' +
      pairs.join('&');
  };

  /**
   * Create Feature - set properties that depend on external feed data
   *
   * @param json {Object}
   *     feed data for Feature
   */
  _this.initFeature = function (json) {
    _count = 0;

    _this.mapLayer = L.geoJson(json, {
      onEachFeature: _onEachFeature,
      pointToLayer: _pointToLayer
    });
    _this.title = _this.name + ' (' + _count + ')';
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = FieldNotes;
