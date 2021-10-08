/* global L */
'use strict';


var AppUtil = require('util/AppUtil');


/**
 * Create PAGER Exposures Feature.
 *
 * @param options {Object}
 *   {
 *     app: {Object} Application
 *   }
 *
 * @return _this {Object}
 *   {
 *     create: {Function}
 *     dependencies: {Array}
 *     destroy: {Function}
 *     exposures: {Object}
 *     id: {String}
 *     name: {String)
 *     reset: {Function}
 *     setFeedUrl: {Function}
 *     summary: {String}
 *     url: {String}
 *   }
 */
var PagerExposures = function (options) {
  var _this,
      _initialize,

      _app,

      _createRows,
      _createSummary,
      _getExposures;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;

    _this.dependencies = [
      'pager-cities'
    ];
    _this.id = 'pager-exposures';
    _this.name = 'PAGER Exposures';
    _this.summary = null;
    _this.url = '';
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

    mmis.forEach((mmi, i) => {
      if (mmi >= 2 && population[i] > 0) { // skip mmi below 2 and when nobody affected
        data = {
          intensity: shaking[i].intensity,
          level: shaking[i].level,
          population: AppUtil.addCommas(population[i])
        };
        html += L.Util.template(
          '<tr>' +
            '<td>' +
              '<span class="impact-bubble mmi{intensity}">' +
                '<strong class="roman">{intensity}</strong>' +
              '</span>' +
            '</td>' +
            '<td>{level}</td>' +
            '<td>{population}</td>' +
          '</tr>',
          data
        );

        cities.forEach(city => {
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
        eqid,
        html;

    eqid = AppUtil.getParam('eqid');
    data = {
      rows: _createRows(),
      url: `https://earthquake.usgs.gov/earthquakes/eventpage/${eqid}/pager`
    };
    html = '';

    if (data.rows) {
      html = L.Util.template(
        '<h4><a href="{url}">Population Exposure</a></h4>' +
        '<table>' +
          '<tr>' +
            '<th>MMI</th><th>Selected Cities</th><th>Population</th>' +
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
      shaking: AppUtil.getShakingValues(mmi)
    };

    return exposures;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Create Feature (set properties that depend on external feed data).
   *
   * @param json {Object}
   *     feed data for Feature
   */
  _this.create = function (json) {
    _this.exposures = _getExposures(json);
    _this.summary = _createSummary();
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;

    _createRows = null;
    _createSummary = null;
    _getExposures = null;

    _this = null;
  };

  /**
   * Set the JSON feed's URL.
   */
  _this.setFeedUrl = function () {
    var contents,
        mainshock,
        products;

    mainshock = _app.Features.getFeature('mainshock');
    products = mainshock.json.properties.products;

    if (products.losspager) {
      contents = products.losspager[0].contents;

      if (contents['json/exposures.json']) {
        _this.url = contents['json/exposures.json'].url;
      }
    }
  };

  /**
   * Reset to initial state.
   */
  _this.reset = function () {
    _this.summary = null;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = PagerExposures;
