/* global L */
'use strict';


var AppUtil = require('util/AppUtil');


/**
 * Create PAGER Exposures Feature.
 *
 * @param options {Object}
 *   {
 *     app: {Object} Application
 *     eqid: {String} Mainshock event id
 *   }
 *
 * @return _this {Object}
 *   {
 *     dependencies: {Array}
 *     destroy: {Function}
 *     exposures: {Object}
 *     id: {String}
 *     initFeature: {Function}
 *     name: {String)
 *     summary: {String}
 *     url: {String}
 *   }
 */
var PagerExposures = function (options) {
  var _this,
      _initialize,

      _app,
      _eqid,

      _createRows,
      _createSummary,
      _getExposures,
      _getFeedUrl,
      _getShakingValues;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _eqid = options.eqid;

    _this.dependencies = [
      'pager-cities'
    ];
    _this.id = 'pager-exposures';
    _this.name = 'PAGER Exposures';
    _this.summary = null;
    _this.url = _getFeedUrl();
  };

  /**
   * Create table rows HTML.
   *
   * @return html {String}
   */
  _createRows = function () {
    var cities,
        data,
        html,
        mmis,
        population,
        shaking;

    cities = _app.Features.getFeature('pager-cities').cities;
    html = '';
    mmis = _this.exposures.mmi;
    population = _this.exposures.population;
    shaking = _this.exposures.shaking;

    mmis.forEach(function(mmi, i) {
      if (mmi >= 2 && population[i] > 0) { // skip mmi below 2 and when nobody affected
        data = {
          intensity: shaking[i].intensity,
          level: shaking[i].level,
          population: AppUtil.addCommas(population[i])
        };
        html += L.Util.template(
          '<tr>' +
            '<td class="impact-bubbles"><span class="mmi{intensity}">' +
              '<strong class="roman">{intensity}</strong></span>' +
            '</td>' +
            '<td>{level}</td>' +
            '<td>{population}</td>' +
          '</tr>',
          data
        );

        cities.forEach(function(city) {
          if (mmi === Number(AppUtil.round(city.mmi, 0))) {
            data = {
              name: city.name,
              population: AppUtil.addCommas(city.pop)
            };
            html += L.Util.template(
              '<tr class="city">' +
                '<td></td>' +
                '<td>{name}</td>' +
                '<td>{population}</td>' +
              '</tr>',
              data
            );
          }
        });
      }
    });

    return html;
  };

  /**
   * Create summary HTML.
   *
   * @return html {String}
   */
  _createSummary = function () {
    var data,
        html;

    data = {
      rows: _createRows(),
      url: 'https://earthquake.usgs.gov/earthquakes/eventpage/' + _eqid + '/pager'
    };
    html = '';

    if (data.rows) {
      html = L.Util.template(
        '<h4><a href="{url}">Population Exposure</a></h4>' +
        '<table>' +
          '<tr>' +
            '<th>MMI</th><th>Shaking / Selected Cities</th><th>Population</th>' +
          '<tr>' +
          '{rows}' +
        '</table>',
        data
      );
    }

    return html;
  };

  /**
   * Get aggregated population exposure and associated MMI/shaking (ASC order).
   *
   * @param json {Object}
   *
   * @return exposures {Object}
   */
  _getExposures = function (json) {
    var exposures,
        mmi;

    mmi = json.population_exposure.mmi;

    exposures = {
      mmi: mmi.reverse(),
      population: json.population_exposure.aggregated_exposure.reverse(),
      shaking: _getShakingValues(mmi)
    };

    return exposures;
  };

  /**
   * Get URL of JSON feed.
   *
   * @return url {String}
   */
  _getFeedUrl = function () {
    var contents,
        mainshock,
        products,
        url;

    mainshock = _app.Features.getFeature('mainshock');
    products = mainshock.json.properties.products;
    url = '';

    if (products.losspager) {
      contents = products.losspager[0].contents;

      if (contents['json/exposures.json']) {
        url = contents['json/exposures.json'].url;
      }
    }

    return url;
  };

  /**
   * Get shaking values (intensity/level) for an array of MMI values.
   *
   * @param mmis {Array}
   *
   * @return values {Array}
   */
  _getShakingValues = function (mmis) {
    var shaking,
        values;

    shaking = [
      {}, // no zero-level values
      {intensity: 'I',    level: 'Not felt'},
      {intensity: 'II',   level: 'Weak'},
      {intensity: 'III',  level: 'Weak'},
      {intensity: 'IV',   level: 'Light'},
      {intensity: 'V',    level: 'Moderate'},
      {intensity: 'VI',   level: 'Strong'},
      {intensity: 'VII',  level: 'Very strong'},
      {intensity: 'VIII', level: 'Severe'},
      {intensity: 'IX',   level: 'Violent'},
      {intensity: 'X+',   level: 'Extreme'}
    ];
    values = [];

    mmis.forEach(function (val) {
      values.push(shaking[val]);
    });

    return values;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;
    _eqid = null;

    _createRows = null;
    _createSummary = null;
    _getExposures = null;
    _getFeedUrl = null;
    _getShakingValues = null;

    _this = null;
  };

  /**
   * Initialize Feature (set properties that depend on external feed data).
   *
   * @param json {Object}
   *     feed data for Feature
   */
  _this.initFeature = function (json) {
    if (_this.url) { // url not set when feed is unavailable
      _this.exposures = _getExposures(json);
      _this.summary = _createSummary();
    } else {
      _this.summary = '';
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = PagerExposures;
