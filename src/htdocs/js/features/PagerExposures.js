/* global L */
'use strict';


var AppUtil = require('util/AppUtil');


/**
 * Create the PAGER Exposures Feature, which is a sub-Feature of the Mainshock.
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

      _getExposures,
      _getRows,
      _getSummary;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;

    Object.assign(_this, {
      dependencies: [
        'pager-cities'
      ],
      id: 'pager-exposures',
      name: 'PAGER Exposures',
      summary: null,
      url: ''
    });
  };

  /**
   * Get the aggregated population exposure and associated MMI/shaking (ASC).
   *
   * @param json {Object}
   *
   * @return {Object}
   */
  _getExposures = function (json) {
    var mmi = json.population_exposure.mmi,
        population = json.population_exposure.aggregated_exposure.map(pop =>
          AppUtil.roundThousands(pop)
        );

    return {
      mmi: mmi.reverse(),
      population: population.reverse(),
      shaking: AppUtil.getShakingValues(mmi)
    };
  };

  /**
   * Get the HTML for the table rows.
   *
   * @return html {String}
   */
  _getRows = function () {
    var data,
        cities = _app.Features.getFeature('pager-cities').cities,
        html = '',
        mmis = _this.exposures.mmi,
        population = _this.exposures.population,
        shaking = _this.exposures.shaking;

    mmis.forEach((mmi, i) => {
      if (mmi >= 2 && Number(population[i]) !== 0) { // skip mmi below 2 and when nobody affected
        data = {
          intensity: shaking[i].intensity,
          level: shaking[i].level,
          population: population[i]
        };
        html += L.Util.template(
          '<tr>' +
            '<td>' +
              '<span class="mmi{intensity} impact-bubble">' +
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
              population: city.pop
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
   * Get the HTML for the summary.
   *
   * @return html {String}
   */
  _getSummary = function () {
    var data = {
          rows: _getRows()
        },
        html = '';

    if (data.rows) {
      html = L.Util.template(
        '<h3>Population Exposure</h3>' +
        '<table>' +
          '<thead>' +
            '<tr>' +
              '<th>' +
                '<abbr title="Modified Mercalli Intensity">MMI</abbr>' +
              '</th>' +
              '<th>Selected Cities</th>' +
              '<th>Population</th>' +
            '<tr>' +
          '</thead>' +
          '<tbody>' +
            '{rows}' +
          '</tbody>' +
        '</table>',
        data
      );
    }

    return html;
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
    _this.summary = _getSummary();
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;

    _getExposures = null;
    _getRows = null;
    _getSummary = null;

    _this = null;
  };

  /**
   * Set the JSON feed's URL.
   */
  _this.setFeedUrl = function () {
    var contents,
        mainshock = _app.Features.getFeature('mainshock'),
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
