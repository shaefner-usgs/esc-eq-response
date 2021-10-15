/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
    Earthquakes = require('features/util/Earthquakes'),
    Luxon = require('luxon');


/**
 * Create Mainshock Feature.
 *
 * @param options {Object}
 *   {
 *     app: {Object} Application
 *   }
 *
 * @return _this {Object}
 *   {
 *     addListener: {Function}
 *     create: {Function}
 *     details: {Object}
 *     destroy: {Function}
 *     disableButton: {Function}
 *     enableButton: {Function}
 *     id: {String}
 *     json: {Object}
 *     mapLayer: {L.Layer}
 *     name: {String}
 *     plotTraces: {Object}
 *     reset: {Function}
 *     setFeedUrl: {Function}
 *     showLayer: {Boolean}
 *     summary: {String}
 *     url: {String}
 *     zoomToLayer: {Boolean}
 *   }
 */
var Mainshock = function (options) {
  var _this,
      _initialize,

      _app,
      _eqid,
      _Earthquakes,

      _createSummary,
      _getBubbles,
      _getData,
      _getDyfi,
      _getPager,
      _getShakeAlert,
      _getShakeMap;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;

    _this.id = 'mainshock';
    _this.mapLayer = null;
    _this.name = 'Mainshock';
    _this.plotTraces = null;
    _this.showLayer = true;
    _this.summary = null;
    _this.zoomToLayer = true;
  };

  /**
   * Create summary HTML.
   *
   * @return html {String}
   */
  _createSummary = function () {
    var bubbles,
        data,
        dyfi,
        html,
        pager,
        shakeAlert,
        shakemap;

    data = _getData();
    bubbles = _getBubbles(data);
    dyfi = _getDyfi(data);
    pager = _getPager(data);
    shakeAlert = _getShakeAlert(data);
    shakemap = _getShakeMap(data);
    html = L.Util.template(
      '<div class="details bubble">' +
        '<ul>' +
          '<li class="mag">' +
            '<strong>Mag</strong>' +
            '<span>{magDisplay}</span>' +
            '<small>{magType}</small>' +
          '</li>' +
          bubbles +
          '<li class="date">' +
            '<strong>Date</strong>' +
            '<span>{date}</span>' +
            '<small>{dayofweek}</small>' +
          '</li>' +
          '<li class="time">' +
            '<strong>Time</strong>' +
            '<span>{time}</span>' +
            '<small>UTC</small>' +
          '</li>' +
          '<li class="depth">' +
            '<strong>Depth</strong>' +
            '<span>{depthDisplay}</span>' +
            '<small>km</small>' +
          '</li>' +
          '<li class="location">' +
            '<strong>Location</strong>' +
            '<span>{locationDisplay}</span>' +
          '</li>' +
          shakeAlert +
          '<li class="status">' +
            '<strong>Status</strong>' +
            '<span>{statusIcon}</span>' +
            '<small>{status}</small>' +
          '</li>' +
        '</ul>' +
      '</div>' +
      '<div class="products">' +
        '<div class="thumbs bubble {visibility}">' +
          dyfi +
          shakemap +
          '<div class="focal-mechanism placeholder hide"></div>' +
          '<div class="moment-tensor placeholder hide"></div>' +
        '</div>' +
        '<div class="pager-exposures bubble placeholder hide"></div>' +
        pager +
        '<div class="summary bubble">' +
          '<h3>Event Summary</h3>' +
          '<p><abbr title="Rich Text Format">RTF</abbr> document containing ' +
            'earthquake details, images, plots and placeholders for talking ' +
            'points and analysis. Microsoft Word is recommended for viewing ' +
            'the document.</p>' +
          '<button id="download" disabled="disabled" type="button" ' +
            'title="Download RTF Document">Download</button>' +
        '</div>' +
      '</div>',
      data
    );

    return html;
  };

  /**
   * Get the 'impact bubbles' list items HTML template.
   *
   * @param data {Object}
   *
   * @return bubbles {String}
   */
  _getBubbles = function (data) {
    var bubbles = '';

    data.plural = 's';

    if (Number(data.felt) === 1) {
      data.plural = '';
    }

    if (data.cdi) {
      bubbles +=
        '<li>' +
          '<strong>' +
            '<abbr title="Did You Feel It?">DYFI?</abbr>' +
          '</strong>' +
          '{dyfiBubble}' +
          '<small>{felt} response{plural}</small>' +
        '</li>';
    }

    if (data.mmi) {
      bubbles +=
        '<li>' +
          '<strong>ShakeMap</strong>' +
          '{shakemapBubble}' +
          '<small>{level}</small>' +
        '</li>';
    }

    if (data.alert) {
      bubbles +=
        '<li>' +
          '<strong>' +
            '<abbr title="Prompt Assessment of Global Earthquakes for Response">PAGER</abbr>' +
          '</strong>' +
          '{pagerBubble}' +
          '<small>Impact</small>' +
        '</li>';
    }

    if (data.tsunami) {
      bubbles +=
        '<li>' +
          '<strong>Tsunami</strong>' +
          '{tsunamiBubble}' +
        '</li>';
    }

    return bubbles;
  };

  /**
   * Get the data used to create the details strip and certain products.
   *
   * @return data {Object}
   */
  _getData = function () {
    var data,
        dyfi,
        dyfiImg,
        econImg,
        eqTime,
        fatalImg,
        mmiInt,
        pager,
        products,
        shakeAlert,
        shakeAlertStatus,
        shakemap,
        shakemapImg,
        visibility;

    products = _this.json.properties.products;
    dyfi = products.dyfi;
    eqTime = Luxon.DateTime.fromISO(_this.details.isoTime).toUTC();
    mmiInt = Math.round(_this.json.properties.mmi);
    pager = products.losspager;
    shakeAlert = products['shake-alert'];
    shakemap = products.shakemap;
    visibility = 'hide'; // default - product thumbs container

    if (Array.isArray(dyfi)) {
      dyfiImg = dyfi[0].contents[dyfi[0].code + '_ciim_geo.jpg'].url;
      visibility = 'show';
    }
    if (Array.isArray(pager)) {
      econImg = pager[0].contents['alertecon.png'].url;
      fatalImg = pager[0].contents['alertfatal.png'].url;
    }
    if (Array.isArray(shakeAlert)) {
      shakeAlertStatus = shakeAlert[0].status.toLowerCase();
    }
    if (Array.isArray(shakemap)) {
      visibility = 'show';

      if (shakemap[0].contents['download/tvmap.jpg']) {
        shakemapImg = shakemap[0].contents['download/tvmap.jpg'].url;
      } else if (shakemap[0].contents['download/intensity.jpg'].url) {
        shakemapImg = shakemap[0].contents['download/intensity.jpg'].url;
      }
    }

    data = Object.assign({}, _this.details, {
      date: eqTime.toLocaleString(Luxon.DateTime.DATE_MED),
      dayofweek: eqTime.toFormat('cccc'),
      depthDisplay: AppUtil.round(_this.details.depth, 1),
      dyfiBubble: _this.details.bubbles.dyfi || '',
      dyfiImg: dyfiImg || '',
      econImg: econImg || '',
      fatalImg: fatalImg || '',
      level: AppUtil.getShakingValues([mmiInt])[0].level || '',
      locationDisplay: _this.details.location.replace(/(.*),(.*)/, '$1,<br>$2'),
      pagerBubble: _this.details.bubbles.pager || '',
      shakeAlertStatus: shakeAlertStatus || '',
      shakemapBubble: _this.details.bubbles.shakemap || '',
      shakemapImg: shakemapImg || '',
      time: eqTime.toLocaleString(Luxon.DateTime.TIME_24_WITH_SECONDS),
      tsunamiBubble: _this.details.bubbles.tsunami || '',
      visibility: visibility
    });

    return data;
  };

  /**
   * Get the Did You Feel It? product HTML template.
   *
   * @param data {Object}
   *
   * @return product {String}
   */
  _getDyfi = function (data) {
    var product = '';

    if (data.dyfiImg) {
      product =
        '<div class="dyfi">' +
          '<h4>Did You Feel It?</h4>' +
          '<a href="{dyfiImg}">' +
            '<img src="{dyfiImg}" class="mmi{cdi}" />' +
          '</a>' +
        '</div>';
    }

    return product;
  };

  /**
   * Get the PAGER fatalities and economic losses product HTML template.
   *
   * @param data {Object}
   *
   * @return product {String}
   */
  _getPager = function (data) {
    var product = '';

    if (data.econImg) {
      product =
        '<div class="pager bubble">' +
          '<h4>Estimated Fatalities</h4>' +
          '<img src="{fatalImg}" alt="Estimated fatalities histogram" />' +
          '<h4>Estimated Economic Losses</h4>' +
          '<img src="{econImg}" alt="Estimated economic losses histogram" />' +
        '</div>';
    }

    return product;
  };

  /**
   * Get the ShakeAlert list item HTML template.
   *
   * @param data {Object}
   *
   * @return item {String}
   */
  _getShakeAlert = function (data) {
    var item = '';

    if (data.shakeAlertStatus) {
      item =
        '<li class="shake-alert">' +
          '<strong>ShakeAlert<sup>®</sup></strong>' +
          '<a href="{url}/shake-alert" target="new">' +
            '<img src="img/shake-alert.png" alt="ShakeAlert logo" />' +
          '</a>' +
          '<small>{shakeAlertStatus}</small>' +
        '</li>';
    }

    return item;
  };

  /**
   * Get the ShakeMap product HTML template.
   *
   * @param data {Object}
   *
   * @return product {String}
   */
  _getShakeMap = function (data) {
    var product = '';

    if (data.shakemapImg) {
      product =
        '<div class="shakemap">' +
          '<h4>ShakeMap</h4>' +
          '<a href="{shakemapImg}">' +
            '<img src="{shakemapImg}" class="mmi{mmi}" />' +
          '</a>' +
        '</div>';
    }

    return product;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add event listener for download button.
   */
  _this.addListener = function () {
    var button = document.getElementById('download');

    // Load external feed data for RTF Summary
    button.addEventListener('click', _app.Feeds.loadFeeds);
  };

  /**
   * Create Feature (set properties that depend on external feed data).
   *
   * @param json {Object}
   *     feed data for Feature
   */
  _this.create = function (json) {
    _Earthquakes = Earthquakes({
      app: _app,
      id: _this.id,
      json: json
    });

    _this.details = _Earthquakes.list[0];
    _this.json = json; // used by other Features
    _this.mapLayer = _Earthquakes.mapLayer;
    _this.plotTraces = _Earthquakes.plotTraces;
    _this.summary = _createSummary();
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;
    _eqid = null;
    _Earthquakes = null;

    _createSummary = null;

    _this = null;
  };

  /**
   * Disable download RTF button.
   */
  _this.disableButton = function () {
    var button = document.getElementById('download');

    button.setAttribute('disabled', 'disabled');
  };

  /**
   * Enable download RTF button.
   */
  _this.enableButton = function () {
    var button = document.getElementById('download');

    button.removeAttribute('disabled');
  };

  /**
   * Set the JSON feed's URL.
   */
  _this.setFeedUrl = function () {
    _eqid = AppUtil.getParam('eqid');

    _this.url = `https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/${_eqid}.geojson`;
  };

  /**
   * Reset to initial state.
   */
  _this.reset = function () {
    _this.mapLayer = null;
    _this.plotTraces = null;
    _this.summary = null;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Mainshock;
