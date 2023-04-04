/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
    Lightbox = require('util/Lightbox');


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
 *       showLayer: {Boolean}
 *     }
 *
 * @return _this {Object}
 *     {
 *       addData: {Function}
 *       addListeners: {Function}
 *       count: {Integer}
 *       destroy: {Function}
 *       id: {String}
 *       mapLayer: {Mixed <L.FeatureGroup|null>}
 *       name: {String}
 *       removeListeners: {Function}
 *       showLayer: {Boolean}
 *       status: {Mixed <String|null>}
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

      _addPopupListeners,
      _configure,
      _getList,
      _getPopup,
      _getUrl,
      _onEachFeature,
      _onPopupClose,
      _onPopupOpen,
      _pointToLayer,
      _removePopupListeners,
      _showLightbox,
      _toggleProps,
      _updatePopup;


  _this = {};

  _initialize = function (options = {}) {
    options = Object.assign({}, _DEFAULTS, options);

    _app = options.app;

    _this.count = 0;
    _this.id = 'fieldnotes';
    _this.mapLayer = null;
    _this.name = 'Fieldnotes';
    _this.showLayer = options.showLayer;
    _this.status = null;
    _this.url = _getUrl();
    _this.zoomToLayer = false;

    // Only the 2014 Napa quake has FieldNotes data; skip for all other events
    if (AppUtil.getParam('eqid') === 'nc72282711') {
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
    } else {
      _this.status = 'ready'; // no data to fetch
    }
  };

  /**
   * Add event listeners to the given Popup.
   *
   * @param popup {Element}
   */
  _addPopupListeners = function (popup) {
    var photo = popup.querySelector('.photo'),
        toggle = popup.querySelector('.toggle a');

    if (photo) {
      photo.addEventListener('click', _showLightbox);
    }
    if (toggle) {
      toggle.addEventListener('click', _toggleProps);
    }
  };

  /**
   * Add the Feature's Lightbox and show its legend item.
   *
   * Note: the legend item is subsequently hidden by LegendBar.reset().
   */
  _configure = function () {
    var legend = document.querySelector('#legendBar .fieldnotes');

    if (_this.count !== 0) {
      _lightbox = Lightbox({id: _this.id});

      legend.classList.remove('hide');
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
   * Get the Leaflet Popup content for a Marker.
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
          '<img src="{attachment}" alt="photo">' +
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
        datetime = mainshock.data.eq.datetime,
        after = datetime.plus({ seconds: 1 }).toSeconds(),
        before = datetime.plus({ days: 30 }).toSeconds(),
        coords = mainshock.data.eq.coords,
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
   * Add Leaflet Popups and Tooltips.
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
        maxWidth: 398, // fits 4X3 images 'flush' in Popup (max-height is 300px)
        minWidth: 320
      })
      .bindTooltip(props.title);
  };

  /**
   * Event handler for closing a Popup.
   *
   * @param e {Event}
   */
  _onPopupClose = function (e) {
    _removePopupListeners(e.popup.getElement());
  };

  /**
   * Event handler for opening a Popup.
   *
   * @param e {Event}
   */
  _onPopupOpen = function (e) {
    var content, image,
        props = e.layer.feature.properties,
        imgSrc = props.attachment;

    _addPopupListeners(e.popup.getElement());

    if (imgSrc) {
      content = `<img src="${imgSrc}" alt="enlarged photo">`;
      image = new Image();

      _lightbox.setContent(content).setTitle(props.title);

      image.src = imgSrc;
      image.onload = () => _updatePopup(e.popup);
    }
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
   * Remove event listeners from the given Popup.
   *
   * @param popup {Element}
   */
  _removePopupListeners = function (popup) {
    var photo = popup.querySelector('.photo'),
        toggle = popup.querySelector('.toggle a');

    if (photo) {
      photo.removeEventListener('click', _showLightbox);
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
  _showLightbox = function (e) {
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
   * Pan map to contain Popup after the image loads.
   *
   * Note: listeners must be removed and re-added.
   *
   * @param popup {L.Popup}
   */
  _updatePopup = function (popup) {
    var el = popup.getElement();

    _removePopupListeners(el);
    popup.update();
    _addPopupListeners(el);
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add the JSON feed data.
   *
   * @param json {Object} default is {}
   */
  _this.addData = function (json = {}) {
    _this.count = json.features.length;

    _configure();
  };

  /**
   * Add event listeners.
   */
  _this.addListeners = function () {
    if (_this.mapLayer) {
      _this.mapLayer.on({
        popupopen: _onPopupOpen,
        popupclose: _onPopupClose
      });
    }
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    if (_lightbox) {
      _lightbox.destroy();
    }

    _initialize = null;

    _app = null;
    _lightbox = null;
    _markerOptions = null;

    _addPopupListeners = null;
    _configure = null;
    _getList = null;
    _getPopup = null;
    _getUrl = null;
    _onEachFeature = null;
    _onPopupClose = null;
    _onPopupOpen = null;
    _pointToLayer = null;
    _removePopupListeners = null;
    _showLightbox = null;
    _toggleProps = null;
    _updatePopup = null;

    _this = null;
  };

  /**
   * Remove event listeners.
   */
  _this.removeListeners = function () {
    if (_this.mapLayer) {
      _this.mapLayer.off({
        popupopen: _onPopupOpen,
        popupclose: _onPopupClose
      });
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = FieldNotes;
