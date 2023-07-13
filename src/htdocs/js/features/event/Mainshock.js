/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
    Earthquakes = require('features/util/earthquakes/Earthquakes'),
    LatLon = require('util/LatLon'),
    Luxon = require('luxon'),
    Plots = require('features/util/earthquakes/Plots');


/**
 * Create the (ComCat) Mainshock Feature.
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *       showLayer: {Boolean}
 *       zoomToLayer: {Boolean}
 *     }
 *
 * @return _this {Object}
 *     {
 *       addData: {Function}
 *       addDdData: {Function}
 *       addListeners: {Function}
 *       content: {String}
 *       data: {Object}
 *       destroy: {Function}
 *       disableDownload: {Function}
 *       enableDownload: {Function}
 *       id: {String}
 *       mapLayer: {L.FeatureGroup}
 *       name: {String}
 *       placeholder: {String}
 *       plots: {Object}
 *       removeListeners: {Function}
 *       showLayer: {Boolean}
 *       summary: {String}
 *       title: {String}
 *       update: {Function}
 *       url: {String}
 *       zoomToLayer: {Boolean}
 *     }
 */
var Mainshock = function (options) {
  var _this,
      _initialize,

      _app,
      _button,
      _buttonTitle,
      _ddData,
      _earthquakes,
      _els,
      _json,
      _tsunami,

      _addPlaceholders,
      _createFeatures,
      _destroy,
      _getBubbles,
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
      _getSummary,
      _getTectonic,
      _getText,
      _getUpdated,
      _getUrl,
      _openTsunami,
      _updateDetails,
      _updateHeader,
      _updateMarkers,
      _updatePlots;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;

    _this.id = 'mainshock';
    _this.name = 'Mainshock';
    _this.placeholder = '<div class="content"></div>';
    _this.plots = {};
    _this.showLayer = options.showLayer;
    _this.summary = '';
    _this.url = _getUrl();
    _this.zoomToLayer = options.zoomToLayer;

    _earthquakes = Earthquakes({ // fetch feed data
      app: _app,
      feature: _this
    });
    _ddData = {}; // double-difference data

    _this.mapLayer = _earthquakes.mapLayer;

    _addPlaceholders();
  };

  /**
   * Add the Beachball placeholders to the MapPane.
   */
  _addPlaceholders = function () {
    var container = document.querySelector('#mapPane .container');

    container.innerHTML =
      '<div class="focal-mechanism feature"></div>' +
      '<div class="moment-tensor feature"></div>';
  };

  /**
   * Event handler that creates the RTF Features.
   */
  _createFeatures = function () {
    _app.Features.createFeatures('rtf');
  };

  /**
   * Destroy this Feature's sub-Classes.
   */
  _destroy = function () {
    _earthquakes.destroy();

    if (!AppUtil.isEmpty(_this.plots)) {
      _this.plots.destroy();
    }
  };

  /**
   * Get the HTML template for the USGS 'impact bubbles'.
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
   * Get the data used to create the content.
   *
   * @param json {Object}
   *
   * @return {Object}
   */
  _getData = function (json) {
    var datetime = Luxon.DateTime.fromMillis(_this.updated);

    _json = json; // cache feed data

    return {
      eq: _getEq(),
      userDate: datetime.toLocaleString(Luxon.DateTime.DATE_MED),
      userTime: datetime.toLocaleString(Luxon.DateTime.TIME_24_WITH_SECONDS),
      utcDate: datetime.toUTC().toLocaleString(Luxon.DateTime.DATE_MED),
      utcOffset: Number(datetime.toFormat('Z')),
      utcTime: datetime.toUTC().toLocaleString(Luxon.DateTime.TIME_24_WITH_SECONDS)
    };
  };

  /**
   * Get the HTML template for 'Did You Feel It?'.
   *
   * @return template {String}
   */
  _getDyfi = function () {
    var img,
        template = '';

    if (_this.data.eq.dyfiImg) {
      img = '<img src="{dyfiImg}" class="mmi{cdi}" alt="DYFI intensity">';
      template =
        '<div class="dyfi feature">' +
          '<h4>Did You Feel It?</h4>' +
          '<a href="{url}/dyfi">' + img + '</a>' +
        '</div>';
    }

    return template;
  };

  /**
   * Get the earthquake details. This is the formatted JSON feed data from
   * Earthquakes.js, plus additional Mainshock-specific convenience properties.
   *
   * @return {Object}
   */
  _getEq = function () {
    var eq = _earthquakes.data.eqs[0], // formatted JSON feed data
        datetime = eq.datetime,
        products = _json.properties?.products || {},
        dyfi = products.dyfi || [],
        dyfiImg = _getImage(dyfi[0]),
        pager = products.losspager || [],
        econImg = pager[0]?.contents['alertecon.png']?.url,
        fatalImg = pager[0]?.contents['alertfatal.png']?.url,
        fm = products['focal-mechanism'] || [],
        format = 'cccc',
        header = products['general-header'] || [],
        hide = 'hide', // default - hide product thumbs container
        mmiInt = Math.round(_json.properties?.mmi) || 0,
        mt = products['moment-tensor'] || [],
        notice = header[0]?.contents['']?.bytes,
        plurality = 's', // default
        shakeAlert = products['shake-alert'] || [],
        shakeAlertStatus = shakeAlert[0]?.status?.toLowerCase(),
        shakemap = products.shakemap || [],
        shakemapImg = shakemap[0]?.contents['download/intensity.jpg']?.url;

    if (dyfiImg || shakemapImg || fm[0] || mt[0]) {
      hide = ''; // show
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
    var images = [ // NOTE: images listed in order of preference
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
   * Get the HTML template for external links.
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
   * Get the HTML template for 'loss PAGER'.
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
      template = '<p class="notice">{notice}</p>';
    }

    return template;
  };

  /**
   * Get the HTML template for 'ShakeAlert'.
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
   * Get the HTML template for 'ShakeMap'.
   *
   * @return template {String}
   */
  _getShakeMap = function () {
    var img,
        template = '';

    if (_this.data.eq.shakemapImg) {
      img = '<img src="{shakemapImg}" class="mmi{mmi}" alt="ShakeMap intensity">';
      template =
        '<div class="shakemap feature">' +
          '<h4>ShakeMap</h4>' +
          '<a href="{url}/shakemap">' + img + '</a>' +
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
   * Get the HTML content for the SummaryPane.
   *
   * @return {String}
   */
  _getSummary = function () {
    return L.Util.template(
      _getNotice() +
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
        _getLinks() +
        _getTectonic() +
      '</div>',
      _this.data.eq
    );
  };

  /**
   * Get the HTML template for the 'Tectonic Summary'.
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
   * Get the HTML content for the updated time.
   *
   * @return {String}
   */
  _getUpdated = function () {
    return L.Util.template(
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
      '</li>',
      _this.data
    );
  };

  /**
   * Get the JSON feed's URL.
   *
   * @return {String}
   */
  _getUrl = function () {
    var eqid = AppUtil.getParam('eqid');

    return 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/' + eqid +
      '.geojson';
  };

  /**
   * Open the tsunami web site.
   */
  _openTsunami = function () {
    open('https://www.tsunami.gov/', 'new');
  };

  /**
   * Update the earthquake details 'strip' (on the SummaryPane) and 'balloon'
   * (on the SelectBar) using the selected catalog's data.
   */
  _updateDetails = function () {
    var balloon = document.querySelector('#selectBar .mainshock'),
        mainshock = document.getElementById('mainshock'),
        newBalloon = _earthquakes.getPopup(_this.data.eq),
        newStrip = L.Util.template(_getStrip(), _this.data.eq),
        products = document.querySelector('#summaryPane .mainshock .products'),
        strip = document.querySelector('#summaryPane .mainshock .details');

    _this.removeListeners();
    balloon.remove();
    strip.remove();

    mainshock.insertAdjacentHTML('afterbegin', newBalloon);
    products.insertAdjacentHTML('beforebegin', newStrip);
    _this.addListeners();
  };

  /**
   * Update the header: add and toggle the 'Double-difference' descriptor (on
   * the SummaryPane) on/off depending on which catalog is selected.
   */
  _updateHeader = function () {
    var header = document.querySelector('#summaryPane .mainshock h2'),
        span = header.querySelector('span');

    if (!span) {
      header.innerHTML = '<span>Double-difference</span>' + header.innerText;
      span = header.querySelector('span');
    }

    if (_this.data.eq.catalog === 'comcat') {
      span.classList.add('hide');
    } else {
      span.classList.remove('hide');
    }
  };

  /**
   * Update the Markers using the selected catalog's data.
   */
  _updateMarkers = function () {
    var div = document.createElement('div'),
        eq = _this.data.eq,
        fm = _app.Features.getFeature('focal-mechanism'),
        marker = _this.mapLayer.getLayers()[0],
        mt = _app.Features.getFeature('moment-tensor');

    div.innerHTML = _earthquakes.getPopup(eq);

    marker.setLatLng(eq.latLng);
    marker.setPopupContent(div);
    marker.setTooltipContent(_earthquakes.getTooltip(eq));

    _earthquakes.updateListeners();

    if (fm.mapLayer) {
      fm.update(eq.latLng);
    }
    if (mt.mapLayer) {
      mt.update(eq.latLng);
    }
  };

  /**
   * Update (create new) Plots using the selected catalog's data.
   */
  _updatePlots = function () {
    _this.plots.destroy(); // previous catalog's plots

    _this.plots = Plots({
      app: _app,
      data: [_this.data.eq],
      featureId: _this.id
    });
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add the JSON feed data.
   *
   * Also set the title and defaults (Settings), and update the Significant
   * Earthquakes list.
   *
   * @param json {Object} default is {}
   */
  _this.addData = function (json = {}) {
    var significantEqs = _app.Features.getFeature('significant-eqs');

    _earthquakes.addData(json);

    _this.data = _getData(json);
    _this.content = _earthquakes.getPopup(_this.data.eq);
    _this.plots = Plots({
      app: _app,
      data: [_this.data.eq],
      featureId: _this.id
    });
    _this.summary = _getSummary();
    _this.title = _this.data.eq.title;

    _app.SettingsBar.setValues();
    _app.TitleBar.setTitle(_this);

    if (_app.Features.isFeature(significantEqs)) {
      significantEqs.update(json.id); // selects Mainshock if it's in the list
    }
  };

  /**
   * Add the double-difference data and then update the Mainshock.
   *
   * @param data {Object}
   */
  _this.addDdData = function (data) {
    _ddData = data;

    _this.update('dd');
  };

  /**
   * Add event listeners.
   *
   * Note: Leaflet map popup's listeners are added by the Earthquakes Class.
   */
  _this.addListeners = function () {
    var selectors = [ // Lightboxes
      '#mainshock .feature', // bubbles on SelectBar
      '#mapPane .feature', // map's Beachballs
      '#summaryPane .details .feature',
      '#summaryPane .pager-exposures',
      '#summaryPane .pager-loss',
      '#summaryPane .thumbs .feature'
    ];

    _button = document.getElementById('download');
    _els = document.querySelectorAll(selectors.join());
    _tsunami = document.querySelector('#summaryPane li.tsunami');

    // Create RTF Features (RTF document is created once all Features are ready)
    _button.addEventListener('click', _createFeatures);

    // Open a Lightbox
    _els.forEach(el =>
      el.addEventListener('click', _app.Features.showLightbox)
    );

    if (_tsunami) {
      _tsunami.addEventListener('click', _openTsunami);
    }

    _earthquakes.addListeners();
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _destroy();

    _initialize = null;

    _app = null;
    _button = null;
    _buttonTitle = null;
    _ddData = null;
    _earthquakes = null;
    _els = null;
    _json = null;
    _tsunami = null;

    _addPlaceholders = null;
    _createFeatures = null;
    _destroy = null;
    _getBubbles = null;
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
    _getSummary = null;
    _getTectonic = null;
    _getText = null;
    _getUpdated = null;
    _getUrl = null;
    _openTsunami = null;
    _updateDetails = null;
    _updateHeader = null;
    _updateMarkers = null;
    _updatePlots = null;

    _this = null;
  };

  /**
   * Disable the download RTF button.
   */
  _this.disableDownload = function () {
    if (_button) {
      _button.setAttribute('disabled', 'disabled');

      if (_buttonTitle) {
        _button.setAttribute('title', _buttonTitle);
      }
    }
  };

  /**
   * Enable the download RTF button.
   */
  _this.enableDownload = function () {
    _buttonTitle = _button.getAttribute('title');

    _button.removeAttribute('disabled');
    _button.setAttribute('title', 'Download RTF Document');
  };

  /**
   * Remove event listeners.
   */
  _this.removeListeners = function () {
    if (_button) {
      _button.removeEventListener('click', _createFeatures);
    }

    if (_els) {
      _els.forEach(el =>
        el.removeEventListener('click', _app.Features.showLightbox)
      );
    }

    if (_tsunami) {
      _tsunami.removeEventListener('click', _openTsunami);
    }

    _earthquakes.removeListeners();
  };

  /**
   * Update the content to display the given catalog's data (i.e. depth,
   * location, magnitude, and time).
   *
   * @param catalog {String <comcat|dd>}
   */
  _this.update = function (catalog) {
    _this.data.eq = _getEq(); // default (ComCat data)

    if (catalog === 'dd') {
      Object.assign(_this.data.eq, _ddData); // replace with DD data
    }

    _this.title = _this.data.eq.title;
    _app.TitleBar.setTitle(_this);

    _updateDetails();
    _updateHeader();
    _updateMarkers();
    _updatePlots();
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Mainshock;
