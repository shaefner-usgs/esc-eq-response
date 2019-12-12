'use strict';


/**
 * Create PAGER Cities Feature
 *
 * @param options {Object}
 *   {
 *     app: {Object}, // Application
 *   }
 *
 * @return _this {Object}
 *   {
 *     cities: {Object},
 *     dependencies: {Array},
 *     destroy: {Function},
 *     id: {String},
 *     initFeature: {Function},
 *     name: {String),
 *     summary: {String},
 *     title: {String},
 *     url: {String}
 *   }
 */
var PagerCities = function (options) {
  var _this,
      _initialize,

      _app,

      _getFeedUrl,
      _getSummary;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;

    _this.dependencies = [
      'pager-exposures'
    ];
    _this.id = 'pager-cities';
    _this.name = 'PAGER Cities';
    _this.title = 'Population Exposure';
    _this.url = _getFeedUrl();
  };

  /**
   * Get URL of json feed
   *
   * @return url {String}
   */
  _getFeedUrl = function () {
    var mainshock,
        products,
        url;

    mainshock = _app.Features.getFeature('mainshock');
    products = mainshock.json.properties.products;
    url = '';

    if (products.losspager) {
      url = products.losspager[0].contents['json/cities.json'].url;
    }

    return url;
  };

  /**
   * Get summary HTML for Feature
   *
   * @param json {Object}
   *
   * @return summary {String}
   */
  _getSummary = function (json) {
    var cities,
        cityMmi,
        exposures,
        level,
        population,
        summary;

    cities = json.onepager_cities;
    exposures = _app.Features.getFeature('pager-exposures').exposures;
    summary = '<table>' +
      '<tr><th>MMI</th><th>Shaking / Selected Cities</th><th>Population</th><tr>';

    exposures.mmi.forEach(function(mmi, i) {
      population = exposures.population[i];
      if (mmi >= 2 && population !== 0) { // skip values below 2 and when nobody affected
        level = _app.AppUtil.getShakingLevel(mmi);
        summary += '<tr>' +
            '<td class="impact-bubbles"><span class="mmi' + level.intensity + '">' +
              '<strong class="roman">' + level.intensity + '</strong></span></td>' +
            '<td>' + level.shaking + '</td>' +
            '<td>' + _app.AppUtil.addCommas(population) + '</td>' +
          '</tr>';
        cities.forEach(function(city) {
          cityMmi = Number(_app.AppUtil.round(city.mmi, 0));
          if (cityMmi === mmi) {
            summary += '<tr class="city">' +
                '<td></td>' +
                '<td>' + city.name + '</td>' +
                '<td>' + _app.AppUtil.addCommas(city.pop) + '</td>' +
              '</tr>';
          }
        });
      }
    });
    summary += '</table>';

    return summary;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Destroy this Class to aid in garbage collection
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;

    _getFeedUrl = null;
    _getSummary = null;

    _this = null;
  };

  /**
   * Create Feature - set properties that depend on external feed data
   *
   * @param json {Object}
   *     feed data for Feature
   */
  _this.initFeature = function (json) {
    _this.cities = json.onepager_cities;
    _this.summary = _getSummary(json);
  };

  _initialize(options);
  options = null;
  return _this;
};


module.exports = PagerCities;
