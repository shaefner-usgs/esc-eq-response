/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
    Earthquakes = require('features/util/earthquakes/Earthquakes'),
    LatLon = require('util/LatLon'),
    Lightbox = require('util/ui/Lightbox'),
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
 *       lightboxes: {Object}
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
      _json,
      _thumbs,

      _addLightbox,
      _createFeatures,
      _getBubbles,
      _getData,
      _getDyfi,
      _getLossPager,
      _getNotice,
      _getShakeAlert,
      _getShakeMap,
      _getStrip,
      _getSummary,
      _getTectonic,
      _getUrl,
      _showLightbox,
      _updateDetails,
      _updateHeader,
      _updateMarker,
      _updatePlots;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;

    _this.id = 'mainshock';
    _this.lightboxes = {};
    _this.name = 'Mainshock';
    _this.placeholder = '<div class="content"></div>';
    _this.plots = {};
    _this.showLayer = options.showLayer;
    _this.summary = '';
    _this.url = _getUrl();
    _this.zoomToLayer = options.zoomToLayer;

    _earthquakes = Earthquakes({
      app: _app,
      feature: _this
    });
    _ddData = {}; // double-difference data

    _this.mapLayer = _earthquakes.mapLayer;
  };

  /**
   * Create and add a Lightbox for either DYFI or ShakeMap.
   *
   * @param opts {Object}
   *     {
   *       id: {String}
   *       img: {String}
   *       title: {String}
   *     }
   *
   * @return Lightbox {Class}
   */
  _addLightbox = function (opts) {
    var props, template,
        data = _this.data; // default

    if (opts.id === 'dyfi') {
      props = data.products.dyfi[0].properties;
      data = Object.assign({}, _this.data, {
        maxmmi: props.maxmmi,
        responses: AppUtil.addCommas(props.numResp)
      });
      template = opts.img +
        '<div class="details">' +
          '<dl class="props alt">' +
            '<dt>Max <abbr title="Modified Mercalli Intensity">MMI</abbr></dt>' +
            '<dd>{maxmmi}</dd>' +
            '<dt>Responses</dt>' +
            '<dd>{responses}</dd>' +
          '</dl>' +
          '<p>' +
            '<a href="{url}/dyfi" class="external" target="new">Additional maps' +
              '<i class="icon-link"></i>' +
            '</a>' +
          '</p>' +
        '</div>';
    } else { // ShakeMap
      template = opts.img +
        '<div class="shakemap details">' +
          '<p>' +
            '<a href="{url}/shakemap" class="external" target="new">Full details and additional maps' +
              '<i class="icon-link"></i>' +
            '</a>' +
          '</p>' +
        '</div>';
    }

    return Lightbox({
      content: L.Util.template(template, data),
      id: opts.id,
      title: opts.title
    });
  };

  /**
   * Event handler that creates the RTF Features.
   */
  _createFeatures = function () {
    _app.Features.createFeatures('rtf');
  };

  /**
   * Get the HTML template for the USGS 'impact bubbles'.
   *
   * @return template {String}
   */
  _getBubbles = function () {
    var template = '';

    if (_this.data.cdi) { // DYFI
      template +=
        '<li>' +
          '<strong>' +
            '<abbr title="Did You Feel It?">DYFI?</abbr>' +
          '</strong>' +
          '{cdiBubble}' +
          '<small>{felt} response{plurality}</small>' +
        '</li>';
    }

    if (_this.data.mmi) { // ShakeMap
      template +=
        '<li>' +
          '<strong>ShakeMap</strong>' +
          '{mmiBubble}' +
          '<small>{level}</small>' +
        '</li>';
    }

    if (_this.data.alert) { // PAGER
      template +=
        '<li>' +
          '<strong>' +
            '<abbr title="Prompt Assessment of Global Earthquakes for Response">PAGER</abbr>' +
          '</strong>' +
          '{alertBubble}' +
          '<small>Impact</small>' +
        '</li>';
    }

    if (_this.data.tsunami) {
      template +=
        '<li>' +
          '<strong>Tsunami</strong>' +
          '{tsunamiBubble}' +
        '</li>';
    }

    return template;
  };

  /**
   * Get the formatted data used to create the summary HTML. This is the
   * JSON feed data from Earthquakes.js, plus additional Mainshock-specific
   * convenience properties.
   *
   * @param json {Object} default is _json
   *
   * @return {Object}
   */
  _getData = function (json = _json) {
    var dyfiImg, econImg, fatalImg, notice, shakeAlertStatus, shakemapImg, tectonic,
        data = _earthquakes.data[0], // formatted JSON feed data
        datetime = data.datetime,
        products = json.properties.products,
        dyfi = products.dyfi,
        fm = products['focal-mechanism'],
        format = 'cccc',
        header = products['general-header'],
        hide = 'hide', // default - hide product thumbs container
        mmiInt = Math.round(json.properties.mmi),
        mt = products['moment-tensor'],
        pager = products.losspager,
        plurality = 's', // default
        shakeAlert = products['shake-alert'],
        shakemap = products.shakemap,
        text = products['general-text'];

    _json = json; // cache feed data

    if (Array.isArray(dyfi)) {
      dyfiImg = dyfi[0].contents[dyfi[0].code + '_ciim_geo.jpg'].url;
      hide = ''; // show
    }
    if (Array.isArray(fm) || Array.isArray(mt)) {
      hide = ''; // show
    }
    if (Array.isArray(header)) {
      notice = header[0].contents[''].bytes;
    }
    if (Array.isArray(pager)) {
      econImg = pager[0].contents['alertecon.png'].url;
      fatalImg = pager[0].contents['alertfatal.png'].url;
    }
    if (Array.isArray(shakeAlert)) {
      shakeAlertStatus = shakeAlert[0].status.toLowerCase();
    }
    if (Array.isArray(shakemap)) {
      hide = ''; // show

      if (shakemap[0].contents['download/tvmap.jpg']) {
        shakemapImg = shakemap[0].contents['download/tvmap.jpg'].url;
      } else if (shakemap[0].contents['download/intensity.jpg'].url) {
        shakemapImg = shakemap[0].contents['download/intensity.jpg'].url;
      }
    }
    if (Array.isArray(text)) {
      tectonic = text[0].contents[''].bytes;
    }

    if (Number(data.felt) === 1) {
      plurality = '';
    }

    return Object.assign({}, data, {
      dyfiImg: dyfiImg || '',
      econImg: econImg || '',
      fatalImg: fatalImg || '',
      hide: hide,
      latLng: L.latLng(data.coords[1], data.coords[0]), // for map marker
      latlon: LatLon(data.coords[1], data.coords[0]), // for distance, direction
      level: AppUtil.getShakingValues([mmiInt])[0].level || '', // ShakeMap
      notice: notice || '',
      plurality: plurality,
      products: products,
      shakeAlertStatus: shakeAlertStatus || '',
      shakemapImg: shakemapImg || '',
      tectonic: tectonic || '',
      userDate: datetime.toLocal().toLocaleString(Luxon.DateTime.DATE_MED),
      userDayofweek: datetime.toLocal().toFormat(format),
      userTime: datetime.toLocal().toLocaleString(Luxon.DateTime.TIME_24_WITH_SECONDS),
      utcDate: datetime.toLocaleString(Luxon.DateTime.DATE_MED),
      utcDayofweek: datetime.toFormat(format),
      utcTime: datetime.toLocaleString(Luxon.DateTime.TIME_24_WITH_SECONDS)
    });
  };

  /**
   * Get the HTML template for 'Did You Feel It?' (and add its Lightbox).
   *
   * @return template {String}
   */
  _getDyfi = function () {
    var img,
        id = 'dyfi',
        template = '';

    if (_this.data.dyfiImg) {
      img = '<img src="{dyfiImg}" class="mmi{cdi}" alt="DYFI intensity">';
      template =
        '<div class="dyfi">' +
          '<h4>Did You Feel It?</h4>' +
          '<a href="{dyfiImg}">' + img + '</a>' +
        '</div>';

      _this.lightboxes[id] = _addLightbox({
        id: id,
        img: img,
        title: 'Did You Feel It?'
      });
    }

    return template;
  };

  /**
   * Get the HTML template for 'loss PAGER'.
   *
   * @return template {String}
   */
  _getLossPager = function () {
    var template = '';

    if (_this.data.econImg) {
      template =
        '<div class="pager-loss bubble">' +
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

    if (_this.data.notice) {
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

    if (_this.data.shakeAlertStatus) {
      template =
        '<li class="shake-alert">' +
          '<strong>ShakeAlert<sup>®</sup></strong>' +
          '<a href="{url}/shake-alert" target="new">' +
            '<img src="img/shake-alert.png" alt="ShakeAlert logo">' +
          '</a>' +
          '<small>{shakeAlertStatus}</small>' +
        '</li>';
    }

    return template;
  };

  /**
   * Get the HTML template for 'ShakeMap' (and add its Lightbox).
   *
   * @return template {String}
   */
  _getShakeMap = function () {
    var img,
        id = 'shakemap',
        template = '';

    if (_this.data.shakemapImg) {
      img = '<img src="{shakemapImg}" class="mmi{mmi}" alt="ShakeMap intensity">';
      template =
        '<div class="shakemap">' +
          '<h4>ShakeMap</h4>' +
          '<a href="{shakemapImg}">' + img + '</a>' +
        '</div>';

      _this.lightboxes[id] = _addLightbox({
        id: id,
        img: img,
        title: 'ShakeMap'
      });
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
          '<li class="utc date">' +
            '<strong>Date</strong>' +
            '<span>{utcDate}</span>' +
            '<small>{utcDayofweek}</small>' +
          '</li>' +
          '<li class="utc time">' +
            '<strong>Time</strong>' +
            '<span>{utcTime}</span>' +
            '<small>UTC</small>' +
          '</li>' +
          '<li class="user date">' +
            '<strong>Date</strong>' +
            '<span>{userDate}</span>' +
            '<small>{userDayofweek}</small>' +
          '</li>' +
          '<li class="user time">' +
            '<strong>Time</strong>' +
            '<span>{userTime}</span>' +
            '<small>' + _app.utcOffset + '</small>' +
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
          '<div class="focal-mechanism content hide"></div>' +
          '<div class="moment-tensor content hide"></div>' +
        '</div>' +
        '<div class="pager-exposures bubble content hide"></div>' +
        _getLossPager() +
        '<div class="download bubble">' +
          '<h3>Event Summary</h3>' +
          '<p><abbr title="Rich Text Format">RTF</abbr> document ' +
            'containing earthquake details, images, plots and ' +
            'placeholders for talking points and analysis. Microsoft ' +
            'Word is recommended for viewing the document.</p>' +
          '<button id="download" disabled="disabled" type="button" ' +
            'title="Disabled because some features have not finished ' +
            'loading">Download</button>' +
        '</div>' +
        _getTectonic() +
      '</div>',
      _this.data
    );
  };

  /**
   * Get the HTML template for the 'Tectonic Summary'.
   *
   * @return template {String}
   */
  _getTectonic = function () {
    var template = '';

    if (_this.data.tectonic) {
      template =
        '<div class="tectonic bubble">' +
          '<h3>Tectonic Summary</h3>' +
          '{tectonic}' +
        '</div>';
    }

    return template;
  };

  /**
   * Get the JSON feed's URL.
   *
   * @return {String}
   */
  _getUrl = function () {
    var eqid = AppUtil.getParam('eqid');

    return `https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/${eqid}.geojson`;
  };

  /**
   * Event handler that shows a Lightbox.
   *
   * @param e {Event}
   */
  _showLightbox = function (e) {
    var id = e.target.closest('div').className;

    e.preventDefault();

    _this.lightboxes[id].show();
  };

  /**
   * Update the earthquake details 'strip' (on the SummaryPane) and 'balloon'
   * (on the SelectBar) using the selected catalog's data.
   */
  _updateDetails = function () {
    var newBalloon, newStrip,
        elBalloon = document.getElementById('mainshock'),
        elStrip = document.querySelector('#summaryPane .mainshock .products'),
        oldBalloon = document.querySelector('#selectBar .mainshock'),
        oldStrip = document.querySelector('#summaryPane .mainshock .details');

    newBalloon = _earthquakes.getContent(_this.data);
    newStrip = L.Util.template(_getStrip(), _this.data);

    oldBalloon.remove();
    oldStrip.remove();

    elBalloon.insertAdjacentHTML('afterbegin', newBalloon);
    elStrip.insertAdjacentHTML('beforebegin', newStrip);
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

    if (_this.data.catalog === 'comcat') {
      span.classList.add('hide');
    } else {
      span.classList.remove('hide');
    }
  };

  /**
   * Update the Marker using the selected catalog's data.
   */
  _updateMarker = function () {
    var marker = _this.mapLayer.getLayers()[0];

    marker.setLatLng(_this.data.latLng);
    marker.setPopupContent(_earthquakes.getContent(_this.data));
    marker.setTooltipContent(_earthquakes.getTooltip(_this.data));
  };

  /**
   * Update the Plots using the selected catalog's data.
   */
  _updatePlots = function () {
    _this.plots.destroy(); // previous catalog's plots

    _this.plots = Plots({
      app: _app,
      data: [_this.data],
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
   * @param json {Object}
   */
  _this.addData = function (json) {
    var significantEqs = _app.Features.getFeature('significant-eqs');

    _earthquakes.addData(json);
    _this.data = _getData(json); // used by Rtf.js, etc.
    _this.content = _earthquakes.getContent(_this.data);
    _this.plots = Plots({
      app: _app,
      data: [_this.data],
      featureId: _this.id
    });
    _this.summary = _getSummary();
    _this.title = _this.data.title;

    _app.SettingsBar.setValues();
    _app.TitleBar.setTitle(_this);

    significantEqs.update(json.id); // selects Mainshock if in list
  };

  /**
   * Add the double-difference data and then update the Mainshock.
   *
   * @param json {Object}
   */
  _this.addDdData = function (data) {
    _ddData = data;

    _this.update('dd');
  };

  /**
   * Add event listeners.
   *
   * Note: event listeners for the Beachball thumbnails are added by their
   * respective Feature classes.
   */
  _this.addListeners = function () {
    _button = document.getElementById('download');
    _thumbs = document.querySelectorAll('.thumbs .dyfi a, .thumbs .shakemap a');

    // Create RTF Features (RTF document is created when all Features are ready)
    _button.addEventListener('click', _createFeatures);

    // Show Lightbox content
    _thumbs.forEach(thumb => {
      thumb.addEventListener('click', _showLightbox);
    });
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _earthquakes.destroy();

    if (!AppUtil.isEmpty(_this.plots)) {
      _this.plots.destroy();
    }

    Object.keys(_this.lightboxes).forEach(id => {
      _this.lightboxes[id].destroy();
    });

    _initialize = null;

    _app = null;
    _button = null;
    _buttonTitle = null;
    _ddData = null;
    _earthquakes = null;
    _json = null;
    _thumbs = null;

    _addLightbox = null;
    _createFeatures = null;
    _getBubbles = null;
    _getData = null;
    _getDyfi = null;
    _getLossPager = null;
    _getNotice = null;
    _getShakeAlert = null;
    _getShakeMap = null;
    _getStrip = null;
    _getSummary = null;
    _getTectonic = null;
    _getUrl = null;
    _showLightbox = null;
    _updateDetails = null;
    _updateHeader = null;
    _updateMarker = null;
    _updatePlots = null;

    _this = null;
  };

  /**
   * Disable the download RTF button.
   */
  _this.disableDownload = function () {
    _button.setAttribute('disabled', 'disabled');

    if (_buttonTitle) {
      _button.setAttribute('title', _buttonTitle);
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
    if (_thumbs) {
      _thumbs.forEach(thumb => {
        thumb.removeEventListener('click', _showLightbox);
      });
    }
  };

  /**
   * Update the content to display the given catalog's data (i.e. depth,
   * location, magnitude, and time).
   *
   * @param catalog {String <comcat|dd>}
   */
  _this.update = function (catalog) {
    var fm = _app.Features.getFeature('focal-mechanism'),
        mt = _app.Features.getFeature('moment-tensor');

    _this.data = _getData(); // default (ComCat data)

    if (catalog === 'dd') {
      Object.assign(_this.data, _ddData); // replace with DD data
    }

    _this.title = _this.data.title;
    _app.TitleBar.setTitle(_this);

    _updateDetails();
    _updateHeader();
    _updateMarker();
    _updatePlots();

    if (fm.mapLayer) {
      fm.update(_this.data.latLng);
    }
    if (mt.mapLayer) {
      mt.update(_this.data.latLng);
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Mainshock;
