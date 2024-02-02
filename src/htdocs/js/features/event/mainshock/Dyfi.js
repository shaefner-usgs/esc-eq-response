/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
    Lightbox = require('util/Lightbox'),
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
 *       data: {Object}
 *       destroy: {Function}
 *       id: {String}
 *       lightbox: {Mixed <Object|null>}
 *       name: {String}
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
      _rendered,

      _destroy,
      _getBubble,
      _getContent,
      _getData,
      _getImages,
      _getRadioBar,
      _getStatus;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;
    _mainshock = _app.Features.getMainshock();
    _product = _mainshock.data.eq.products?.dyfi?.[0] || {};
    _rendered = false;

    _this.data = {};
    _this.id = 'dyfi';
    _this.lightbox = null;
    _this.name = 'Did You Feel It?';

    if (!AppUtil.isEmpty(_product)) {
      _this.data = _getData();

      _this.render(); // no feed data => render immediately
    }
  };

  /**
   * Destroy this Feature's sub-Classes.
   */
  _destroy = function () {
    _this.lightbox?.destroy();
    _radioBar?.destroy();
  };

  /**
   * Get the HTML content for the external link bubble.
   *
   * @return {String}
   */
  _getBubble = function () {
    return L.Util.template(
      '<a href="{url}" class="mmi{cdi} impact-bubble" target="new" ' +
        'title="Maximum reported intensity">' +
        '<strong class="roman">{cdi}</strong>' +
      '</a>',
      _this.data
    );
  };

  /**
   * Get the HTML content for the Lightbox.
   *
   * @return {String}
   */
  _getContent = function () {
    var images = _getImages(),
        imgs = '';

    images.forEach(image => {
      imgs += `<img src="${image.url}" alt="DYFI ${image.name}" ` +
        `class="mmi{cdi} ${image.id} option">`;
    });

    return L.Util.template(
      '<div class="wrapper">' +
        '<div class="images">' +
          _getRadioBar(images) +
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
        _app.Features.getTimeStamp(_this.data) +
      '</dl>',
      _this.data
    );
  };

  /**
   * Get the data used to create the content.
   *
   * @return {Object}
   */
  _getData = function () {
    var millisecs = Number(_product.updateTime) || 0,
        datetime = Luxon.DateTime.fromMillis(millisecs),
        eq = _mainshock.data.eq,
        props = _product.properties || {};

    return {
      cdi: eq.cdi,
      isoTime: datetime.toUTC().toISO(),
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
   * Get the HTML content for the RadioBar.
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
        items: images
      });

      html = _radioBar.getContent();
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
   * Destroy this Class.
   */
  _this.destroy = function () {
    _radioBar?.removeListeners();
    _destroy();

    _initialize = null;

    _app = null;
    _mainshock = null;
    _product = null;
    _radioBar = null;
    _rendered = null;

    _destroy = null;
    _getBubble = null;
    _getContent = null;
    _getData = null;
    _getImages = null;
    _getRadioBar = null;
    _getStatus = null;

    _this = null;
  };

  /**
   * Render the Feature.
   */
  _this.render = function () {
    if (_rendered) { // re-rendering
      _radioBar?.removeListeners();
      _this.lightbox?.destroy();
    }

    _this.lightbox = Lightbox({
      content: _getContent(),
      id: _this.id,
      targets: document.querySelectorAll('.dyfi.feature'),
      title: _this.name + _getBubble()
    }).render();

    _radioBar?.addListeners(document.getElementById('dyfi-images'));
    _radioBar?.setOption(document.getElementById('block'));

    _rendered = true;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Dyfi;
