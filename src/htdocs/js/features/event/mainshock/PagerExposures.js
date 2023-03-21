/* global L */
'use strict';


var AppUtil = require('util/AppUtil');


/**
 * Create the PAGER Exposures Feature, a sub-Feature of the Mainshock.
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *     }
 *
 * @return _this {Object}
 *     {
 *       addData: {Function}
 *       data: {Object}
 *       dependencies: {Array}
 *       destroy: {Function}
 *       id: {String}
 *       name: {String)
 *       summary: {String}
 *       url: {String}
 *     }
 */
var PagerExposures = function (options) {
  var _this,
      _initialize,

      _app,

      _fetch,
      _getData,
      _getRows,
      _getSummary,
      _getUrl;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;

    _this.data = {};
    _this.dependencies = ['pager-cities'];
    _this.id = 'pager-exposures';
    _this.name = 'PAGER Exposures';
    _this.summary = '';
    _this.url = _getUrl();

    _fetch();
  };

  /**
   * Fetch the feed data.
   */
  _fetch = function () {
    if (_this.url) {
      L.geoJSON.async(_this.url, {
        app: _app,
        feature: _this
      });
    }
  };

  /**
   * Get the data used to create the content.
   *
   * @param json {Object}
   *
   * @return {Object}
   */
  _getData = function (json) {
    var exposure = json.population_exposure || {},
        mmi = exposure.mmi || [],
        population = exposure.aggregated_exposure?.map(pop =>
          AppUtil.roundThousands(pop)
        ) || [];

    return {
      mmi: mmi.reverse(),
      population: population.reverse(),
      shaking: AppUtil.getShakingValues(mmi)
    };
  };

  /**
   * Get the HTML content for the table rows.
   *
   * @return html {String}
   */
  _getRows = function () {
    var data,
        cities = _app.Features.getFeature('pager-cities').data,
        html = '',
        mmis = _this.data.mmi,
        population = _this.data.population,
        shaking = _this.data.shaking;

    mmis.forEach((mmi, i) => {
      if (mmi >= 2 && parseInt(population[i]) !== 0) { // skip if nobody affected
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

        cities.forEach((city = {}) => {
          if (mmi === Math.round(city.mmi)) {
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
   * Get the HTML content for the SummaryPane.
   *
   * @return html {String}
   */
  _getSummary = function () {
    var rows = _getRows(),
        html = '';

    if (rows) {
      html =
        '<h3>Population Exposure</h3>' +
        '<table class="exposures">' +
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
            rows +
          '</tbody>' +
        '</table>';
    }

    return html;
  };

  /**
   * Get the JSON feed's URL.
   *
   * @return url {String}
   */
  _getUrl = function () {
    var mainshock = _app.Features.getFeature('mainshock'),
        product = mainshock.data.products?.losspager || [],
        contents = product[0]?.contents || {},
        url = '';

    if (contents['json/exposures.json']) {
      url = contents['json/exposures.json'].url || '';
    }

    return url;
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
    _this.data = _getData(json);
    _this.summary = _getSummary();
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;

    _fetch = null;
    _getData = null;
    _getRows = null;
    _getSummary = null;
    _getUrl = null;

    _this = null;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = PagerExposures;
