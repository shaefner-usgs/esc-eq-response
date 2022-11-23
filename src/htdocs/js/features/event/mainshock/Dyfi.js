/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
    Lightbox = require('util/ui/Lightbox'),
    RadioBar = require('util/ui/RadioBar');


/**
 * Create the Did You Feel It? Feature, a sub-Feature of the Mainshock.
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *     }
 *
 * @return _this {Object}
 *     {
 *       destroy: {Function}
 *       id: {String}
 *       name: {String}
 *       removeListeners: {Function}
 *     }
 */
var Dyfi = function (options) {
  var _this,
      _initialize,

      _el,
      _lightbox,
      _mainshock,
      _radioBar,
      _selected,

      _addLightbox,
      _addListeners,
      _getContent,
      _getData,
      _getImages,
      _showLightbox;


  _this = {};

  _initialize = function (options = {}) {
    _mainshock = options.app.Features.getFeature('mainshock');
    _selected = 'block';

    _this.id = 'dyfi';
    _this.name = 'Did You Feel It?';

    if (_mainshock.data.dyfiImg) {
      _addLightbox();
      _addListeners();
    }
  };

  /**
   * Add the Lightbox.
   */
  _addLightbox = function () {
    _lightbox = Lightbox({
      content: _getContent(),
      id: _this.id,
      title: _this.name
    });

    _radioBar.setOption.call(document.getElementById(_selected));
  };

  /**
   * Add event listeners.
   */
  _addListeners = function () {
    _el = document.querySelector('.thumbs .dyfi a');

    if (_el) {
      _el.addEventListener('click', _showLightbox);
    }

    // Display the selected image
    if (_radioBar) {
      _radioBar.addListeners(document.getElementById('dyfi-images'));
    }
  };

  /**
   * Get the HTML content for the Lightbox.
   *
   * @return {String}
   */
  _getContent = function () {
    var template,
        data = Object.assign({}, _getData(), {
          radioBar: ''
        }),
        images = _getImages(),
        imgsHtml = '';

    images.forEach(image => {
      imgsHtml += `<img src="${image.url}" class="mmi{cdi} ${image.id} option" alt="DYFI ${image.name}">`;
    });

    if (images.length > 1) {
      _radioBar = RadioBar({
        id: 'dyfi-images',
        items: images,
        selected: _selected
      });

      data.radioBar = _radioBar.getHtml();
    }

    template =
      '<div class="images">' +
        '{radioBar}' +
        imgsHtml +
      '</div>' +
      '<div class="details">' +
        '<dl class="props alt">' +
          '<dt>Max <abbr title="Modified Mercalli Intensity">MMI</abbr></dt>' +
          '<dd>{maxmmi}</dd>' +
          '<dt>Responses</dt>' +
          '<dd>{responses}</dd>' +
        '</dl>' +
        '<p>' +
          '<a href="{url}/dyfi" class="external" target="new">Event Page DYFI?' +
            '<i class="icon-link"></i>' +
          '</a>' +
        '</p>' +
      '</div>';

    return L.Util.template(template, data);
  };

  /**
   * Get the data used to create the content.
   *
   * @return {Object}
   */
  _getData = function () {
    var props = _mainshock.data.products.dyfi[0].properties;

    return {
      cdi: _mainshock.data.cdi,
      img: _mainshock.data.dyfiImg,
      maxmmi: props.maxmmi,
      responses: AppUtil.addCommas(props.numResp),
      url: _mainshock.data.url
    };
  };

  /**
   * Get the list of images.
   *
   * @return images {Array}
   */
  _getImages = function () {
    var dyfi = _mainshock.data.products.dyfi[0],
        filename = _mainshock.data.id + '_ciim.jpg', // zip code map
        images = [{ // default image
          id: 'block',
          name: 'Intensity',
          url: _mainshock.data.dyfiImg
        }];

    if (dyfi.contents[filename]) {
      images.push({
        id: 'zip',
        name: 'ZIP Codes',
        url: dyfi.contents[filename].url
      });
    }

    return images;
  };

  /**
   * Event handler that shows the Lightbox.
   *
   * @param e {Event}
   */
  _showLightbox = function (e) {
    e.preventDefault();
    _lightbox.show();
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    if (_lightbox) {
      _lightbox.destroy();
    }
    if (_radioBar) {
      _radioBar.destroy(); // also removes its listeners
    }

    _initialize = null;

    _el = null;
    _lightbox = null;
    _mainshock = null;
    _radioBar = null;
    _selected = null;

    _addLightbox = null;
    _addListeners = null;
    _getContent = null;
    _getData = null;
    _getImages = null;
    _showLightbox = null;

    _this = null;
  };

  /**
   * Remove event listeners.
   */
  _this.removeListeners = function () {
    if (_el) {
      _el.removeEventListener('click', _showLightbox);
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Dyfi;