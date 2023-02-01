/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
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
      _getContent,
      _getData,
      _getImages,
      _getProps,
      _getStatus,
      _getUrl;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;
    _mainshock = _app.Features.getFeature('mainshock');
    _selected = 'intensity';

    if (_mainshock.data.products.shakemap) {
      _product = _mainshock.data.products.shakemap[0];
    }

    _this.data = {};
    _this.id = 'shakemap';
    _this.lightbox = '';
    _this.name = 'ShakeMap';
    _this.url = _getUrl();

    if (_this.url) {
      _fetch();
    } else if (_product) { // has ShakeMap, but there's no feed data
      _this.data = _getData();
      _this.lightbox = _getContent();

      _app.Features.addContent(_this); // add manually
    }
  };

  /**
   * Add the intensity bubble to the Lightbox's title.
   */
  _addBubble = function () {
    var bubble = '' +
          `<span class="mmi${_mainshock.data.mmi} impact-bubble">` +
            `<strong class="roman">${_mainshock.data.mmi}</strong>` +
          '</span>',
        h3 = document.getElementById('shakemap').querySelector('h3');

    h3.innerHTML = h3.textContent + bubble;
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
   * Get the HTML content for the Lightbox.
   *
   * @return {String}
   */
  _getContent = function () {
    var data,
        images = _getImages(),
        imgs = '',
        radioBar = '';

    images.forEach(image => {
      imgs += `<img src="${image.url}" alt="ShakeMap ${image.name}" ` +
        `class="mmi{mmiValue} ${image.id} option">`;
    });

    if (images.length > 1) {
      _radioBar = RadioBar({
        id: 'shakemap-images',
        items: images,
        selected: _selected
      });

      radioBar = _radioBar.getHtml();
    }

    data = Object.assign({}, _this.data, {
      radioBar: radioBar
    });

    return L.Util.template(
      '<div class="wrapper">' +
        '<div class="images">' +
          '{radioBar}' +
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
            '<dt>Max <abbr title="Spectral acceleration at 0.3s">SA <em>(0.3s)</em></abbr></dt>' +
            '<dd>{sa03}</dd>' +
            '<dt>Max <abbr title="Spectral acceleration at 1.0s">SA <em>(1.0s)</em></abbr></dt>' +
            '<dd>{sa10}</dd>' +
            '<dt>Max <abbr title="Spectral acceleration at 3.0s">SA <em>(3.0s)</em></abbr></dt>' +
            '<dd>{sa30}</dd>' +
            '<dt class="stations">Seismic Stations</dt>' +
            '<dd class="stations">{seismic}</dd>' +
            '<dt><abbr title="Did You Feel It?">DYFI?</abbr> Stations</dt>' +
            '<dd>{dyfi}</dd>' +
          '</dl>' +
          '<p>' +
            '<a href="{url}" class="external" target="new">' +
              'Event Page ShakeMap' +
              '<i class="icon-link"></i>' +
            '</a>' +
          '</p>' +
        '</div>' +
      '</div>' +
      '<p class="status"><span>{status}</span></p>',
      data
    );
  };

  /**
   * Get the data used to create the content.
   *
   * @param json {Object} default is null
   *
   * @return {Object}
   */
  _getData = function (json = null) {
    var dyfi, info, mmi, pga, pgv, sa03, sa10, sa30, seismic,
        props = {};

    if (json) {
      info = json.input.event_information;
      props = _getProps(json.output.ground_motions);

      if (info.intensity_observations) {
        dyfi = info.intensity_observations;
      }
      if (info.seismic_stations) {
        seismic = info.seismic_stations;
      }
    }

    if (props.mmi) {
      mmi = AppUtil.round(props.mmi.max, 1);

      if (props.mmi.bias) {
        mmi += ` <span>(bias: ${AppUtil.round(props.mmi.bias, 3)})</span>`;
      }
    }
    if (props.pga) {
      pga = `${AppUtil.round(props.pga.max, 3)} ${props.pga.units}`;

      if (props.pga.bias) {
        pga += ` <span>(bias: ${AppUtil.round(props.pga.bias, 3)})</span>`;
      }
    }
    if (props.pgv) {
      pgv = `${AppUtil.round(props.pgv.max, 3)} ${props.pgv.units}`;

      if (props.pgv.bias) {
        pgv += ` <span>(bias: ${AppUtil.round(props.pgv.bias, 3)})</span>`;
      }
    }
    if (props.sa03) {
      sa03 = `${AppUtil.round(props.sa03.max, 3)} ${props.sa03.units}`;

      if (props.sa03.bias) {
        sa03 += ` <span>(bias: ${AppUtil.round(props.sa03.bias, 3)})</span>`;
      }
    }
    if (props.sa10) {
      sa10 = `${AppUtil.round(props.sa10.max, 3)} ${props.sa10.units}`;

      if (props.sa10.bias) {
        sa10 += ` <span>(bias: ${AppUtil.round(props.sa10.bias, 3)})</span>`;
      }
    }
    if (props.sa30) {
      sa30 = `${AppUtil.round(props.sa30.max, 3)} ${props.sa30.units}`;

      if (props.sa30.bias) {
        sa30 += ` <span>(bias: ${AppUtil.round(props.sa30.bias, 3)})</span>`;
      }
    }

    return {
      dyfi: dyfi || '–',
      img: _mainshock.data.shakemapImg,
      mmi: mmi || '–',
      mmiValue: _mainshock.data.mmi,
      pga: pga || '–',
      pgv: pgv || '–',
      sa03: sa03 || '–',
      sa10: sa10 || '–',
      sa30: sa30 || '–',
      seismic: seismic||  '–',
      status: _getStatus(),
      url: _mainshock.data.url + '/shakemap'
    };
  };

  /**
   * Get the list of images (names and perhaps case are inconsistent in feed).
   *
   * @return images {Array}
   */
  _getImages = function () {
    var images = [{ // default image
          id: 'intensity',
          name: 'Intensity',
          url: _mainshock.data.shakemapImg
        }],
        regexes = [ // used to find images
          /^pga\.jpg$/i,
          /^pgv\.jpg$/i,
          /^psa0p?3\.jpg$/i,
          /^psa1p?0\.jpg$/i,
          /^psa3p?0\.jpg$/i,
          /^tvmap\.jpg$/i
        ];

    Object.keys(_product.contents).forEach(key => {
      var filename = key.replace('download/', '');

      regexes.forEach(regex => {
        var id, name, secs;

        if (regex.test(filename)) {
          id = filename.replace('.jpg', '').toLowerCase();
          name = id.toUpperCase(); // default

          if (id.startsWith('psa')) {
            secs = id.replace('psa', ''); // will be e.g. '10' or '1p0'
            secs = secs[0] + '.' + secs[secs.length - 1]; // want e.g. '1.0'
            name = `PSA <em>(${secs}<span>s</span>)</em>`;
          } else if (id === 'tvmap') {
            name = 'TV map';
          }

          images.push({
            id: id,
            name: name,
            url: _product.contents[key].url
          });
        }
      });
    });

    return images.sort(_compare);
  };

  /**
   * Get the relevant properties (names and case are inconsistent in the feed).
   *
   * @param motions {Object}
   *
   * @return {Object}
   */
  _getProps = function (motions) {
    var keys = Object.keys(motions);

    return {
      mmi: motions[keys.find(key => key.match(/mmi|intensity/i))],
      pga: motions[keys.find(key => key.match(/pga/i))],
      pgv: motions[keys.find(key => key.match(/pgv/i))],
      sa03: motions[keys.find(key => key.match(/sa.*0.*3/i))],
      sa10: motions[keys.find(key => key.match(/sa.*1.*0/i))],
      sa30: motions[keys.find(key => key.match(/sa.*3.*0/i))]
    };
  };

  /**
   * Get the review status.
   *
   * @return status {String}
   */
  _getStatus = function () {
    var status = 'not reviewed'; // default

    status = (_product.properties['review-status'] || status).toLowerCase();

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
    var contents,
        url = '';

    if (_product) {
      contents = _product.contents;

      if (contents['download/info.json']) {
        url = contents['download/info.json'].url;
      }
    }

    return url;
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
    _this.data = _getData(json);
    _this.lightbox = _getContent();
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
    _getContent = null;
    _getData = null;
    _getImages = null;
    _getProps = null;
    _getStatus = null;
    _getUrl = null;

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
      _radioBar.setOption.call(document.getElementById(_selected));
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = ShakeMap;
