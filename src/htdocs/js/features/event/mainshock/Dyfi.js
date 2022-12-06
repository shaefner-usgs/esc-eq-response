/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
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
 *       addListeners: {Function}
 *       data: {Object}
 *       destroy: {Function}
 *       id: {String}
 *       lightbox: {String}
 *       name: {String}
 *       removeListeners: {Function}
 *       render: {Function}
 *     }
 */
var Dyfi = function (options) {
  var _this,
      _initialize,

      _app,
      _els,
      _mainshock,
      _product,
      _radioBar,
      _selected,

      _addBubble,
      _getContent,
      _getData,
      _getImages,
      _getStatus;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;
    _els = [];
    _mainshock = _app.Features.getFeature('mainshock');
    _selected = 'block';

    _this.data = {},
    _this.id = 'dyfi';
    _this.lightbox = '';
    _this.name = 'Did You Feel It?';

    if (_mainshock.data.dyfiImg) {
      _product = _mainshock.data.products.dyfi[0];
      _this.data = _getData();
      _this.lightbox = _getContent();

      _app.Features.addContent(_this); // no feed data => add manually
    }
  };

  /**
   * Add the intensity bubble to the Lightbox's title.
   */
  _addBubble = function () {
    var bubble = '' +
          `<span class="mmi${_mainshock.data.cdi} impact-bubble">` +
            `<strong class="roman">${_mainshock.data.cdi}</strong>` +
          '</span>',
        h3 = document.getElementById('dyfi').querySelector('h3');

    h3.innerHTML += bubble;
  };

  /**
   * Get the HTML content for the Lightbox.
   *
   * @return {String}
   */
  _getContent = function () {
    var template,
        data = Object.assign({}, _this.data, {
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
        '<p class="status"><span>{status}</span></p>' +
      '</div>' +
      '<div class="details">' +
        '<dl class="props alt">' +
          '<dt>Max <abbr title="Modified Mercalli Intensity">MMI</abbr></dt>' +
          '<dd>{maxmmi}</dd>' +
          '<dt>Responses</dt>' +
          '<dd>{responses}</dd>' +
        '</dl>' +
        '<p>' +
          '<a href="{url}" class="external" target="new">Event Page DYFI?' +
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
    var props = _product.properties;

    return {
      cdi: _mainshock.data.cdi,
      map: _mainshock.data.dyfiImg,
      maxmmi: props.maxmmi,
      plot: _product.contents[_mainshock.data.id + '_plot_atten.jpg']?.url,
      responses: AppUtil.addCommas(props.numResp),
      status: _getStatus(props),
      url: _mainshock.data.url + '/dyfi'
    };
  };

  /**
   * Get the list of images.
   *
   * @return images {Array}
   */
  _getImages = function () {
    var filename = _mainshock.data.id + '_ciim.jpg',
        images = [{ // default image
          id: 'block',
          name: 'Intensity Map',
          url: _this.data.map
        }];

    if (_product.contents[filename]) {
      images.push({
        id: 'zip',
        name: 'ZIP Code Map',
        url: _product.contents[filename].url
      });
    }
    if (_this.data.plot) {
      images.push({
        id: 'plot',
        name: 'Intensity vs. Distance',
        url: _this.data.plot
      });
    }

    return images;
  };

  /**
   * Get the review status.
   *
   * @param props {Object}
   *
   * @return status {String}
   */
  _getStatus = function (props) {
    var status = 'not reviewed'; // default

    status = (props['review-status'] || status).toLowerCase();

    if (status === 'reviewed') {
      status += '<i class="icon-check"></i>';
    }

    return status;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add event listeners.
   */
  _this.addListeners = function () {
    var el = document.querySelector('#summaryPane .mainshock');

    _els = [
      el.querySelector('.details .dyfi'),
      el.querySelector('.thumbs .dyfi a')
    ];

    // Show the Lightbox
    _els.forEach(el => {
      if (el) {
        el.addEventListener('click', _app.Features.showLightbox);
      }
    });

    // Display the selected image
    if (_radioBar) {
      _radioBar.addListeners(document.getElementById('dyfi-images'));
    }
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    if (_this.lightbox) {
      _app.Features.getLightbox(_this.id).destroy();
    }
    if (_radioBar) {
      _radioBar.destroy(); // also removes its listeners
    }

    _initialize = null;

    _app = null;
    _els = null;
    _mainshock = null;
    _product = null;
    _radioBar = null;
    _selected = null;

    _addBubble = null;
    _getContent = null;
    _getData = null;
    _getImages = null;
    _getStatus = null;

    _this = null;
  };

  /**
   * Remove event listeners.
   */
  _this.removeListeners = function () {
    _els.forEach(el => {
      if (el) {
        el.removeEventListener('click', _app.Features.showLightbox);
      }
    });
  };

  /**
   * Add the bubble and set the selected RadioBar option.
   */
  _this.render = function () {
    _addBubble();
    _radioBar.setOption.call(document.getElementById(_selected));
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Dyfi;
