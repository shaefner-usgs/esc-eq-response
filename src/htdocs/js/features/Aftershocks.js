'use strict';


var Earthquakes = require('features/util/Earthquakes');


/**
 * Create Aftershocks feature
 *
 * @param options {Object}
 *   {
 *     app: {Object}, // application props / methods
 *     eqid: {String} // mainshock event id
 *   }
 */
var Aftershocks = function (options) {
  var _this,
      _initialize,

      _app,
      _eqid,
      _mainshock,
      _Earthquakes,

      _getProbabilities,
      _getSummary;


  _this = {};

  _initialize = function (options) {
    var urlParams;

    options = options || {};

    _app = options.app;
    _eqid = options.eqid;
    _mainshock = _app.Features.getFeature('mainshock');

    urlParams = {
      latitude: _mainshock.json.geometry.coordinates[1],
      longitude: _mainshock.json.geometry.coordinates[0],
      maxradiuskm: Number(_app.AppUtil.getParam('as-dist')),
      minmagnitude: Number(_app.AppUtil.getParam('as-mag')) - 0.05, // account for rounding to tenths
      starttime: _app.AppUtil.Moment(_mainshock.json.properties.time + 1000)
        .utc().toISOString().slice(0, -5)
    };

    _this.displayLayer = true;
    _this.id = 'aftershocks';
    _this.name = 'Aftershocks';
    _this.url = _app.Features.getEqFeedUrl(urlParams);
    _this.zoomToLayer = true;
  };

  /**
   * Get aftershock probabilities HTML
   *
   * @return html {String}
   */
  _getProbabilities = function () {
    var data,
        html,
        oaf,
        probability,
        range,
        url;

    html = '';
    oaf = _mainshock.json.properties.products.oaf;
    url = 'https://earthquake.usgs.gov/earthquakes/eventpage/' + _eqid + '/oaf/forecast';

    if (oaf) {
      data = JSON.parse(oaf[0].contents[''].bytes);
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

  /**
   * Get summary HTML
   *
   * @param json {Object}
   *
   * @return summary {String}
   */
  _getSummary = function (json) {
    var mag,
        magThreshold,
        mostRecentEq,
        summary;

    summary = _Earthquakes.getDescription();

    if (json.metadata.count > 0) {
      magThreshold = Math.floor(_mainshock.json.properties.mag - 2.5);
      mostRecentEq = _app.AppUtil.pick(_Earthquakes.eqList, [_Earthquakes.mostRecentEqId]);

      mag = Math.floor(Math.max(
        magThreshold,
        _app.AppUtil.getParam('as-mag')
      ));

      // Check if there's eq data for mag threshold; if not, decr mag by 1
      while (!_Earthquakes.sliderData[mag]) {
        mag --;
      }

      summary += '<div class="bins">';
      summary += _Earthquakes.getBinnedTable('first');
      summary += _Earthquakes.getBinnedTable('past');
      summary += '</div>';
      summary += _getProbabilities();
      summary += '<h3>Most Recent Aftershock</h3>';
      summary += _Earthquakes.getListTable(mostRecentEq);
      summary += '<h3>M <span class="mag">' + mag + '</span>+ Earthquakes ' +
         '(<span class="num">' + _Earthquakes.sliderData[mag]  + '</span>)</h3>';
      summary += _Earthquakes.getSlider(mag);
      summary += _Earthquakes.getListTable(_Earthquakes.eqList, magThreshold);
    }

    return summary;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Create feature (map layer, plot data, summary)
   *   invoked via Ajax callback in Features.js after json feed is loaded
   *
   * @param json {Object}
   *     feed data for feature
   */
  _this.createFeature = function (json) {
    _Earthquakes = Earthquakes({
      app: _app,
      id: _this.id,
      json: json
    });

    _this.mapLayer = _Earthquakes.mapLayer;
    _this.plotDescription = _Earthquakes.getDescription();
    _this.plotTraces = _Earthquakes.plotTraces;
    _this.sliderData = _Earthquakes.sliderData; // for eq mag filters on summary
    _this.summary = _getSummary(json);
    _this.title = _this.name + ' (' + json.metadata.count + ')';
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Aftershocks;
