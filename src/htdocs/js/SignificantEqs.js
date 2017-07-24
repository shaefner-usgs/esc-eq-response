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
 *     statusBar: {Object} // StatusBar instance
 *   }
 */
var SignificantEqs = function (options) {
  var _this,
      _initialize,

      _callback,
      _statusBar,

      _loadFeed;


  _this = {};

  _initialize = function (options) {
    options = options || {};
    _callback = options.callback;
    _statusBar = options.statusBar;

    _loadFeed();
  };

  /**
   * Load GeoJson feed for significant eqs and return via _callback()
   */
  _loadFeed = function () {
    var url;

    // Alert user that feed is loading (removed by EditPane class)
    _statusBar.addItem('significant', 'Significant Earthquakes');

    url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson';

    Xhr.ajax({
      url: url,
      success: function (json) {
        _callback(json);
      },
      error: function (status, xhr) {
        console.error(xhr.responseText);

        _statusBar.addError('significant', 'Error Loading Significant Earthquakes');
      }
    });
  };

  /**
   * Get html for pulldown menu of significant eqs
   *
   * @param json {Object}
   *     GeoJson data
   *
   * @return html {String}
   */
  _this.getHtml = function (json) {
    var date,
        html,
        mag,
        props;

    html = '<select class="significant">';
    html += '<option value="">Significant Earthquakes in the Past Month (UTC)</option>';
    if (json.features) {
      json.features.forEach(function(feature) {
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
