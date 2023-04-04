'use strict';


var AppUtil = require('util/AppUtil'),
    Earthquakes = require('features/util/earthquakes/Earthquakes');


/**
 * Create the Catalog Search Feature.
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *       showLayer: {Boolean}
 *     }
 *
 * @return _this {Object}
 *     {
 *       addData: {Function}
 *       addListeners: {Function}
 *       count: {Integer}
 *       destroy: {Function}
 *       id: {String}
 *       mapLayer: {L.FeatureGroup}
 *       name: {String}
 *       params: {Object}
 *       removeListeners: {Function}
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

      _getTitle,
      _getUrl,
      _setTitle;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;

    _this.id = 'catalog-search';
    _this.name = 'Catalog Search';
    _this.params = _app.SearchBar.getParams();
    _this.showLayer = options.showLayer;
    _this.title = _getTitle();
    _this.url = _getUrl();
    _this.zoomToLayer = false;

    _earthquakes = Earthquakes({ // fetch feed data
      app: _app,
      feature: _this
    });

    _this.mapLayer = _earthquakes.mapLayer;
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
      _this.params.period !== 'customPeriod'
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
   * Add the JSON feed data.
   *
   * @param json {Object} default is {}
   */
  _this.addData = function (json = {}) {
    _setTitle();
    _earthquakes.addData(json);
    _app.SearchBar.setButton();

    _this.count = _earthquakes.data.eqs.length;
  };

  /**
   * Add event listeners.
   */
  _this.addListeners = function () {
    _earthquakes.addListeners();
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _earthquakes.destroy();

    _initialize = null;

    _app = null;
    _earthquakes = null;

    _getTitle = null;
    _getUrl = null;
    _setTitle = null;

    _this = null;
  };

  /**
   * Remove event listeners.
   */
  _this.removeListeners = function () {
    _earthquakes.removeListeners();
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = CatalogSearch;
