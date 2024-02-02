/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
    Earthquakes = require('features/util/earthquakes/Earthquakes');


var _DEFAULTS = {
  isRefreshing: false
};


/**
 * Create the Catalog Search Feature.
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
 *       count: {Integer}
 *       data: {Object}
 *       destroy: {Function}
 *       id: {String}
 *       mapLayer: {L.GeoJSON}
 *       name: {String}
 *       params: {Object}
 *       remove: {Function}
 *       render: {Function}
 *       showLayer: {Boolean}
 *       title: {String}
 *       url: {String}
 *       zoomToLayer: {Boolean}
 *     }
 */
var CatalogSearch = function (options) {
  var _this,
      _initialize,

      _app,
      _earthquakes,

      _addData,
      _fetch,
      _getTitle,
      _getUrl,
      _setTitle;


  _this = {};

  _initialize = function (options = {}) {
    options = Object.assign({}, _DEFAULTS, options);

    _app = options.app;

    _this.count = 0;
    _this.data = {};
    _this.id = 'catalog-search';
    _this.mapLayer = L.geoJSON();
    _this.name = 'Catalog Search';
    _this.params = _app.SearchBar.getParams();
    _this.showLayer = true;
    _this.title = _getTitle();
    _this.url = _getUrl();
    _this.zoomToLayer = false;

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
   * Get the Feature's title, which is based on the search parameters.
   *
   * @return title {String}
   */
  _getTitle = function () {
    var period = AppUtil.capitalize(_this.params.period),
        title = `M ${_this.params.minmagnitude}+ Earthquakes`;

    if (
      _this.params.region === 'worldwide' &&
      _this.params.period !== 'custom-period'
    ) {
      title += `, Past ${period}`;
    } else {
      title += ', Custom Search';
    }

    return title;
  };

  /**
   * Get the JSON feed's URL.
   *
   * @return {String}
   */
  _getUrl = function () {
    var params = Object.assign({}, _this.params);

    // Search API rejects 'foreign' params needed internally - remove them
    delete params.now;
    delete params.period;
    delete params.region;

    return Earthquakes.getUrl(params, 'search');
  };

  /**
   * Set the title to reflect the Catalog Search params, if no Mainshock is
   * selected.
   */
  _setTitle = function () {
    if (!document.body.classList.contains('mainshock')) {
      _app.TitleBar.setTitle(_this);
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

    if (!_earthquakes) { // only fetch once
      _fetch();
    }
  };

  /**
   * Destroy this Class.
   */
  _this.destroy = function () {
    _earthquakes?.destroy();

    _initialize = null;

    _app = null;
    _earthquakes = null;

    _addData = null;
    _fetch = null;
    _getTitle = null;
    _getUrl = null;
    _setTitle = null;

    _this = null;
  };

  /**
   * Remove the Feature.
   */
  _this.remove = function () {
    _earthquakes?.removeListeners();

    _app.MapPane.removeFeature(_this);
  };

  /**
   * Render the Feature.
   *
   * @param json {Object} default is {}
   */
  _this.render = function (json = {}) {
    _addData(json);

    _app.MapPane.addContent(_this);
    _app.SearchBar.setButton();
    _app.SettingsBar.updateTimeStamp(_this);
    _setTitle();

    _earthquakes.addListeners();

    if (AppUtil.getParam('cs-refresh')) {
      _app.SettingsBar.setInterval('cs-refresh'); // enable auto-refresh
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = CatalogSearch;
