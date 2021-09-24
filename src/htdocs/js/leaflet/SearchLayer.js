'use strict';


var Earthquakes = require('features/util/Earthquakes'),
    Luxon = require('luxon');


var _DEFAULTS = {
  maxlatitude: 90,
  maxlongitude: 180,
  minlatitude: -90,
  minlongitude: -180,
  minmagnitude: 2.5,
  period: 'month'
};


/**
 * Create Catalog Search Leaflet layer.
 *
 * @param options {Object}
 *   {
 *     app: {Object} Application
 *   }
 *
 * @return _this {Object}
 *   {
 *     count: {Integer}
 *     create: {Function}
 *     getFeedUrl: {Function}
 *     id: {String}
 *     mapLayer: {L.Layer}
 *     name: {String}
 *     reset: {Function}
 *     showLayer: {Boolean}
 *   }
 */
var CatalogSearch = function (options) {
  var _this,
      _initialize,

      _app,
      _Earthquakes,

      _setName;


  _this = {};

  _initialize = function (options) {
    _app = options.app;

    _this.id = 'search';
    _this.mapLayer = null;
    _this.showLayer = true;
  };

  /**
   * Set the name of the feed.
   *
   * @param params {Object}
   */
  _setName = function (params) {
    var nameParts,
        period;

    nameParts = [
      `M ${params.minmagnitude}+ Earthquakes`,
      'Custom Search' // default
    ];

    if (params.period !== 'custom' &&
        params.maxlatitude === _DEFAULTS.maxlatitude &&
        params.maxlongitude === _DEFAULTS.maxlongitude &&
        params.minlatitude === _DEFAULTS.minlatitude &&
        params.minlongitude === _DEFAULTS.minlongitude
    ) {
      period = params.period[0].toUpperCase() + params.period.slice(1);
      nameParts[1] = `Past ${period}`;
    }

    _this.name = nameParts.join(', ');
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Create the map layer using external feed data.
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

    _this.count = json.metadata.count;
    _this.mapLayer = _Earthquakes.mapLayer;
  };

  /**
   * Get the JSON feed's URL.
   *
   * @params {Object}
   *   {
   *     period {String <day|week|month|year>}
   *     ... (+ all API props, see: https://earthquake.usgs.gov/fdsnws/event/1/)
   *   }
   *
   * @return {String}
   */
  _this.getFeedUrl = function (params) {
    var minus = {};

    params = Object.assign({
      endtime: Luxon.DateTime.now().toUTC().toISO().slice(0, -5),
      starttime: Luxon.DateTime.now().minus({ days: 30 }).toUTC().toISO().slice(0, -5)
    }, _DEFAULTS, params);

    if (params.period !== 'custom') {
      if (!params.period.match(/day|week|month|year/)) {
        params.period = _DEFAULTS.period;
      }

      minus[params.period + 's'] = 1;
      params.starttime = Luxon.DateTime.now().minus(minus).toUTC().toISO().slice(0, -5);
    }

    _setName(params);

    return Earthquakes.getFeedUrl(params);
  };

  /**
   * Reset to initial state.
   */
  _this.reset = function () {
    _this.mapLayer = null;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = CatalogSearch;
