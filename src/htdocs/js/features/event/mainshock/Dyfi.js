/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
    Luxon = require('luxon'),
    RadioBar = require('util/controls/RadioBar');


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
      _mainshock,
      _product,
      _radioBar,
      _selected,

      _addBubble,
      _destroy,
      _getData,
      _getImages,
      _getLightbox,
      _getRadioBar,
      _getStatus;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;
    _mainshock = _app.Features.getFeature('mainshock');
    _product = _mainshock.data.eq.products?.dyfi?.[0] || {};
    _selected = 'block';

    _this.data = {},
    _this.id = 'dyfi';
    _this.lightbox = '';
    _this.name = 'Did You Feel It?';

    if (!AppUtil.isEmpty(_product)) { // has DYFI, but no feed data
      _this.data = _getData();
      _this.lightbox = _getLightbox();

      _app.Features.addContent(_this); // no feed data => add manually
    }
  };

  /**
   * Add the intensity bubble to the Lightbox's title.
   */
  _addBubble = function () {
    var bubble = L.Util.template(
          '<a href="{url}" class="mmi{cdi} impact-bubble" target="new" ' +
            'title="Maximum reported intensity">' +
            '<strong class="roman">{cdi}</strong>' +
          '</a>',
          _this.data
        ),
        h3 = document.getElementById('dyfi').querySelector('h3');

    h3.innerHTML = _this.name + bubble;
  };

  /**
   * Destroy this Feature's sub-Classes.
   */
  _destroy = function () {
    if (_this.lightbox) {
      _app.Features.getLightbox(_this.id).destroy();
    }
    if (_radioBar) {
      _radioBar.destroy();
    }
  };

  /**
   * Get the data used to create the content.
   *
   * @return {Object}
   */
  _getData = function () {
    var millis = Number(_product.updateTime) || 0,
        datetime = Luxon.DateTime.fromMillis(millis),
        eq = _mainshock.data.eq,
        props = _product.properties || {};

    return {
      cdi: eq.cdi,
      isoTime: datetime.toUTC().toISO() || '',
      map: eq.dyfiImg,
      maxmmi: Number(props.maxmmi),
      plot: _product.contents[eq.id + '_plot_atten.jpg']?.url || '',
      responses: AppUtil.addCommas(props.numResp),
      status: _getStatus(props),
      url: eq.url + '/dyfi',
      userTime: datetime.toFormat(_app.dateFormat),
      utcOffset: Number(datetime.toFormat('Z')),
      utcTime: datetime.toUTC().toFormat(_app.dateFormat)
    };
  };

  /**
   * Get the list of images.
   *
   * @return images {Array}
   */
  _getImages = function () {
    var images = [],
        intensity = _product.code + '_ciim_geo.jpg',
        zip = _product.code + '_ciim.jpg';

    if (_product.contents[intensity]) {
      images.push({
        id: 'block',
        name: 'Intensity map',
        url: _product.contents[intensity].url || ''
      });
    }
    if (_product.contents[zip]) {
      images.push({
        id: 'zip',
        name: 'ZIP Code map',
        url: _product.contents[zip].url || ''
      });
    }
    if (_this.data.plot) {
      images.push({
        id: 'plot',
        name: 'Intensity vs. Distance plot',
        url: _this.data.plot
      });
    }

    return images;
  };

  /**
   * Get the HTML content for the Lightbox.
   *
   * @return {String}
   */
  _getLightbox = function () {
    var images = _getImages(),
        imgs = '',
        radioBar = _getRadioBar(images);

    images.forEach(image => {
      imgs += `<img src="${image.url}" alt="DYFI ${image.name}" ` +
        `class="mmi{cdi} ${image.id} option">`;
    });

    return L.Util.template(
      '<div class="wrapper">' +
        '<div class="images">' +
          radioBar +
          imgs +
        '</div>' +
        '<div class="details">' +
          '<dl class="props alt">' +
            '<dt>Max <abbr title="Modified Mercalli Intensity">MMI</abbr></dt>' +
            '<dd>{maxmmi}</dd>' +
            '<dt>Responses</dt>' +
            '<dd>{responses}</dd>' +
          '</dl>' +
        '</div>' +
      '</div>' +
      '<dl class="props">' +
        '<dt>Status</dt>' +
        '<dd class="status">{status}</dd>' +
        '<dt>Updated</dt>' +
        '<dd>' +
          '<time datetime="{isoTime}" class="user">{userTime} ' +
            '(UTC{utcOffset})</time>' +
          '<time datetime="{isoTime}" class="utc">{utcTime} (UTC)</time>' +
        '</dd>' +
      '</dl>',
      _this.data
    );
  };

  /**
   * Create and get the HTML for the RadioBar.
   *
   * @param images {Array}
   *
   * @return html {String}
   */
  _getRadioBar = function (images) {
    var html = '';

    if (images.length > 1) {
      _radioBar = RadioBar({
        id: 'dyfi-images',
        items: images,
        selected: _selected
      });

      html = _radioBar.getHtml();
    }

    return html;
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
    // Display the selected image
    if (_radioBar) {
      _radioBar.addListeners(document.getElementById('dyfi-images'));
    }
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _destroy();

    _initialize = null;

    _app = null;
    _mainshock = null;
    _product = null;
    _radioBar = null;
    _selected = null;

    _addBubble = null;
    _destroy = null;
    _getData = null;
    _getImages = null;
    _getLightbox = null;
    _getRadioBar = null;
    _getStatus = null;

    _this = null;
  };

  /**
   * Remove event listeners.
   */
  _this.removeListeners = function () {
    if (_radioBar) {
      _radioBar.removeListeners();
    }
  };

  /**
   * Add the bubble and set the selected RadioBar option.
   */
  _this.render = function () {
    _addBubble();

    if (_radioBar) {
      _radioBar.setOption(document.getElementById(_selected));
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Dyfi;
