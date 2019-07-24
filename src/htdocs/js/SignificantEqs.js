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
      _json,

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
    _StatusBar.addItem('Significant Earthquakes');

    errorMsg = '<h4>Error Loading Significant Earthquakes</h4><ul>';
    url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson';

    Xhr.ajax({
      url: url,
      success: function (json) {
        _json = json;
        _callback();

        _StatusBar.removeItem('Significant Earthquakes');
      },
      error: function (status, xhr) {
        // Show response in console and add additional info to error message
        if (xhr.responseText) {
          console.error(xhr.responseText);
        }
        if (status) {
          if (status.message) {
            errorMsg += '<li>' + status.message + '</li>';
          }
          else {
            errorMsg += '<li>http status code: ' + status + '</li>';
          }
        }

        errorMsg += '</ul>';
        _StatusBar.addError('Significant Earthquakes', errorMsg);
      },
      ontimeout: function (xhr) {
        console.error(xhr);

        errorMsg += '<li>Request timed out (can&rsquo;t connect to ' +
          'earthquake.usgs.gov)</li></ul>';
        //errorMsg += '<a href="#" class="reload"></a>';

        _StatusBar.addError('Significant Earthquakes', errorMsg);
      },
      timeout: 20000
    });
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Get html for pulldown menu of significant eqs
   *
   * @return html {String}
   */
  _this.getHtml = function () {
    var date,
        html,
        list,
        mag,
        props,
        sel,
        selCurrent;

    sel = ' selected="selected"';

    if (_json.features) {
      _json.features.forEach(function(feature) {
        props = feature.properties;
        date = Moment.utc(props.time).format('MMM D HH:mm:ss');
        mag = AppUtil.round(props.mag, 1);

        selCurrent = '';
        if (feature.id === AppUtil.getParam('eqid')) {
          selCurrent = sel;
          sel = '';
        }

        list += '<option value="' + feature.id + '"' + selCurrent + '>' +
            'M ' + mag + ' - ' + props.place + ' (' + date + ')' +
          '</option>';
      });

      html = '<select class="significant" tabindex="1">';
      html += '<option value="" disabled="disabled"' + sel + '>Significant ' +
        'Earthquakes in the Past Month (UTC)</option>';
      html += list;
      html += '</select>';
    }

    return html;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = SignificantEqs;
