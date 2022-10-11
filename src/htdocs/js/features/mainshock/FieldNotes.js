/* global L */
'use strict';


require('leaflet');

var AppUtil = require('util/AppUtil'),
    Lightbox = require('util/Lightbox'),
    Luxon = require('luxon');


var _DEFAULTS = {
  iconAnchor: L.point(10, 25),
  iconRetinaUrl: 'img/pin-s-star+c0f@2x.png',
  iconSize: L.point(20, 50),
  iconUrl: 'img/pin-s-star+c0f.png',
  opacity: 0.85,
  popupAnchor: L.point(0, -25),
  tooltipAnchor: L.point(0, -15)
};


/**
 * Create the FieldNotes Feature.
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *       defaults: {Object}
 *     }
 *
 * @return _this {Object}
 *     {
 *       addListeners: {Function}
 *       addData: {Function}
 *       count: {Integer}
 *       destroy: {Function}
 *       id: {String}
 *       mapLayer: {L.FeatureGroup}
 *       name: {String}
 *       removeListeners: {Function}
 *       showLayer: {Boolean}
 *       url: {String}
 *       zoomToLayer: {Boolean}
 *     }
 */
var FieldNotes = function (options) {
  var _this,
      _initialize,

      _app,
      _lightbox,
      _markerOptions,

      _addListeners,
      _getList,
      _getPopup,
      _getUrl,
      _onEachFeature,
      _onPopupOpen,
      _pointToLayer,
      _removeListeners,
      _showPhoto,
      _toggleProps,
      _updatePopup;


  _this = {};

  _initialize = function (options = {}) {
    options = Object.assign({}, _DEFAULTS, options);

    Object.assign(_this, options.defaults);

    _app = options.app;

    _this.count = 0;
    _this.id = 'fieldnotes';
    _this.name = 'Fieldnotes';
    _this.url = _getUrl();
    _this.zoomToLayer = false;

    _lightbox = Lightbox({id: _this.id});
    _markerOptions = {
      icon: L.icon({
        iconAnchor: options.iconAnchor,
        iconRetinaUrl: options.iconRetinaUrl,
        iconSize: options.iconSize,
        iconUrl: options.iconUrl,
        popupAnchor: options.popupAnchor,
        tooltipAnchor: options.tooltipAnchor
      }),
      opacity: options.opacity,
      pane: _this.id // controls stacking order
    };

    _this.mapLayer = L.geoJSON.async(_this.url, {
      app: _app,
      feature: _this,
      onEachFeature: _onEachFeature,
      pointToLayer: _pointToLayer
    });
  };

  /**
   * Event handler that adds a Popup's event listeners.
   *
   * @param e {Event}
   */
  _addListeners = function (e) {
    var popup = e.popup.getElement(),
        photo = popup.querySelector('.photo'),
        toggle = popup.querySelector('.toggle a');

    if (photo) {
      photo.addEventListener('click', _showPhoto);
    }

    if (toggle) {
      toggle.addEventListener('click', _toggleProps);
    }
  };

  /**
   * Get the HTML content for the 'Additional properties' list. These are the
   * props that vary based on the observation type.
   *
   * @param props {Object}
   *
   * @return html {String}
   */
  _getList = function (props) {
    var html = '',
        list = '',
        skipProps = ['accuracy', 'attachment', 'description', 'form', 'igid',
          'notes', 'operator', 'recorded', 'site', 'synced', 'timestamp',
          'timezone', 'title', 'zaccuracy'];

    Object.keys(props).forEach(key => {
      if (skipProps.indexOf(key) === -1) { // skip props shared by all types
        var value = props[key] || '–';

        list += `<dt>${key}</dt><dd>${value}</dd>`;
      }
    });

    if (list) {
      html =
        '<p class="toggle">' +
          '<a href="#">Additional properties</a>' +
        '</p>' +
        `<dl class="props hide">${list}</dl>`;
    }

    return html;
  };

  /**
   * Get the Leaflet popup content for a Marker.
   *
   * @param data {Object}
   *
   * @return html {String}
   */
  _getPopup = function (data) {
    var html,
        img = '',
        list = _getList(data);

    if (data.attachment) {
      img =
        '<a class="photo" href="{attachment}">' +
          '<div class="spinner"></div>' +
          '<img src="{attachment}" alt="photo" />' +
        '</a>';
    }

    html = L.Util.template(
      '<h4>{title}</h4>' +
        '<time>{timestamp} {timezone}</time>' +
        '<p class="description">{description}</p>' +
        '<p class="notes">{notes}</p>' +
        img + list +
        '<p class="operator">' +
          '<a href="mailto:{operator}">{operator}</a>' +
        '</p>',
      data
    );

    return html;
  };

  /**
   * Get the JSON feed's URL.
   *
   * @return {String}
   */
  _getUrl = function () {
    var mainshock = _app.Features.getFeature('mainshock'),
        props = mainshock.json.properties,
        after = Luxon.DateTime.fromMillis(props.time + 1000).toUTC()
          .toSeconds(),
        before = Luxon.DateTime.fromMillis(props.time).toUTC()
          .plus({ days: 30 }).toSeconds(),
        coords = mainshock.data.coords,
        pairs = [],
        params = {
          between: after + ',' + before,
          lat: coords[1],
          lon: coords[0],
          radius: document.getElementById('as-dist').value // Aftershocks
        };

    Object.keys(params).forEach(key =>
      pairs.push(key + '=' + params[key])
    );

    return 'https://bayquakealliance.org/fieldnotes/features.json.php?' +
      pairs.join('&');
  };

  /**
   * Add Leaflet popups and tooltips.
   *
   * @param feature {Object}
   * @param layer (L.Layer)
   */
  _onEachFeature = function (feature, layer) {
    var props = feature.properties;

    // Strip slashes from JSON encoded values
    Object.keys(props).forEach(key =>
      props[key] = AppUtil.stripslashes(props[key])
    );

    props.title = props.form;
    if (props.site) {
      props.title += ': ' + props.site;
    }

    layer
      .bindPopup(_getPopup(props), {
        className: 'fieldnotes',
        maxWidth: 398, // fits 4X3 images 'flush' in popup (max-height is 300px)
        minWidth: 320
      })
      .bindTooltip(props.title);
  };

  /**
   * Event handler for opening a Popup.
   *
   * @param e {Event}
   */
  _onPopupOpen = function (e) {
    _addListeners(e);
    _updatePopup(e);
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
   * Event handler that removes a Popup's event listeners.
   *
   * @param e {Event}
   */
  _removeListeners = function (e) {
    var popup = e.popup.getElement(),
        photo = popup.querySelector('.photo'),
        toggle = popup.querySelector('.toggle a');

    if (photo) {
      photo.removeEventListener('click', _showPhoto);
    }

    if (toggle) {
      toggle.removeEventListener('click', _toggleProps);
    }
  };

  /**
   * Event handler that shows a full-size photo in a Lightbox.
   *
   * @param e {Event}
   */
  _showPhoto = function (e) {
    e.preventDefault();

    _lightbox.show();
  };

  /**
   * Event handler that shows/hides additional properties.
   *
   * @param e {Event}
   */
  _toggleProps = function (e) {
    var props = e.target.closest('div').querySelector('.props'),
        toggle = e.target.parentNode;

    e.preventDefault();

    props.classList.toggle('hide');
    toggle.classList.toggle('on');
  };

  /**
   * Event handler that updates the popup and sets its Lightbox content if it
   * includes a photo.
   *
   * @param e {Event}
   */
  _updatePopup = function (e) {
    var image,
        regex = /https:\/\/bayquakealliance\.org\/fieldnotes\/uploads\/\d+\.jpg/,
        url = regex.exec(e.popup.getContent());

    if (url) { // Popup includes a photo
      image = new Image();
      image.src = url[0];
      image.onload = function () {
        _removeListeners(e);
        e.popup.update(); // pan map to contain popup after image loads
        _addListeners(e);
      };

      _lightbox.setContent(`<img src="${image.src}" alt="enlarged photo" />`);
    }
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add the JSON feed data.
   *
   * @param json {Object}
   */
  _this.addData = function (json) {
    var legend = document.querySelector('#legendBar .fieldnotes');

    _this.count = json.features.length;

    // Hide if empty (only the 2014 Napa quake has FieldNotes data)
    if (_this.count === 0) {
      _app.MapPane.layerControl.addClass('hide', _this.id);
    } else {
      legend.classList.remove('hide');
    }
  };

  /**
   * Add event listeners.
   */
  _this.addListeners = function () {
    _this.mapLayer.on({
      popupopen: _onPopupOpen,
      popupclose: _removeListeners
    });
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _lightbox.destroy();

    _initialize = null;

    _app = null;
    _lightbox = null;
    _markerOptions = null;

    _addListeners = null;
    _getList = null;
    _getPopup = null;
    _getUrl = null;
    _onEachFeature = null;
    _onPopupOpen = null;
    _pointToLayer = null;
    _removeListeners = null;
    _showPhoto = null;
    _toggleProps = null;
    _updatePopup = null;

    _this = null;
  };

  /**
   * Remove event listeners.
   */
  _this.removeListeners = function () {
    _this.mapLayer.off({
      popupopen: _onPopupOpen,
      popupclose: _removeListeners
    });
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = FieldNotes;
