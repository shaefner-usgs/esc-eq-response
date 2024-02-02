/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
    Earthquakes = require('features/util/earthquakes/Earthquakes'),
    Summary = require('features/util/earthquakes/Summary');


var _DEFAULTS = {
  isRefreshing: false
};


/**
 * Create the Foreshocks Feature.
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *       isRefreshing: {Boolean} optional
 *     }
 *
 * @return _this {Object}
 *     {
 *       add: {Function}
 *       content: {String}
 *       count: {Integer}
 *       data: {Object}
 *       description: {String}
 *       destroy: {Function}
 *       id: {String}
 *       mapLayer: {L.GeoJSON}
 *       name: {String}
 *       params: {Object}
 *       placeholder: {String}
 *       remove: {Function}
 *       render: {Function}
 *       showLayer: {Boolean}
 *       summary: {Object}
 *       type: {String}
 *       url: {String}
 *       zoomToLayer: {Boolean}
 *     }
 */
var Foreshocks = function (options) {
  var _this,
      _initialize,

      _app,
      _earthquakes,

      _addData,
      _addListeners,
      _destroy,
      _fetch,
      _getDescription,
      _getPlaceholder,
      _getUrl,
      _removeListeners;


  _this = {};

  _initialize = function (options = {}) {
    var catalog = AppUtil.getParam('catalog');

    options = Object.assign({}, _DEFAULTS, options);

    _app = options.app;

    _this.params = {
      days: Number(document.getElementById('fs-days').value),
      distance: Number(document.getElementById('fs-distance').value),
      magnitude: Number(document.getElementById('fs-magnitude').value)
    };
    _this.content = '';
    _this.count = 0;
    _this.data = {};
    _this.description = _getDescription(catalog);
    _this.id = 'foreshocks';
    _this.mapLayer = L.geoJSON();
    _this.name = 'Foreshocks';
    _this.placeholder = _getPlaceholder();
    _this.showLayer = true;
    _this.summary = {};
    _this.type = _this.id;
    _this.url = _getUrl();
    _this.zoomToLayer = true;

    if (catalog === 'dd') {
      _this.id = 'dd-foreshocks';
    }

    if (options.isRefreshing) {
      _fetch();
    }
  };

  /**
   * Add the JSON data and set properties that depend on it.
   *
   * @param json {Object}
   */
  _addData = function (json) {
    _earthquakes.addData(json);

    _this.count = _earthquakes.data.eqs.length;
    _this.data = _earthquakes.data;
    _this.mapLayer = _earthquakes.mapLayer;
    _this.summary = Summary({
      app: _app,
      feature: _this
    });
    _this.content = _this.summary.getContent();
  };

  /**
   * Add event listeners.
   */
  _addListeners = function () {
    _earthquakes.addListeners();
    _this.summary.addListeners();
  };

  /**
   * Destroy this Feature's sub-Classes.
   */
  _destroy = function () {
    _earthquakes?.destroy();

    if (!AppUtil.isEmpty(_this.summary)) {
      _this.summary.destroy();
    }
  };

  /**
   * Fetch the feed data.
   */
  _fetch = function () {
    _earthquakes = Earthquakes({
      app: _app,
      feature: _this
    });
  };

  /**
   * Get the Feature's description.
   *
   * @param catalog {String}
   *
   * @return {String}
   */
  _getDescription = function (catalog) {
    var data, kind;

    if (catalog === 'dd') {
      kind = 'double-difference';
    }

    data = {
      days: _this.params.days,
      distance: _this.params.distance,
      kind: kind || '',
      mag: _this.params.magnitude
    };

    return L.Util.template(
      '<strong>M {mag}+</strong> {kind} earthquakes within ' +
      '<strong>{distance} km</strong> of the mainshock’s epicenter in the ' +
      'prior <strong>{days} days</strong> before the mainshock.',
      data
    );
  };

  /**
   * Get the placeholder HTML.
   *
   * @return {String}
   */
  _getPlaceholder = function () {
    return '' +
      '<div class="bubble content">' +
        `<p class="description">${_this.description}</p>` +
      '</div>';
  };

  /**
   * Get the JSON feed's URL.
   *
   * @return {String}
   */
  _getUrl = function () {
    var mainshock = _app.Features.getMainshock(),
        coords = mainshock.data.eq.coords,
        datetime = mainshock.data.eq.datetime,
        endtime = datetime.minus({ seconds: 1 }).toUTC().toISO().slice(0, -5),
        starttime = datetime.minus({ days: _this.params.days })
          .toUTC().toISO().slice(0, -5);

    return Earthquakes.getUrl({
      endtime: endtime,
      latitude: coords[1],
      longitude: coords[0],
      maxradiuskm: _this.params.distance,
      minmagnitude: _this.params.magnitude,
      starttime: starttime
    });
  };

  /**
   * Remove event listeners.
   */
  _removeListeners = function () {
    _earthquakes?.removeListeners();

    if (!AppUtil.isEmpty(_this.summary)) {
      _this.summary.removeListeners();
    }
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
   * Destroy this Class.
   */
  _this.destroy = function () {
    _destroy();

    _initialize = null;

    _app = null;
    _earthquakes = null;

    _addData = null;
    _addListeners = null;
    _destroy = null;
    _fetch = null;
    _getDescription = null;
    _getPlaceholder = null;
    _getUrl = null;
    _removeListeners = null;

    _this = null;
  };

  /**
   * Remove the Feature.
   */
  _this.remove = function () {
    _removeListeners();
    _app.MapPane.removeFeature(_this);
    _app.SummaryPane.removeFeature(_this);
    _app.SettingsBar.setStatus(_this, 'disabled');
  };

  /**
   * Render the Feature.
   *
   * @param json {Object} optional; default is {}
   */
  _this.render = function (json = {}) {
    if (AppUtil.isEmpty(_this.data)) { // initial render
      _addData(json);
    } else {
      _this.content = _this.summary.getContent();
    }

    _app.MapPane.addContent(_this);
    _app.SummaryPane.addContent(_this);
    _app.SettingsBar.setStatus(_this, 'enabled');
    _addListeners();
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Foreshocks;
