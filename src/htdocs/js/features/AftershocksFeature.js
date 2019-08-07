'use strict';


var Earthquakes = require('features/Earthquakes');


/**
 * Creates Aftershocks feature
 *
 * @param options {Object}
 *   {
 *     json: {Object}, // geojson data for feature
 *     mainshockJson: {Object}, // mainshock geojson: magnitude, time, etc.
 *     name: {String} // layer name
 *   }
 */
var Aftershocks = function (options) {
  var _this,
      _initialize,

      _app,
      _eqid,
      _mag,
      _magThreshold,
      _oaf,
      _Earthquakes,

      _getName,
      _getProbabilities;


  _this = {};

  _initialize = function (options) {
    // Unique id; note that value is "baked into" app's js/css
    var id = 'aftershocks';

    options = options || {};

    _app = options.app;
    _eqid = options.mainshockJson.id;
    _mag = options.mainshockJson.properties.mag;
    _magThreshold = Math.floor(_mag - 2.5);
    _oaf = options.mainshockJson.properties.products.oaf;

    _Earthquakes = Earthquakes({
      app: _app,
      id: id,
      json: options.json,
      mainshockJson: options.mainshockJson
    });

    _this.displayLayer = true;
    _this.id = id;
    _this.name = _getName();
    _this.zoomToLayer = true;
  };

  /**
   * Get layer name of feature (adds number of features to name)
   *
   * @return {String}
   */
  _getName = function () {
    return options.name + ' (' + options.json.metadata.count + ')';
  };

  /**
   * Get aftershock probabilities HTML
   */
  _getProbabilities = function () {
    var data,
        html,
        probability,
        range,
        url;

    html = '';
    url = 'https://earthquake.usgs.gov/earthquakes/eventpage/' + _eqid + '/oaf/forecast';

    if (_oaf) {
      data = JSON.parse(_oaf[0].contents[''].bytes);
      data.forecast.forEach(function(period) {
        if (period.label === data.advisoryTimeFrame) { // show 'primary emphasis' period
          period.bins.forEach(function(bin) {
            if (bin.probability < 0.01) {
              probability = '&lt; 1%';
            } else if (bin.probability > 0.99) {
              probability = '&gt; 99%';
            } else {
              probability = _app.AppUtil.round(100 * bin.probability, 0) + '%';
            }
            if (bin.p95minimum === 0 && bin.p95maximum === 0) {
              range = 0;
            } else {
              range = bin.p95minimum  + '&ndash;' + bin.p95maximum;
            }
            html += '<a href="' + url + '"><h4>M ' + bin.magnitude + '+</h4>' +
              '<ul>' +
                '<li class="probability">' + probability + '</li>' +
                '<li class="expected"><abbr title="Expected number of ' +
                  'aftershocks">' + range + '</abbr></li>' +
              '</ul></a>';
          });
        }
      });
    }

    if (html) {
      html = '<h3>Aftershock Probabilities</h3>' +
        '<p>Probability of one or more aftershocks in the specified ' +
          'magnitude range during the <strong>next ' + data.advisoryTimeFrame.toLowerCase() +
          '</strong>, based on ' + data.model.name + '. The expected number ' +
          'of aftershocks (95% confidence range) is also included.</p>' +
        '<div class="probabilities">' + html + '</div>';
    }

    return html;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Get map layer of feature
   *
   * @return {L.FeatureGroup}
   */
  _this.getMapLayer = function () {
    return _Earthquakes.getMapLayer();
  };

  /**
   * Get feature's data for plots pane
   *
   * @return {Object}
   */
  _this.getPlotData = function () {
    return {
      detailsHtml: _Earthquakes.getDetails(),
      plotdata: _Earthquakes.getPlotData()
    };
  };

  /**
   * Get feature's data for summary pane
   *
   * @return {Object}
   */
  _this.getSummaryData = function () {
    return {
      bins: _Earthquakes.getBinnedData(),
      detailsHtml: _Earthquakes.getDetails(),
      lastId: _Earthquakes.getLastId(),
      list: _Earthquakes.getList(),
      magThreshold: _magThreshold,
      probabilities: _getProbabilities()
    };
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Aftershocks;
