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
      `M ${params.minmagnitude}+ Earthquakes`
    ];

    if (params.period) {
      period = params.period[0].toUpperCase() + params.period.slice(1);
      nameParts[1] = `Past ${period}`;
    } else {
      nameParts[1] = 'Custom Search';
    }

    if (params.maxlatitude !== 90 || params.maxlongitude !== 180 ||
      params.minlatitude !== -90 || params.minlongitude !== -180
    ) {
      nameParts[1] = 'Custom Search';
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
   *     endtime: {String}
   *     starttime: {String}
   *     ... (see _DEFAULTS)
   *   }
   *
   * @return {String}
   */
  _this.getFeedUrl = function (params) {
    var minus = {};

    params = Object.assign({}, _DEFAULTS, params);

    if (params.starttime && params.endtime) {
      params.period = null; // override period w/ provided times
    } else {
      if (!params.period.match(/day|week|month|year/)) { // valid period values
        params.period = _DEFAULTS.period;
      }
      minus[params.period + 's'] = 1;

      params.endtime = Luxon.DateTime.now().toUTC().toISO().slice(0, -5);
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
