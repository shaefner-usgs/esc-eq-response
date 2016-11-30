'use strict';


var AppUtil = require('AppUtil'),
    Moment = require('moment'),
    Xhr = require('util/Xhr');

/**
 * Factory for getting significant earthquakes and creating html pulldown menu
 *
 * @param options {Object}
 *   {
 *     callback: {Function},
 *     loadingModule: {Object} // LoadingModule instance
 *   }
 */
var SignificantEqs = function (options) {
  var _this,
      _initialize,

      _callback,
      _loadingModule,

      _loadFeed;


  _this = {};

  _initialize = function (options) {
    options = options || {};
    _callback = options.callback;
    _loadingModule = options.loadingModule;

    _loadFeed();
  };

  /**
   * Load GeoJson feed for significant eqs and return via _callback()
   */
  _loadFeed = function () {
    var url;

    // Alert user that feed is loading (removed by EditPane class)
    _loadingModule.addItem('significant', 'Significant Earthquakes');

    url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson';

    Xhr.ajax({
      url: url,
      success: function (data) {
        _callback(data);
      },
      error: function (status) {
        console.log(status);
        _loadingModule.addError('significant', 'Error Loading Significant Earthquakes');
      }
    });
  };

  /**
   * Get html for pulldown menu of significant eqs
   *
   * @param data {Object}
   *     GeoJson data
   *
   * @return html {String}
   */
  _this.getHtml = function (data) {
    var date,
        html,
        mag,
        props;

    html = '<select class="significant">';
    html += '<option value="">Significant Earthquakes in the Past Month (UTC)</option>';
    if (data.features) {
      data.features.forEach(function(feature) {
        props = feature.properties;
        date = Moment.utc(props.time).format('MMM D HH:mm:ss');
        mag = AppUtil.round(props.mag, 1);

        html += '<option value="' + feature.id + '">' +
            'M ' + mag + ' - ' + props.place + ' (' + date + ')' +
          '</option>';
      });
      html += '</select>';
    }

    return html;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = SignificantEqs;
