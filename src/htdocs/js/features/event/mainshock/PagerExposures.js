/* global L */
'use strict';


var AppUtil = require('util/AppUtil');


/**
 * Create the PAGER Exposures Feature, a sub-Feature of the Mainshock (and
 * co-Feature of PAGER Cities).
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *     }
 *
 * @return _this {Object}
 *     {
 *       content: {String}
 *       data: {Object}
 *       dependencies: {Array}
 *       destroy: {Function}
 *       id: {String}
 *       name: {String)
 *       render: {Function}
 *       url: {String}
 *     }
 */
var PagerExposures = function (options) {
  var _this,
      _initialize,

      _app,

      _fetch,
      _getContent,
      _getData,
      _getRows,
      _getUrl;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;

    _this.content = '';
    _this.data = {};
    _this.dependencies = ['pager-cities'];
    _this.id = 'pager-exposures';
    _this.name = 'PAGER Exposures';
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
   * Get the HTML content for the SummaryPane.
   *
   * @return html {String}
   */
  _getContent = function () {
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
      if (mmi >= 2 && parseInt(population[i], 10) > 0) {
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
   * Get the JSON feed's URL.
   *
   * @return url {String}
   */
  _getUrl = function () {
    var mainshock = _app.Features.getMainshock(),
        product = mainshock.data.eq.products?.losspager || [],
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
   * Destroy this Class.
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;

    _fetch = null;
    _getContent = null;
    _getData = null;
    _getRows = null;
    _getUrl = null;

    _this = null;
  };

  /**
   * Render the Feature.
   *
   * @param json {Object} optional; default is {}
   */
  _this.render = function (json = {}) {
    if (AppUtil.isEmpty(_this.data)) { // initial render
      _this.data = _getData(json);
      _this.content = _getContent();
    }

    _app.SummaryPane.addContent(_this);
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = PagerExposures;
