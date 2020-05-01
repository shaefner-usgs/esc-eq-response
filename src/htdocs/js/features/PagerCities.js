'use strict';


var AppUtil = require('AppUtil');


/**
 * Create PAGER Cities Feature
 *
 * @param options {Object}
 *   {
 *     app: {Object}, // Application
 *     eqid: {String} // Mainshock event id
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
 *     url: {String}
 *   }
 */
var PagerCities = function (options) {
  var _this,
      _initialize,

      _app,
      _eqid,

      _compare,
      _getFeedUrl,
      _getSummary;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _eqid = options.eqid;

    _this.dependencies = [
      'pager-exposures'
    ];
    _this.id = 'pager-cities';
    _this.name = 'PAGER Cities';
    _this.summary = true;
    _this.url = _getFeedUrl();
  };

  /**
   * Comparison function to sort an array of cities by population (DESC)
   *
   * @params a, b {Objects}
   *     Objects to compare/sort
   *
   * @return {Integer}
   */
  _compare = function (a, b) {
    if (a.pop > b.pop) {
      return -1;
    } else if (b.pop > a.pop) {
      return 1;
    }

    return 0;
  };

  /**
   * Get URL of json feed
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
      if (contents['json/cities.json']) {
        url = contents['json/cities.json'].url;
      }
    }

    return url;
  };

  /**
   * Get summary HTML for Feature
   *
   * @param cities {Array}
   *
   * @return summary {String}
   */
  _getSummary = function (cities) {
    var cityMmi,
        exposures,
        mmi,
        population,
        rows,
        shaking,
        summary,
        url;

    exposures = _app.Features.getFeature('pager-exposures').exposures;
    rows = '';
    url = 'https://earthquake.usgs.gov/earthquakes/eventpage/' + _eqid +
      '/pager';

    // Sort values in descending order for display purposes
    mmi = exposures.mmi.reverse();
    population = exposures.population.reverse();
    shaking = exposures.shaking.reverse();

    mmi.forEach(function(mmi, i) {
      if (mmi >= 2 && population[i] > 0) { // skip mmi below 2 and when nobody affected
        rows += '<tr>' +
            '<td class="impact-bubbles"><span class="mmi' + shaking[i].intensity + '">' +
              '<strong class="roman">' + shaking[i].intensity + '</strong></span></td>' +
            '<td>' + shaking[i].level + '</td>' +
            '<td>' + AppUtil.addCommas(population[i]) + '</td>' +
          '</tr>';
        cities.forEach(function(city) {
          cityMmi = Number(AppUtil.round(city.mmi, 0));
          if (cityMmi === mmi) {
            rows += '<tr class="city">' +
                '<td></td>' +
                '<td>' + city.name + '</td>' +
                '<td>' + AppUtil.addCommas(city.pop) + '</td>' +
              '</tr>';
          }
        });
      }
    });

    if (rows) {
      summary = '<h4><a href="' + url + '">Population Exposure</a></h4>';
      summary += '<table>' +
        '<tr><th>MMI</th><th>Shaking / Selected Cities</th><th>Population</th><tr>';
      summary += rows;
      summary += '</table>';
    }

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
   * Init Feature (set properties that depend on external feed data)
   *
   * @param json {Object}
   *     feed data for Feature
   */
  _this.initFeature = function (json) {
    if (_this.url) { // url not set when feed is unavailable
      _this.cities = json.onepager_cities.sort(_compare);
      _this.summary = _getSummary(_this.cities);
    } else {
      _this.summary = '';
    }
  };

  _initialize(options);
  options = null;
  return _this;
};


module.exports = PagerCities;
