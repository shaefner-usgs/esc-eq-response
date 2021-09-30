/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
    Luxon = require('luxon');


/**
 * Fetch the significant earthquakes feed and add the list to the SelectBar.
 *
 * @param options {Object}
 *   {
 *     app: {Object} Application
 *     el: {Element}
 *   }
 *
 * @return _this {Object}
 *   {
 *     postInit: {Function}
 *     unselectAll: {Function}
 *   }
 */
var SignificantEqs = function (options) {
  var _this,
      _initialize,

      _app,
      _el,

      _createList,
      _selectEq;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _el = options.el || document.createElement('div');
  };

  /**
   * Create the SignificantEqs list HTML.
   *
   * @param json {Object} default is {}
   *
   * @return list {Element}
   */
  _createList = function (json = {}) {
    var data,
        li,
        list,
        props;

    list = document.createElement('h4'); // default
    list.innerHTML = 'None';

    if (json.features) {
      list = document.createElement('ul');

      json.features.forEach(feature => {
        props = feature.properties;
        data = {
          date: Luxon.DateTime.fromMillis(props.time).toUTC().toFormat('LLL d, yyyy TT'),
          mag: AppUtil.round(props.mag, 1),
          place: props.place
        };
        li = document.createElement('li');

        li.id = feature.id;
        li.innerHTML = L.Util.template(
          '<div>{mag}</div>' +
          '<div>' +
            '<h4>{place}</h4>' +
            '<p>{date} UTC</p>' +
          '</div>',
          data
        );

        li.addEventListener('click', _selectEq);

        if (feature.id === AppUtil.getParam('eqid')) {
          li.classList.add('selected');
        }

        list.appendChild(li);
      });
    }

    list.id = 'significantEqs';

    return list;
  };

  /**
   * Event handler to select the earthquake the user clicked on.
   */
  _selectEq = function () {
    var eqid,
        eqs;

    eqid = document.getElementById('eqid');
    eqs = _el.querySelectorAll('li');

    eqs.forEach(eq => {
      if (eq.id === this.id) {
        if (eqid.value !== eq.id) { // eq not already selected
          eqid.value = eq.id; // set the value of the eqid <input>

          // Input event is not triggered when it's changed programmatically
          AppUtil.setQueryString();
          _app.SelectBar.createMainshock();
        }

        eq.classList.add('selected');
      } else {
        eq.classList.remove('selected');
      }
    });
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Initialization that depends on other Classes being ready before running.
   */
  _this.postInit = function () {
    var list;

    _app.JsonFeed.fetch({
      id: 'significantEqs',
      name: 'Significant Earthquakes',
      url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson'
    }).then(json => {
      list = _createList(json);

      _el.replaceWith(list);
      _el = list;
    });
  };

  /**
   * Unselect all earthquakes in the list.
   */
  _this.unselectAll = function () {
    var lis = _el.querySelectorAll('li');

    lis.forEach(li => {
      li.classList.remove('selected');
    });
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = SignificantEqs;
