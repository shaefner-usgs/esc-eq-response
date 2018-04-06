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

      _StatusBar,

      _loadFeed;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _StatusBar = options.statusBar;

    _callback = options.callback;

    _loadFeed();
  };

  /**
   * Load GeoJson feed for significant eqs and return via _callback()
   */
  _loadFeed = function () {
    var errorMsg,
        url;

    // Alert user that feed is loading
    _StatusBar.addItem('significant', 'Significant Earthquakes');

    errorMsg = 'Error Loading Significant Earthquakes';
    url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson';

    Xhr.ajax({
      url: url,
      success: function (json) {
        _callback(json);

        _StatusBar.removeItem('significant');
      },
      error: function (status, xhr) {
        if (xhr.responseText) {
          console.error(xhr.responseText);
        }

        _StatusBar.addError('significant', errorMsg);
      },
      ontimeout: function (xhr) {
        console.error(xhr);

        errorMsg += '<strong>Request timed out</strong>';
        _StatusBar.addError('significant', errorMsg);
      }
    });
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

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

    html = '<select class="significant" tabindex="1">';
    html += '<option value="" disabled="" selected="">Significant Earthquakes in the Past Month (UTC)</option>';
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
