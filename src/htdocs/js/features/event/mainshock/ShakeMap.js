/* global L */
'use strict';


var AppUtil = require('util/AppUtil');


/**
 * Create the ShakeMap Feature.
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *     }
 *
 * @return _this {Object}
 *     {
 *       addData: {Function}
 *       data: {Object}
 *       destroy: {Function}
 *       id: {String}
 *       lightbox: {String}
 *       name: {String}
 *       url: {String}
 *     }
 */
var ShakeMap = function (options) {
  var _this,
      _initialize,

      _app,

      _fetch,
      _getData,
      _getLightbox,
      _getProps,
      _getUrl;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;

    _this.id = 'shakemap';
    _this.lightbox = '';
    _this.name = 'ShakeMap';
    _this.url = _getUrl();

    _fetch();
  };

  /**
   * Fetch the feed data.
   */
  _fetch = function () {
    if (_this.url) {
      L.geoJSON.async(_this.url, {
        app: _app,
        feature: _this
      });
    }
  };

  /**
   * Get the data used to create the content.
   *
   * @param json {Object}
   *
   * @return data {Object}
   */
  _getData = function (json) {
    var data = { // defaults
          dyfi: '–',
          mmi: '–',
          pga: '–',
          pgv: '–',
          sa03: '–',
          sa10: '–',
          sa30: '–',
          seismic: '–'
        },
        info = json.input.event_information,
        props = _getProps(json.output.ground_motions);

    if (props.mmi) {
      data.mmi = AppUtil.round(props.mmi.max, 1);

      if (props.mmi.bias) {
        data.mmi += ` <span>(bias: ${AppUtil.round(props.mmi.bias, 2)})</span>`;
      }
    }

    if (props.pga) {
      data.pga = `${AppUtil.round(props.pga.max, 2)} ${props.pga.units}`;

      if (props.pga.bias) {
        data.pga += ` <span>(bias: ${AppUtil.round(props.pga.bias, 2)})</span>`;
      }
    }

    if (props.pgv) {
      data.pgv = `${AppUtil.round(props.pgv.max, 2)} ${props.pgv.units}`;

      if (props.pgv.bias) {
        data.pgv += ` <span>(bias: ${AppUtil.round(props.pgv.bias, 2)})</span>`;
      }
    }

    if (props.sa03) {
      data.sa03 = `${AppUtil.round(props.sa03.max, 2)} ${props.sa03.units}`;

      if (props.sa03.bias) {
        data.sa03 += ` <span>(bias: ${AppUtil.round(props.sa03.bias, 2)})</span>`;
      }
    }

    if (props.sa10) {
      data.sa10 = `${AppUtil.round(props.sa10.max, 2)} ${props.sa10.units}`;

      if (props.sa10.bias) {
        data.sa10 += ` <span>(bias: ${AppUtil.round(props.sa10.bias, 2)})</span>`;
      }
    }

    if (props.sa30) {
      data.sa30 = `${AppUtil.round(props.sa30.max, 2)} ${props.sa30.units}`;

      if (props.sa30.bias) {
        data.sa30 += ` <span>(bias: ${AppUtil.round(props.sa30.bias, 2)})</span>`;
      }
    }

    if (info.seismic_stations) {
      data.seismic = info.seismic_stations;
    }
    if (info.intensity_observations) {
      data.dyfi = info.intensity_observations;
    }

    return data;
  };

  /**
   * Get the Lightbox HTML content.
   *
   * @return {String}
   */
  _getLightbox = function () {
    var template =
      '<dl class="props alt">' +
        '<dt>Max <abbr title="Modified Mercalli Intensity">MMI</abbr></dt>' +
        '<dd>{mmi}</dd>' +
        '<dt>Max <abbr title="Peak Ground Acceleration">PGA</abbr></dt>' +
        '<dd>{pga}</dd>' +
        '<dt>Max <abbr title="Peak Ground Velocity">PGV</abbr></dt>' +
        '<dd>{pgv}</dd>' +
        '<dt>Max <abbr title="Spectral acceleration at 0.3s">SA<em>(0.3s)</em></abbr></dt>' +
        '<dd>{sa03}</dd>' +
        '<dt>Max <abbr title="Spectral acceleration at 1.0s">SA<em>(1.0s)</em></abbr></dt>' +
        '<dd>{sa10}</dd>' +
        '<dt>Max <abbr title="Spectral acceleration at 3.0s">SA<em>(3.0s)</em></abbr></dt>' +
        '<dd>{sa30}</dd>' +
        '<dt class="stations">Seismic Stations</dt>' +
        '<dd class="stations">{seismic}</dd>' +
        '<dt><abbr title="Did You Feel It?">DYFI?</abbr> Stations</dt>' +
        '<dd>{dyfi}</dd>' +
      '</dl>';

    return L.Util.template(template, _this.data);
  };

  /**
   * Get the relevant properties (names and case are inconsistent in the feed).
   *
   * @param motions {Object}
   *
   * @return {Object}
   */
  _getProps = function (motions) {
    var mmi, pga, pgv, sa03, sa10, sa30;

    // Property name is inconsistent
    if (motions.intensity) {
      mmi = motions.intensity;
    } else if (motions.MMI) {
      mmi = motions.MMI;
    }

    // Case-insensitive search for keys
    pga = motions[Object.keys(motions).find(key => key.match(/^PGA$/i))];
    pgv = motions[Object.keys(motions).find(key => key.match(/^PGV$/i))];
    sa03 = motions[Object.keys(motions).find(key => key.match(/^SA\(0.3\)$/i))];
    sa10 = motions[Object.keys(motions).find(key => key.match(/^SA\(1.0\)$/i))];
    sa30 = motions[Object.keys(motions).find(key => key.match(/^SA\(3.0\)$/i))];

    return {
      mmi: mmi,
      pga: pga,
      pgv: pgv,
      sa03: sa03,
      sa10: sa10,
      sa30: sa30
    };
  };

  /**
   * Get the JSON feed's URL.
   *
   * @return url {String}
   */
  _getUrl = function () {
    var contents,
        mainshock = _app.Features.getFeature('mainshock'),
        products = mainshock.data.products,
        url = '';

    if (products.shakemap) {
      contents = products.shakemap[0].contents;

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
    _this.lightbox = _getLightbox();
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;

    _fetch = null;
    _getData = null;
    _getLightbox = null;
    _getProps = null;
    _getUrl = null;

    _this = null;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = ShakeMap;
