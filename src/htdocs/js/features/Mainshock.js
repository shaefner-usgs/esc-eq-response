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
      _setDyfiProps,
      _setShakeMapProps;


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
        html;

    data = _getData();
    bubbles = _getBubbles(data);
    html = L.Util.template(
      '<ul class="strip">' +
        '<li class="mag">' +
          '<strong>Mag</strong>' +
          '<span>{magDisplay}</span>' +
          '<small>{magType}</small>' +
        '</li>' +
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
        bubbles +
        '<li class="depth">' +
          '<strong>Depth</strong>' +
          '<span>{depthDisplay}</span>' +
          '<small>km</small>' +
        '</li>' +
        '<li class="location">' +
          '<strong>Location</strong>' +
          '<span>{locationDisplay}</span>' +
        '</li>' +
        '<li class="status">' +
          '<strong>Status</strong>' +
          '<span>{statusIcon}</span>' +
          '<small>{status}</small>' +
        '</li>' +
      '</ul>' +
      '<div>' +
        '<div class="products">' +
          '{dyfi}' +
          '{shakemap}' +
          '<div class="focal-mechanism placeholder hide two-up"></div>' +
          '<div class="moment-tensor placeholder hide two-up"></div>' +
        '</div>' +
        '<div class="pager-exposures placeholder hide"></div>' +
      '</div>' +
      '<h3>Event Summary</h3>' +
      '<p><abbr title="Rich Text Format">RTF</abbr> document containing ' +
        'earthquake details, images, plots and placeholders for adding ' +
        'talking points and analysis. Microsoft Word is recommended for ' +
        'viewing the document.</p>' +
      '<button id="download" disabled="disabled" type="button" ' +
        'title="Download RTF Document">Download</button>',
      data
    );

    return html;
  };

  /**
   * Get the 'impact bubbles' HTML templates.
   *
   * @param data {Object}
   *
   * @return bubbles {String}
   */
  _getBubbles = function (data) {
    var bubbles = '';

    if (data.cdi) {
      bubbles +=
        '<li class="bubble">' +
          '<strong>' +
            '<abbr title="Did You Feel It?">DYFI?</abbr>' +
          '</strong>' +
          '<div class="impact-bubbles">{dyfiBubble}</div>' +
          '<small>{felt} responses</small>' +
        '</li>';
    }

    if (data.mmi) {
      bubbles +=
        '<li class="bubble">' +
          '<strong>ShakeMap</strong>' +
          '<div class="impact-bubbles">{shakemapBubble}</div>' +
          '<small>{level}</small>' +
        '</li>';
    }

    if (data.alert) {
      bubbles +=
        '<li class="bubble">' +
          '<strong>' +
            '<abbr title="Prompt Assessment of Global Earthquakes for Response">PAGER</abbr>' +
          '</strong>' +
          '<div class="impact-bubbles">{pagerBubble}</div>' +
          '<small>Impact</small>' +
        '</li>';
    }

    if (data.tsunami) {
      bubbles +=
        '<li class="bubble">' +
          '<strong>Tsunami</strong>' +
          '<div class="impact-bubbles">{tsunamiBubble}</div>' +
        '</li>';
    }

    return bubbles;
  };

  /**
   * Get the data used to create the details strip.
   *
   * @return data {Object}
   */
  _getData = function () {
    var data,
        eqTime,
        mmiInt,
        products;

    eqTime = Luxon.DateTime.fromISO(_this.details.isoTime).toUTC();
    mmiInt = Math.round(_this.json.properties.mmi);
    data = Object.assign({}, _this.details, {
      date: eqTime.toLocaleString(Luxon.DateTime.DATE_MED),
      dayofweek: eqTime.toFormat('cccc'),
      depthDisplay: AppUtil.round(_this.details.depth, 1),
      dyfiBubble: _this.details.bubbles.dyfi || '',
      level: AppUtil.getShakingValues([mmiInt])[0].level || '',
      locationDisplay: _this.details.location.replace(/(.*),(.*)/, '$1,<br>$2'),
      pagerBubble: _this.details.bubbles.pager || '',
      shakemapBubble: _this.details.bubbles.shakemap || '',
      statusIcon: '', // default value
      time: eqTime.toLocaleString(Luxon.DateTime.TIME_24_WITH_SECONDS),
      tsunamiBubble: _this.details.bubbles.tsunami || ''
    });
    products = _this.json.properties.products;

    // Add DYFI, ShakeMap props to data
    _setDyfiProps(data, products.dyfi);
    _setShakeMapProps(data, products.shakemap);

    if (_this.details.status === 'reviewed') {
      data.statusIcon = '<i class="icon-check"></i>';
    }

    return data;
  };

  /**
   * Set Did You Feel It? properties for summary HTML.
   *
   * @param data {Object}
   * @param dyfi {Array}
   */
  _setDyfiProps = function (data, dyfi) {
    if (dyfi) {
      data.dyfiImg = dyfi[0].contents[dyfi[0].code + '_ciim_geo.jpg'].url;
      data.dyfi = L.Util.template(
        '<div class="dyfi two-up">' +
          '<a href="{url}/dyfi">' +
            '<h4>Did You Feel It?</h4>' +
            '<img src="{dyfiImg}" class="mmi{cdi}" />' +
          '</a>' +
        '</div>',
        data
      );
    } else {
      data.dyfi = '';
    }
  };

  /**
   * Set ShakeMap properties for summary HTML.
   *
   * @param data {Object}
   * @param shakemap {Array}
   */
  _setShakeMapProps = function (data, shakemap) {
    if (shakemap) {
      if (shakemap[0].contents['download/tvmap.jpg']) {
        data.shakemapImg = shakemap[0].contents['download/tvmap.jpg'].url;
      } else if (shakemap[0].contents['download/intensity.jpg'].url) {
        data.shakemapImg = shakemap[0].contents['download/intensity.jpg'].url;
      }

      data.shakemap = L.Util.template(
        '<div class="shakemap two-up">' +
          '<a href="{url}/shakemap">' +
            '<h4>ShakeMap</h4>' +
            '<img src="{shakemapImg}" class="mmi{mmi}" />' +
          '</a>' +
        '</div>',
        data
      );
    } else {
      data.shakemap = '';
    }
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
