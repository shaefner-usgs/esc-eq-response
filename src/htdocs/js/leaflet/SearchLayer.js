'use strict';


var AppUtil = require('util/AppUtil'),
    Earthquakes = require('features/util/Earthquakes'),
    Luxon = require('luxon');


var _DEFAULTS = {
  endtime: Luxon.DateTime.now().toUTC().toISO().slice(0, -5),
  maxlatitude: 90,
  maxlongitude: 180,
  minlatitude: -90,
  minlongitude: -180,
  minmagnitude: 3.5,
  period: 'month' // 'internal' property (not part of the search API)
};


/**
 * Create the catalog Search overlay.
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
 *     id: {String}
 *     mapLayer: {L.Layer}
 *     name: {String}
 *     reset: {Function}
 *     setFeedUrl: {Function}
 *     showLayer: {Boolean}
 *     title: {String}
 *     url: {String}
 *   }
 */
var SearchLayer = function (options) {
  var _this,
      _initialize,

      _app,

      _getTitle;


  _this = {};

  _initialize = function (options) {
    _app = options.app;

    _this.id = 'search';
    _this.mapLayer = null;
    _this.showLayer = true;
  };

  /**
   * Get the layer's title for the TitleBar and <title>.
   *
   * @param params {Object}
   *
   * @return {String}
   */
  _getTitle = function (params) {
    var parts,
        period;

    parts = [
      _this.name,
      'Custom Search' // default
    ];

    if (params.period !== 'customPeriod' &&
        params.maxlatitude === _DEFAULTS.maxlatitude &&
        params.maxlongitude === _DEFAULTS.maxlongitude &&
        params.minlatitude === _DEFAULTS.minlatitude &&
        params.minlongitude === _DEFAULTS.minlongitude
    ) {
      period = AppUtil.capitalize(params.period);
      parts[1] = `Past ${period}`;
    }

    return parts.join(', ');
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
    var earthquakes = Earthquakes({
      app: _app,
      id: _this.id,
      json: json
    });

    _this.count = json.metadata.count;
    _this.mapLayer = earthquakes.mapLayer;
  };

  /**
   * Reset to initial state.
   */
  _this.reset = function () {
    _this.mapLayer = null;
  };

  /**
   * Set the JSON feed's URL (and also the name and title props).
   *
   * @params {Object}
   *   {
   *     period {String <day|week|month|year>}
   *     ... (+ all API props, see: https://earthquake.usgs.gov/fdsnws/event/1/)
   *   }
   */
  _this.setFeedUrl = function (params) {
    var minus = {};

    params = Object.assign({}, _DEFAULTS, params);

    if (params.period !== 'customPeriod') {
      if (!params.period.match(/day|week|month|year/)) {
        params.period = _DEFAULTS.period;
      }

      minus[params.period + 's'] = 1;
      params.starttime = Luxon.DateTime.now().minus(minus).toUTC().toISO().slice(0, -5);
    }

    _this.name = `M ${params.minmagnitude}+ Earthquakes`;
    _this.title = _getTitle(params);

    // Search API rejects 'foreign' props - remove them
    delete params.period;
    delete params.region;

    _this.url = Earthquakes.getFeedUrl(params, 'search');
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = SearchLayer;
