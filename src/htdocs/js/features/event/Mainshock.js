/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
    Earthquakes = require('features/util/earthquakes/Earthquakes'),
    JsonFeed = require('util/JsonFeed'),
    LatLon = require('util/LatLon'),
    Luxon = require('luxon'),
    Plots = require('features/util/earthquakes/Plots'),
    Rtf = require('util/Rtf');


/**
 * Create the Mainshock Feature.
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *     }
 *
 * @return _this {Object}
 *     {
 *       add: {Function}
 *       content: {String}
 *       createRtf: {Function}
 *       data: {Object}
 *       destroy: {Function}
 *       disableDownload: {Function}
 *       enableDownload: {Function}
 *       id: {String}
 *       json: {Object}
 *       mapLayer: {L.GeoJSON}
 *       name: {String}
 *       placeholder: {String}
 *       plots: {Object}
 *       remove: {Function}
 *       render: {Function}
 *       showLayer: {Boolean}
 *       title: {String}
 *       type: {String}
 *       url: {String}
 *       zoomToLayer: {Boolean}
 *     }
 */
var Mainshock = function (options) {
  var _this,
      _initialize,

      _app,
      _download,
      _earthquakes,
      _el,
      _json,
      _note,
      _tsunami,

      _addData,
      _addListeners,
      _addSubFeatures,
      _destroy,
      _fetch,
      _getBubbles,
      _getContent,
      _getData,
      _getDyfi,
      _getEq,
      _getImage,
      _getLinks,
      _getLossPager,
      _getNotice,
      _getShakeAlert,
      _getShakeMap,
      _getStrip,
      _getTectonic,
      _getText,
      _getUpdated,
      _getUrl,
      _initDownload,
      _mergeJson,
      _openTsunami,
      _removeListeners,
      _setJson;


  _this = {};

  _initialize = function (options = {}) {
    var catalog = AppUtil.getParam('catalog');

    _app = options.app;
    _el = document.getElementById('mainshock');

    _this.content = '';
    _this.data = {};
    _this.id = 'mainshock';
    _this.json = {};
    _this.mapLayer = L.geoJSON();
    _this.name = 'Mainshock';
    _this.placeholder = '<div class="content"></div>';
    _this.plots = {};
    _this.showLayer = true;
    _this.title = '';
    _this.type = _this.id;
    _this.url = _getUrl();
    _this.zoomToLayer = true;

    if (catalog === 'dd') {
      _this.id = 'dd-mainshock';
    }
  };

  /**
   * Add the JSON data and set properties that depend on it.
   */
  _addData = function () {
    _earthquakes.addData(_json);

    _this.data = _getData(_json);
    _this.content = _getContent();
    _this.mapLayer = _earthquakes.mapLayer;
    _this.plots = Plots({
      app: _app,
      feature: _this
    });
    _this.title = _this.data.eq.title;
  };

  /**
   * Add event listeners.
   *
   * Note: listeners for sub-Features are added by their respective Classes.
   */
  _addListeners = function () {
    _download = document.getElementById('download');
    _tsunami = document.querySelector('#summary-pane li.tsunami');

    _download.addEventListener('click', _initDownload);

    if (_tsunami) {
      _tsunami.addEventListener('click', _openTsunami);
    }

    _earthquakes.addListeners();
  };

  /**
   * Add the sub-Features if they exist (i.e. preserve them when re-rendering).
   */
  _addSubFeatures = function () {
    var features = [
      _app.Features.getFeature('dyfi'),
      _app.Features.getFeature('focal-mechanism'),
      _app.Features.getFeature('moment-tensor'),
      _app.Features.getFeature('nearby-cities'),
      _app.Features.getFeature('pager'),
      _app.Features.getFeature('pager-exposures'),
      _app.Features.getFeature('shakemap'),
      _app.Features.getFeature('shake-alert')
    ];

    features.forEach(feature => {
      if (feature.content || feature.lightbox) {
        feature.render();
      }
    });
  };

  /**
   * Destroy this Feature's sub-Classes.
   */
  _destroy = function () {
    _earthquakes?.destroy();

    if (!AppUtil.isEmpty(_this.plots)) {
      _this.plots.destroy();
    }
  };

  /**
   * Fetch the feed data.
   */
  _fetch = function () {
    document.body.classList.add('loading');

    // Fetch ComCat data
    _earthquakes = Earthquakes({
      app: _app,
      feature: _this
    });

    // Fetch DD data
    if (_this.id === 'dd-mainshock') {
      JsonFeed({
        app: _app
      }).fetch({
        host: 'ncedc.org', // PHP script on localhost fetches from ncedc.org
        id: _this.id,
        name: _this.name,
        url: _getUrl()
      }).then(json => {
        _this.render(json);
      });
    }
  };

  /**
   * Get the HTML template for the USGS 'impact bubbles' list.
   *
   * @return template {String}
   */
  _getBubbles = function () {
    var eq = _this.data.eq,
        template = '';

    if (eq.cdi) { // DYFI
      template +=
        '<li class="dyfi feature">' +
          '<strong>' +
            '<abbr title="Did You Feel It?">DYFI?</abbr>' +
          '</strong>' +
          '{cdiBubble}' +
          '<small>{felt} response{plurality}</small>' +
        '</li>';
    }

    if (eq.mmi) { // ShakeMap
      template +=
        '<li class="shakemap feature">' +
          '<strong>ShakeMap</strong>' +
          '{mmiBubble}' +
          '<small>{level}</small>' +
        '</li>';
    }

    if (eq.alert) { // PAGER
      template +=
        '<li class="pager feature">' +
          '<strong>' +
            '<abbr title="Prompt Assessment of Global Earthquakes for Response">PAGER</abbr>' +
          '</strong>' +
          '{alertBubble}' +
          '<small>Impact</small>' +
        '</li>';
    }

    if (eq.tsunami) {
      template +=
        '<li class="tsunami">' +
          '<strong>Tsunami</strong>' +
          '{tsunamiBubble}' +
          '<small>tsunami.gov</small>' +
        '</li>';
    }

    return template;
  };

  /**
   * Get the HTML content for the SummaryPane.
   *
   * @return {String}
   */
  _getContent = function () {
    return L.Util.template(
      _getStrip() +
      '<div class="products">' +
        '<div class="thumbs bubble {hide}">' +
          _getDyfi() +
          _getShakeMap() +
          '<div class="focal-mechanism feature content hide"></div>' +
          '<div class="moment-tensor feature content hide"></div>' +
        '</div>' +
        _getLossPager() +
        '<div class="pager-exposures feature content bubble hide"></div>' +
        '<div class="nearby-cities feature content bubble hide"></div>' +
        '<div class="download bubble">' +
          '<h3>Event Summary</h3>' +
          '<p><abbr title="Rich Text Format">RTF</abbr> document ' +
            'containing earthquake details, images, plots and placeholders ' +
            'for talking points and analysis. Any settings you tweak will be ' +
            'reflected in the document.</p>' +
          '<button id="download" disabled="disabled" type="button" ' +
            'title="Disabled because some features have not finished ' +
            'loading">Download</button>' +
          '<p><strong>Microsoft Word</strong> is recommended for viewing the ' +
            'summary</p>' +
        '</div>' +
        _getNotice() +
        _getLinks() +
        _getTectonic() +
      '</div>',
      _this.data.eq
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
    var datetime = Luxon.DateTime.fromMillis(_this.updated);

    return {
      eq: _getEq(json),
      userDate: datetime.toLocaleString(Luxon.DateTime.DATE_MED),
      userTime: datetime.toLocaleString(Luxon.DateTime.TIME_24_WITH_SECONDS),
      utcDate: datetime.toUTC().toLocaleString(Luxon.DateTime.DATE_MED),
      utcOffset: Number(datetime.toFormat('Z')),
      utcTime: datetime.toUTC().toLocaleString(Luxon.DateTime.TIME_24_WITH_SECONDS)
    };
  };

  /**
   * Get the HTML template for the 'Did You Feel It?' thumbnail.
   *
   * @return template {String}
   */
  _getDyfi = function () {
    var template = '';

    if (_this.data.eq.dyfiImg) {
      template =
        '<div class="dyfi feature">' +
          '<h4>Did You Feel It?</h4>' +
          '<a href="{url}/dyfi" target="new">' +
            '<img src="{dyfiImg}" class="mmi{cdi}" alt="DYFI intensity">' +
          '</a>' +
        '</div>';
    }

    return template;
  };

  /**
   * Get the earthquake details. This is the formatted JSON feed data from
   * Earthquakes.js, plus additional Mainshock-specific convenience properties.
   *
   * @param json {Object}
   *
   * @return {Object}
   */
  _getEq = function (json) {
    var eq = _earthquakes.data.eqs[0] || {}, // formatted JSON feed data
        datetime = eq.datetime,
        products = json.properties?.products || {},
        dyfi = products.dyfi || [],
        dyfiImg = _getImage(dyfi[0]),
        pager = products.losspager || [],
        econImg = pager[0]?.contents['alertecon.png']?.url,
        fatalImg = pager[0]?.contents['alertfatal.png']?.url,
        fm = products['focal-mechanism'] || [],
        format = 'cccc',
        header = products['general-header'] || [],
        hide = 'hide', // default - hide product thumbs container
        mmiInt = Math.round(json.properties?.mmi) || 0,
        mt = products['moment-tensor'] || [],
        notice = header[0]?.contents['']?.bytes,
        plurality = 's', // default
        shakeAlert = products['shake-alert'] || [],
        shakeAlertStatus = shakeAlert[0]?.status?.toLowerCase(),
        shakemap = products.shakemap || [],
        shakemapImg = shakemap[0]?.contents['download/intensity.jpg']?.url;

    if (dyfiImg || shakemapImg || fm[0] || mt[0]) {
      hide = ''; // show thumbs bubble
    }
    if (Number(eq.felt) === 1) {
      plurality = '';
    }

    return Object.assign({}, eq, {
      dyfiImg: dyfiImg,
      econImg: econImg || '',
      fatalImg: fatalImg || '',
      hide: hide,
      latLng: L.latLng(eq.coords[1], eq.coords[0]), // for map marker
      latlon: LatLon(eq.coords[1], eq.coords[0]), // for distance, direction
      level: AppUtil.getShakingValues([mmiInt])[0].level || '', // ShakeMap
      notice: notice || '',
      plurality: plurality,
      products: products,
      shakeAlertStatus: shakeAlertStatus || '',
      shakemapImg: shakemapImg || '',
      tectonic: _getText(products['general-text']),
      userDate: datetime.toLocaleString(Luxon.DateTime.DATE_MED),
      userDayofWeek: datetime.toFormat(format),
      userTime: datetime.toLocaleString(Luxon.DateTime.TIME_24_WITH_SECONDS),
      utcDate: datetime.toUTC().toLocaleString(Luxon.DateTime.DATE_MED),
      utcDayofWeek: datetime.toUTC().toFormat(format),
      utcTime: datetime.toUTC().toLocaleString(Luxon.DateTime.TIME_24_WITH_SECONDS)
    });
  };

  /**
   * Get the URL of the 'primary' DYFI image.
   *
   * @param dyfi {Object} default is {}
   *
   * @return url {String}
   */
  _getImage = function (dyfi = {}) {
    var images = [ // listed in order of preference
          dyfi?.contents?.[dyfi.code + '_ciim.jpg'], // zip
          dyfi?.contents?.[dyfi.code + '_ciim_geo.jpg'] // intensity (preferred)
        ],
        url = '';

    images.forEach(image => {
      if (image) {
        url = image.url;
      }
    });

    return url;
  };

  /**
   * Get the HTML template for the external 'Links' bubble.
   *
   * @return {String}
   */
  _getLinks = function () {
    var url = 'https://jmfee-usgs.github.io/comcat-timeline/?eventId={id}';

    return '' +
      '<div class="links bubble">' +
        '<h3>Links</h3>' +
        '<ul>' +
          '<li>' +
            '<a href="{url}" class="external" target="new">Event Page' +
              '<i class="icon-link"></i>' +
            '</a>' +
          '</li>' +
          '<li>' +
            '<a href="' + url + '" class="external" target="new">Event Timeline' +
              '<i class="icon-link"></i>' +
            '</a>' +
          '</li>' +
        '</ul>' +
      '</div>';
  };

  /**
   * Get the HTML template for the 'loss PAGER' bubble.
   *
   * @return template {String}
   */
  _getLossPager = function () {
    var eq = _this.data.eq,
        template = '';

    if (eq.econImg || eq.fatalImg) {
      template =
        '<div class="pager-loss feature bubble">' +
          '<h4>Estimated Fatalities</h4>' +
          '<img src="{fatalImg}" alt="Estimated fatalities histogram">' +
          '<h4>Estimated Economic Losses</h4>' +
          '<img src="{econImg}" alt="Estimated economic losses histogram">' +
        '</div>';
    }

    return template;
  };

  /**
   * Get the HTML template for the 'Notice' header.
   *
   * @return template {String}
   */
  _getNotice = function () {
    var template = '';

    if (_this.data.eq.notice) {
      template =
        '<div class="notice bubble">' +
          '<h3>Notice</h3>' +
          '{notice}' +
        '</div>';
    }

    return template;
  };

  /**
   * Get the HTML template for the 'ShakeAlert' button.
   *
   * @return template {String}
   */
  _getShakeAlert = function () {
    var template = '';

    if (_this.data.eq.shakeAlertStatus) {
      template =
        '<li class="shake-alert feature">' +
          '<strong>ShakeAlert<sup>®</sup></strong>' +
          '<a href="{url}/shake-alert" target="new">' +
            '<i class="icon-warning"></i>' +
          '</a>' +
          '<small>{shakeAlertStatus}</small>' +
        '</li>';
    }

    return template;
  };

  /**
   * Get the HTML template for the 'ShakeMap' thumbnail.
   *
   * @return template {String}
   */
  _getShakeMap = function () {
    var template = '';

    if (_this.data.eq.shakemapImg) {
      template =
        '<div class="shakemap feature">' +
          '<h4>ShakeMap</h4>' +
          '<a href="{url}/shakemap" target="new">' +
            '<img src="{shakemapImg}" class="mmi{mmi}" alt="ShakeMap intensity">' +
          '</a>' +
        '</div>';
    }

    return template;
  };

  /**
   * Get the HTML template for the details strip.
   *
   * @return {String}
   */
  _getStrip = function () {
    return '' +
      '<div class="details bubble">' +
        '<ul>' +
          '<li class="mag">' +
            '<strong>Mag</strong>' +
            '<span>{magDisplay}</span>' +
            '<small>{magType}</small>' +
          '</li>' +
          _getBubbles() +
          _getShakeAlert() +
          '<li class="user date">' +
            '<strong>Date</strong>' +
            '<span>{userDate}</span>' +
            '<small>{userDayofWeek}</small>' +
          '</li>' +
          '<li class="utc date">' +
            '<strong>Date</strong>' +
            '<span>{utcDate}</span>' +
            '<small>{utcDayofWeek}</small>' +
          '</li>' +
          '<li class="user time">' +
            '<strong>Time</strong>' +
            '<span>{userTime}</span>' +
            '<small>UTC{utcOffset}</small>' +
          '</li>' +
          '<li class="utc time">' +
            '<strong>Time</strong>' +
            '<span>{utcTime}</span>' +
            '<small>UTC</small>' +
          '</li>' +
          '<li class="depth">' +
            '<strong>Depth</strong>' +
            '<span>{depthDisplay}</span>' +
            '<small>km</small>' +
          '</li>' +
          '<li class="location">' +
            '<strong>Location</strong>' +
            '<span>{location}</span>' +
          '</li>' +
          '<li class="status">' +
            '<strong>Status</strong>' +
            '<span>{statusIcon}</span>' +
            '<small>{status}</small>' +
          '</li>' +
          _getUpdated() +
        '</ul>' +
      '</div>';
  };

  /**
   * Get the HTML template for the 'Tectonic Summary' bubble.
   *
   * @return template {String}
   */
  _getTectonic = function () {
    var template = '';

    if (_this.data.eq.tectonic) {
      template =
        '<div class="tectonic bubble">' +
          '<h3>Tectonic Summary</h3>' +
          '{tectonic}' +
        '</div>';
    }

    return template;
  };

  /**
   * Get the tectonic summary text, replacing any image placeholders with their
   * absolute URLs.
   *
   * @param product {Array} default is []
   *
   * @return text {String}
   */
  _getText = function (product = []) {
    var contents = product[0]?.contents || {},
        text = contents['']?.bytes || '';

    Object.keys(contents).forEach(name => {
      var regex = /(\.gif|\.jpg|\.png)$/;

      if (regex.test(name)) {
        text = text.replace(name, contents[name].url);
      }
    });

    return text;
  };

  /**
   * Get the HTML template for the updated time.
   *
   * @return {String}
   */
  _getUpdated = function () {
    return '' +
      '<li class="user updated">' +
        '<strong>Updated</strong>' +
        '<span>' +
          '{userDate}' +
          '<em>{userTime}</em>' +
        '</span>' +
        '<small>UTC{utcOffset}</small>' +
      '</li>' +
      '<li class="utc updated">' +
        '<strong>Updated</strong>' +
        '<span>' +
          '{utcDate}' +
          '<em>{utcTime}</em>' +
        '</span>' +
        '<small>UTC</small>' +
      '</li>';
  };

  /**
   * Get the JSON feed's URL.
   *
   * @return url {String}
   */
  _getUrl = function () {
    var eventid, url,
        eqid = AppUtil.getParam('eqid');

    if (_this.id === 'mainshock') {
      url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/' + eqid +
        '.geojson';
    } else { // double-difference MS
      eventid = eqid.replace(/[A-Za-z]{0,2}(\d+)/, '$1');
      url = location.origin + location.pathname + 'php/fdsn/search.json.php' +
        `?eventid=${eventid}&format=text`;
    }

    return url;
  };

  /**
   * Event handler that creates the RTF document (which triggers a download).
   *
   * Note: the document gets created immediately or via Features.storeFeature()
   * once all Features are ready.
   */
  _initDownload = function () {
    var status = _app.Features.getStatus('rtf');

    if (status === 'ready') {
      _this.createRtf();
    } else {
      _app.Features.createFeatures('rtf');
    }
  };

  /**
   * Merge Comcat (_this.json) and Double-difference (_json) data.
   *
   * @return json {Object}
   */
  _mergeJson = function () {
    var json = structuredClone(_this.json);

    json.metadata = {
      merged: true // flag as merged
    };

    Object.assign(json.geometry, _json.geometry);
    Object.assign(json.properties, _json.properties);

    return json;
  };

  /**
   * Event handler that opens the tsunami web site.
   *
   * @param e {Event}
   */
  _openTsunami = function (e) {
    e.preventDefault();

    open('https://www.tsunami.gov/', 'new');
  };

  /**
   * Remove event listeners.
   */
  _removeListeners = function () {
    _download?.removeEventListener('click', _initDownload);
    _earthquakes?.removeListeners();
    _tsunami?.removeEventListener('click', _openTsunami);
  };

  /**
   * Set _json so that it contains either ComCat data or merged ComCat/Double-
   * difference data (i.e. when the DD catalog is selected).
   *
   * Also store ComCat data in _this.json.
   *
   * @param json {Object}
   *     ComCat or DD data
   *
   * @return isReady {Boolean}
   */
  _setJson = function (json) {
    var catalog = 'comcat', // default
        isReady = true; // default

    if (json.metadata?.sourceUrl?.includes('ncedc')) {
      catalog = 'dd';
    }

    if (catalog === 'comcat') {
      _this.json = json;
    } else {
      _json = json; // cache DD data for now
    }

    if (_this.id === 'mainshock') { // nothing to merge
      _json = json;
    } else if (!AppUtil.isEmpty(_this.json) && _json) { // both catalogs fetched
      if (_json.metadata?.count === 0) { // DD data unavailable
        _json = _this.json;
      } else {
        _json = _mergeJson();
      }
    } else { // still fetching data
      isReady = false;
    }

    return isReady;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add the Feature.
   */
  _this.add = function () {
    _app.MapPane.addFeature(_this);
    _app.SummaryPane.addFeature(_this);

    if (!_earthquakes) { // only fetch once
      _fetch();
    }
  };

  /**
   * Create the RTF Event Summary document if all RTF Features are ready.
   */
  _this.createRtf = function () {
    var status = _app.Features.getStatus('rtf');

    if (status === 'ready') {
      Rtf({
        app: _app
      });
    }
  };

  /**
   * Destroy this Class.
   */
  _this.destroy = function () {
    _destroy();

    _initialize = null;

    _app = null;
    _download = null;
    _earthquakes = null;
    _el = null;
    _json = null;
    _note = null;
    _tsunami = null;

    _addData = null;
    _addListeners = null;
    _addSubFeatures = null;
    _destroy = null;
    _fetch = null;
    _getBubbles = null;
    _getContent = null;
    _getData = null;
    _getDyfi = null;
    _getEq = null;
    _getImage = null;
    _getLinks = null;
    _getLossPager = null;
    _getNotice = null;
    _getShakeAlert = null;
    _getShakeMap = null;
    _getStrip = null;
    _getTectonic = null;
    _getText = null;
    _getUpdated = null;
    _getUrl = null;
    _initDownload = null;
    _mergeJson = null;
    _openTsunami = null;
    _removeListeners = null;
    _setJson = null;

    _this = null;
  };

  /**
   * Disable the RTF download button.
   */
  _this.disableDownload = function () {
    if (_download) {
      _download.setAttribute('disabled', 'disabled');

      if (_note) {
        _download.setAttribute('title', _note);
      }
    }
  };

  /**
   * Enable the RTF download button.
   */
  _this.enableDownload = function () {
    if (_download) {
      _note = _download.getAttribute('title'); // cache initial value

      _download.removeAttribute('disabled');
      _download.setAttribute('title', 'Download RTF Document');
    }
  };

  /**
   * Remove the Feature.
   */
  _this.remove = function () {
    _removeListeners();
    _app.MapPane.removeFeature(_this);
    _app.SummaryPane.removeFeature(_this);
    _el.classList.add('hide');

    _el.innerHTML = '';
  };

  /**
   * Render the Feature.
   *
   * @param json {Object} optional; default is {}
   */
  _this.render = function (json = {}) {
    var header,
        catalog = AppUtil.getParam('catalog'),
        isReady = true; // default

    if (!AppUtil.isEmpty(json)) { // initial render
      isReady = _setJson(json);

      if (isReady) {
        _this.status = 'ready';

        _addData();
        _app.SettingsBar.setValues();
        document.body.classList.replace('loading', 'mainshock');
      } else {
        _this.status = 'loading'; // still loading either ComCat or DD data
      }
    }

    if (isReady) {
      _el.innerHTML = _earthquakes.getPopup(_this.data.eq);

      _el.classList.remove('hide');
      _app.MapPane.addContent(_this);
      _app.SummaryPane.addContent(_this);
      _app.TitleBar.setTitle(_this);
      _addListeners();
      _addSubFeatures();

      if (catalog === 'dd' && _json.metadata?.merged) {
        header = document.querySelector('#summary-pane .dd-mainshock h2');

        header.classList.add('dd');
      }
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Mainshock;
