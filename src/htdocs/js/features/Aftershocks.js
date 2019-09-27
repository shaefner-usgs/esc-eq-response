'use strict';


var Earthquakes = require('features/util/Earthquakes');


/**
 * Create Aftershocks Feature
 *
 * @param options {Object}
 *   {
 *     app: {Object}, // Application
 *     eqid: {String} // Mainshock event id
 *   }
 *
 * @return _this {Object}
 *   {
 *     getFeedUrl: {Function},
 *     id: {String},
 *     initFeature: {Function},
 *     mapLayer: {L.layer},
 *     name: {String},
 *     plotDescription: {String},
 *     plotTraces: {Object},
 *     showLayer: {Boolean},
 *     sliderData: {Array},
 *     summary: {String},
 *     title: {String},
 *     zoomToLayer: {Boolean}
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
    options = options || {};

    _app = options.app;
    _eqid = options.eqid;
    _mainshock = _app.Features.getFeature('mainshock');

    _this.id = 'aftershocks';
    _this.name = 'Aftershocks';
    _this.showLayer = true;
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
    var count,
        duration,
        mag,
        magThreshold,
        mostRecentEq,
        mostRecentEqTime,
        summary;

    count = json.metadata.count;
    summary = _Earthquakes.getDescription();

    if (count > 0) {
      magThreshold = Math.floor(_mainshock.json.properties.mag - 2.5);
      mostRecentEq = _app.AppUtil.pick(_Earthquakes.eqList, [_Earthquakes.mostRecentEqId]);
      mostRecentEqTime = mostRecentEq[_Earthquakes.mostRecentEqId].isoTime;

      duration = _app.AppUtil.round(
        _app.AppUtil.Moment.duration(_app.AppUtil.Moment.utc() -
        _app.AppUtil.Moment.utc(mostRecentEqTime)).asDays() , 1
      ) + ' days';

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
      if (count > 1) {
        summary += '<h3>Most Recent Aftershock</h3>';
        summary += '<p>The most recent aftershock was <strong>' + duration +
          ' ago</strong>.';
        summary += _Earthquakes.getListTable(mostRecentEq);
      }
      summary += '<h3>M <span class="mag">' + mag + '</span>+ Earthquakes ' +
         '(<span class="num">' + _Earthquakes.sliderData[mag]  + '</span>)</h3>';
      summary += _Earthquakes.getSlider(mag);
      summary += _Earthquakes.getListTable(_Earthquakes.eqList, mag);
    }

    return summary;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Get url of data feed
   *
   * @return {String}
   */
  _this.getFeedUrl = function () {
    var urlParams;

    urlParams = {
      latitude: _mainshock.json.geometry.coordinates[1],
      longitude: _mainshock.json.geometry.coordinates[0],
      maxradiuskm: Number(_app.AppUtil.getParam('as-dist')),
      minmagnitude: Number(_app.AppUtil.getParam('as-mag')) - 0.05, // account for rounding to tenths
      starttime: _app.AppUtil.Moment(_mainshock.json.properties.time + 1000)
        .utc().toISOString().slice(0, -5)
    };

    return Earthquakes.getFeedUrl(urlParams);
  };

  /**
   * Create Feature - set properties that depend on external feed data
   *
   * @param json {Object}
   *     feed data for Feature
   */
  _this.initFeature = function (json) {
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
