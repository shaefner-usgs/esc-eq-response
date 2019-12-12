'use strict';


var AppUtil = require('AppUtil'),
    Xhr = require('util/Xhr');


/**
 * Factory for loading significant earthquakes and creating a pulldown menu
 *
 * @param options {Object}
 *   {
 *     app: {Object} // Application
 *   }
 *
 * @return _this {Object}
 *   {
 *     addSignificantEqs: {Function}
 *   }
 */
var SignificantEqs = function (options) {
  var _this,
      _initialize,

      _app,
      _json,

      _getSelectMenu,
      _loadJson;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;

    _loadJson();
  };

  /**
   * Get significant earthquakes pulldown menu
   *
   * @return el {Element}
   */
  _getSelectMenu = function () {
    var date,
        el,
        list,
        mag,
        props,
        selected,
        selectedStatus;

    list = '';
    selected = ' selected="selected"';

    if (_json.features) {
      _json.features.forEach(function(feature) {
        props = feature.properties;

        date = AppUtil.Moment.utc(props.time).format('MMM D HH:mm:ss');
        mag = AppUtil.round(props.mag, 1);

        selectedStatus = '';
        if (feature.id === AppUtil.getParam('eqid')) {
          selectedStatus = selected;
          selected = ''; // used to set default option to unselected since match found
        }

        list += '<option value="' + feature.id + '"' + selectedStatus + '>' +
          'M ' + mag + ' - ' + props.place + ' (' + date + ')</option>';
      });

      list = '<option value="" disabled="disabled"' + selected + '>' +
        'Significant Earthquakes in the Past Month (UTC)</option>' + list;

      el = document.createElement('select');
      el.classList.add('significant');
      el.innerHTML = list;
      el.tabIndex = 1;
    }

    return el;
  };

  /**
   * Load significant earthquakes feed
   */
  _loadJson = function () {
    var errorMsg,
        url;

    // Alert user that feed is loading
    _app.StatusBar.addItem({
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
   * Add significant earthquakes pulldown menu to edit pane
   */
  _this.addSignificantEqs = function () {
    var refNode,
        selectMenu;

    refNode = document.querySelector('label[for=eqid]');
    selectMenu = _getSelectMenu(_json);

    _app.StatusBar.removeItem('significant');

    if (selectMenu) {
      refNode.parentNode.insertBefore(selectMenu, refNode);
      selectMenu.addEventListener('change', _app.EditPane.selSignificantEq);
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = SignificantEqs;
