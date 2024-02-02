/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
    Lightbox = require('util/Lightbox'),
    Luxon = require('luxon'),
    RadioBar = require('util/controls/RadioBar');


/**
 * Create the ShakeMap Feature, a sub-Feature of the Mainshock.
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
 *       url: {String}
 *     }
 */
var ShakeMap = function (options) {
  var _this,
      _initialize,

      _app,
      _mainshock,
      _product,
      _radioBar,
      _selected,

      _compare,
      _destroy,
      _fetch,
      _getBubble,
      _getContent,
      _getData,
      _getImages,
      _getMotions,
      _getRadioBar,
      _getStatus,
      _getUrl,
      _parseFiles,
      _parseMotions;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;
    _mainshock = _app.Features.getMainshock();
    _product = _mainshock.data.eq.products?.shakemap?.[0] || {};

    _this.data = {};
    _this.id = 'shakemap';
    _this.lightbox = null;
    _this.name = 'ShakeMap';
    _this.url = _getUrl();

    if (_this.url) {
      _fetch();
    } else if (!AppUtil.isEmpty(_product)) {
      _this.render(); // no feed data => render immediately
    }
  };

  /**
   * Comparison function to sort images by their id value (ASC).
   *
   * @params a, b {Objects}
   *
   * @return {Integer}
   */
  _compare = function (a, b) {
    if (a.id < b.id) {
      return -1;
    }
    if (a.id > b.id) {
      return 1;
    }

    return 0;
  };

  /**
   * Destroy this Feature's sub-Classes.
   */
  _destroy = function () {
    _this.lightbox?.destroy();
    _radioBar?.destroy();
  };

  /**
   * Fetch the feed data.
   */
  _fetch = function () {
    L.geoJSON.async(_this.url, {
      app: _app,
      feature: _this
    });
  };

  /**
   * Get the HTML content for the external link bubble.
   *
   * @return {String}
   */
  _getBubble = function () {
    return L.Util.template(
      '<a href="{url}" class="mmi{mmiValue} impact-bubble" target="new" ' +
        'title="Maximum estimated intensity">' +
        '<strong class="roman">{mmiValue}</strong>' +
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
      imgs += `<img src="${image.url}" alt="ShakeMap ${image.name}" ` +
        `class="mmi{mmiValue} ${image.id} option">`;
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
            '<dd>{mmi}</dd>' +
            '<dt>Max <abbr title="Peak Ground Acceleration">PGA</abbr></dt>' +
            '<dd>{pga}</dd>' +
            '<dt>Max <abbr title="Peak Ground Velocity">PGV</abbr></dt>' +
            '<dd>{pgv}</dd>' +
            '<dt>Max <abbr title="Spectral acceleration at 0.3s">SA ' +
              '<em>(0.3s)</em></abbr></dt>' +
            '<dd>{sa03}</dd>' +
            '<dt>Max <abbr title="Spectral acceleration at 1.0s">SA ' +
              '<em>(1.0s)</em></abbr></dt>' +
            '<dd>{sa10}</dd>' +
            '<dt>Max <abbr title="Spectral acceleration at 3.0s">SA ' +
              '<em>(3.0s)</em></abbr></dt>' +
            '<dd>{sa30}</dd>' +
            '<dt class="stations">Seismic Stations</dt>' +
            '<dd class="stations">{seismic}</dd>' +
            '<dt><abbr title="Did You Feel It?">DYFI?</abbr> Stations</dt>' +
            '<dd>{dyfi}</dd>' +
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
   * @param json {Object}
   *
   * @return {Object}
   */
  _getData = function (json) {
    var millisecs = Number(_product.updateTime) || 0,
        datetime = Luxon.DateTime.fromMillis(millisecs),
        eq = _mainshock.data.eq,
        info = json.input?.event_information || {},
        motions = _getMotions(json);

    return Object.assign(motions, {
      dyfi: Number(info.intensity_observations) || '–',
      img: eq.shakemapImg,
      isoTime: datetime.toUTC().toISO(),
      mmiValue: eq.mmi,
      seismic: Number(info.seismic_stations) || '–',
      status: _getStatus(),
      url: eq.url + '/shakemap',
      userTime: datetime.toFormat(_app.dateFormat),
      utcOffset: Number(datetime.toFormat('Z')),
      utcTime: datetime.toUTC().toFormat(_app.dateFormat)
    });
  };

  /**
   * Get the list of images.
   *
   * @return images {Array}
   */
  _getImages = function () {
    var files = _parseFiles(),
        images = [];

    if (_mainshock.data.eq.shakemapImg) { // default image
      _selected = 'intensity';

      images.push({
        id: 'intensity',
        name: 'Intensity',
        url: _mainshock.data.eq.shakemapImg
      });
    }

    Object.keys(files).forEach(key => { // additional images
      var secs,
          name = key.toUpperCase(); // default

      if (files[key]) {
        if (key.startsWith('psa')) {
          secs = key.replace('psa', ''); // will be e.g. '10' or '1p0'
          secs = secs[0] + '.' + secs[secs.length - 1]; // want e.g. '1.0'
          name = `PSA <em>(${secs}<span>s</span>)</em>`;
        } else if (key === 'tvmap') {
          name = 'TV map';
        }

        if (!_selected) {
          _selected = key;
        }

        images.push({
          id: key,
          name: name,
          url: _product.contents?.[files[key]].url
        });
      }
    });

    return images.sort(_compare);
  };

  /**
   * Get the ground motion data, formatted for display.
   *
   * @param json {Object}
   *
   * @return data {Object}
   */
  _getMotions = function (json) {
    var data = {},
        motions = _parseMotions(json);

    Object.keys(motions).forEach(key => {
      if (motions[key]) {
        if (key === 'mmi') {
          data.mmi = AppUtil.round(motions.mmi.max, 1);
        } else {
          data[key] = `${AppUtil.round(motions[key].max, 3)} ${motions[key].units}`;
        }

        if (motions[key].bias) {
          data[key] += ` <span>(bias: ${AppUtil.round(motions[key].bias, 3)})</span>`;
        }
      } else {
        data[key] = '–';
      }
    });

    return data;
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
        id: 'shakemap-images',
        items: images
      });

      html = _radioBar.getContent();
    }

    return html;
  };

  /**
   * Get the review status.
   *
   * @return status {String}
   */
  _getStatus = function () {
    var status = 'not reviewed'; // default

    status = (_product.properties?.['review-status'] || status).toLowerCase();

    if (status === 'reviewed') {
      status += '<i class="icon-check"></i>';
    }

    return status;
  };

  /**
   * Get the JSON feed's URL.
   *
   * @return url {String}
   */
  _getUrl = function () {
    var contents = _product.contents || {},
        url = '';

    if (contents['download/info.json']) {
      url = contents['download/info.json'].url || '';
    }

    return url;
  };

  /**
   * Parse the list of files (JSON feed uses disparate key values).
   *
   * @return {Object}
   */
  _parseFiles = function () {
    var keys = Object.keys(_product.contents || {});

    return {
      pga: keys.find(key => key.match(/pga\.jpg$/i)),
      pgv: keys.find(key => key.match(/pgv\.jpg$/i)),
      psa03: keys.find(key => key.match(/psa0p?3\.jpg$/i)),
      psa10: keys.find(key => key.match(/psa1p?0\.jpg$/i)),
      psa30: keys.find(key => key.match(/psa3p?0\.jpg$/i,)),
      tvmap: keys.find(key => key.match(/tvmap\.jpg$/i))
    };
  };


  /**
   * Parse the ground motions (JSON feed uses disparate key values).
   *
   * @param json {Object}
   *
   * @return {Object}
   */
  _parseMotions = function (json) {
    var motions = json.output?.ground_motions || {},
        keys = Object.keys(motions);

    return {
      mmi: motions[keys.find(key => key.match(/mmi|intensity/i))],
      pga: motions[keys.find(key => key.match(/pga/i))],
      pgv: motions[keys.find(key => key.match(/pgv/i))],
      sa03: motions[keys.find(key => key.match(/sa.*0.*3/i))],
      sa10: motions[keys.find(key => key.match(/sa.*1.*0/i))],
      sa30: motions[keys.find(key => key.match(/sa.*3.*0/i))]
    };
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
    _selected = null;

    _compare = null;
    _destroy = null;
    _fetch = null;
    _getBubble = null;
    _getContent = null;
    _getData = null;
    _getImages = null;
    _getMotions = null;
    _getRadioBar = null;
    _getStatus = null;
    _getUrl = null;
    _parseFiles = null;
    _parseMotions = null;

    _this = null;
  };

  /**
   * Render the Feature.
   *
   * @param json {Object} optional; default is {}
   */
  _this.render = function (json = {}) {
    if (AppUtil.isEmpty(_this.data)) { // initial render
      _this.data = _getData(json);
    } else {
      _radioBar?.removeListeners();
      _this.lightbox?.destroy();
    }

    _this.lightbox = Lightbox({
      content: _getContent(),
      id: _this.id,
      targets: document.querySelectorAll('.shakemap.feature'),
      title: _this.name + _getBubble()
    }).render();

    _radioBar?.addListeners(document.getElementById('shakemap-images'));
    _radioBar?.setOption(document.getElementById(_selected));
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = ShakeMap;
