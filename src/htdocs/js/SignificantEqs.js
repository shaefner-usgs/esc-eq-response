'use strict';


var Xhr = require('util/Xhr');


/**
 * Factory for getting significant earthquakes and creating html pulldown menu
 *
 * @param options {Object}
 *   {
 *     app: {Object}, // application props / methods
 *   }
 */
var SignificantEqs = function (options) {
  var _this,
      _initialize,

      _app,
      _json,

      _loadFeed;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;

    _loadFeed();
  };

  /**
   * Load GeoJson feed for significant eqs
   */
  _loadFeed = function () {
    var errorMsg,
        url;

    // Alert user that feed is loading
    _app.StatusBar.addLoadingMsg({
      id: 'significant',
      name: 'Significant Earthquakes'
    });

    errorMsg = '<h4>Error Loading Significant Earthquakes</h4><ul>';
    url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson';

    Xhr.ajax({
      url: url,
      success: function (json) {
        _json = json;
        _this.addSignificantEqs();

        _app.StatusBar.remove('significant');
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
        _app.StatusBar.addError({id: 'significant'}, errorMsg);
      },
      ontimeout: function (xhr) {
        console.error(xhr);

        errorMsg += '<li>Request timed out (can&rsquo;t connect to ' +
          'earthquake.usgs.gov)</li></ul>';
        //errorMsg += '<a href="#" class="reload"></a>';

        _app.StatusBar.addError({id: 'significant'}, errorMsg);
      },
      timeout: 20000
    });
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add list of significant earthquakes pulldown menu
   */
  _this.addSignificantEqs = function () {
    var div,
        refNode,
        selectMenu,
        significant;

    refNode = document.querySelector('label[for=eqid]');
    selectMenu = _this.getHtml();

    if (selectMenu) {
      div = document.createElement('div');
      div.innerHTML = selectMenu;
      refNode.parentNode.insertBefore(div, refNode);

      // Add listener here b/c we have to wait til it exists
      significant = document.querySelector('.significant');
      significant.addEventListener('change', _app.EditPane.selSignificantEq);
    }
  };

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
        date = _app.AppUtil.Moment.utc(props.time).format('MMM D HH:mm:ss');
        mag = _app.AppUtil.round(props.mag, 1);

        selCurrent = '';
        if (feature.id === _app.AppUtil.getParam('eqid')) {
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
