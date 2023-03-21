/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
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
 *       addData: {Function}
 *       addListeners: {Function}
 *       data: {Object}
 *       destroy: {Function}
 *       id: {String}
 *       lightbox: {String}
 *       name: {String}
 *       removeListeners: {String}
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

      _addBubble,
      _compare,
      _destroy,
      _fetch,
      _getData,
      _getImages,
      _getLightbox,
      _getMotions,
      _getRadioBar,
      _getStatus,
      _getUrl,
      _parseFiles,
      _parseMotions;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;
    _mainshock = _app.Features.getFeature('mainshock');
    _product = _mainshock.data.products?.shakemap?.[0] || {};

    _this.data = {};
    _this.id = 'shakemap';
    _this.lightbox = '';
    _this.name = 'ShakeMap';
    _this.url = _getUrl();

    if (_this.url) {
      _fetch();
    } else if (!AppUtil.isEmpty(_product)) { // has ShakeMap, but no feed data
      _this.data = _getData();
      _this.lightbox = _getLightbox();

      _app.Features.addContent(_this); // add manually
    }
  };

  /**
   * Add the intensity bubble to the Lightbox's title.
   */
  _addBubble = function () {
    var bubble = L.Util.template(
          '<a href="{url}" class="mmi{mmiValue} impact-bubble" target="new">' +
            '<strong class="roman">{mmiValue}</strong>' +
          '</a>',
          _this.data
        ),
        h3 = document.getElementById('shakemap').querySelector('h3');

    h3.innerHTML = _this.name + bubble;
  };

  /**
   * Comparison function to sort the Array of images by their id values (ASC).
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
    if (_this.lightbox) {
      _app.Features.getLightbox(_this.id).destroy();
    }
    if (_radioBar) {
      _radioBar.destroy();
    }
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
   * Get the data used to create the content.
   *
   * @param json {Object} default is {}
   *
   * @return {Object}
   */
  _getData = function (json = {}) {
    var format = 'LLL d, yyyy TT',
        info = json.input?.event_information || {},
        motions = _getMotions(json),
        seconds = _product.updateTime/1000 || 0,
        datetime = Luxon.DateTime.fromSeconds(seconds).toUTC();

    return Object.assign(motions, {
      dyfi: Number(info.intensity_observations) || '–',
      img: _mainshock.data.shakemapImg,
      isoTime: datetime.toISO() || '',
      mmiValue: _mainshock.data.mmi,
      seismic: Number(info.seismic_stations) || '–',
      status: _getStatus(),
      url: _mainshock.data.url + '/shakemap',
      userTime: datetime.toLocal().toFormat(format),
      utcOffset: Number(datetime.toLocal().toFormat('Z')),
      utcTime: datetime.toFormat(format)
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

    if (_mainshock.data.shakemapImg) { // default image
      _selected = 'intensity';

      images.push({
        id: 'intensity',
        name: 'Intensity',
        url: _mainshock.data.shakemapImg
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
   * Get the HTML content for the Lightbox.
   *
   * @return {String}
   */
  _getLightbox = function () {
    var images = _getImages(),
        imgs = '',
        radioBar = _getRadioBar(images);

    images.forEach(image => {
      imgs += `<img src="${image.url}" alt="ShakeMap ${image.name}" ` +
        `class="mmi{mmiValue} ${image.id} option">`;
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
   * Get the ground motion data formatted for display.
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
        id: 'shakemap-images',
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
   * Add the JSON feed data.
   *
   * @param json {Object} default is {}
   */
  _this.addData = function (json = {}) {
    _this.data = _getData(json);
    _this.lightbox = _getLightbox();
  };

  /**
   * Add event listeners.
   */
  _this.addListeners = function () {
    // Display the selected image
    if (_radioBar) {
      _radioBar.addListeners(document.getElementById('shakemap-images'));
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
    _compare = null;
    _destroy = null;
    _fetch = null;
    _getData = null;
    _getImages = null;
    _getLightbox = null;
    _getMotions = null;
    _getRadioBar = null;
    _getStatus = null;
    _getUrl = null;
    _parseFiles = null;
    _parseMotions = null;

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


module.exports = ShakeMap;
