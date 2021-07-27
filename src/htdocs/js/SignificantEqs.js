'use strict';


var AppUtil = require('util/AppUtil'),
    Luxon = require('luxon');


/**
 * Fetch the significant earthquakes list and create/add a <select> menu to
 * EditPane.
 *
 * @param options {Object}
 *   {
 *     app: {Object} Application
 *   }
 *
 * @return _this {Object}
 *   {
 *     addSelect: {Function}
 *     postInit: {Function}
 *   }
 */
var SignificantEqs = function (options) {
  var _this,
      _initialize,

      _app,
      _json,

      _createSelect;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
  };

  /**
   * Create the SignificantEqs <select> menu HTML.
   *
   * @return el {Element}
   */
  _createSelect = function () {
    var date,
        el,
        list,
        mag,
        props,
        selected,
        selectedStatus;

    el = document.createElement('select');
    list = '';
    selected = ' selected="selected"';

    if (_json.features) {
      _json.features.forEach(feature => {
        props = feature.properties;
        date = Luxon.DateTime.fromMillis(props.time).toUTC().toFormat('LLL d TT');
        mag = AppUtil.round(props.mag, 1);
        selectedStatus = '';

        if (feature.id === AppUtil.getParam('eqid')) {
          selectedStatus = selected;
          selected = ''; // set default option to unselected since a match was found
        }

        list += `<option value="${feature.id}"${selectedStatus}>M ${mag} - ` +
          `${props.place} (${date})</option>`;
      });

      list = `<option value="" disabled="disabled"${selected}>` +
        'Significant Earthquakes in the Past Month (UTC)</option>' + list;

      el.classList.add('significantEqs');
      el.innerHTML = list;
      el.tabIndex = 1;
    }

    return el;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add significant earthquakes <select> menu to EditPane.
   */
  _this.addSelect = function () {
    var refNode,
        select;

    refNode = document.querySelector('label[for=eqid]');
    select = _createSelect();

    if (select) {
      refNode.parentNode.insertBefore(select, refNode);
      select.addEventListener('change', _app.EditPane.selSignificantEq);
    }
  };

  /**
   * Initialization that depends on other Classes being ready before running.
   */
  _this.postInit = function () {
    _app.JsonFeed.fetch({
      id: 'significantEqs',
      name: 'Significant Earthquakes',
      url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson'
    }).then(json => {
      if (json) {
        _json = json;

        _this.addSelect();
      }
    });
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = SignificantEqs;
