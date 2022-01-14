/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
    Luxon = require('luxon');


/**
 * Fetch the Significant Earthquakes feed and add the list to the SelectBar.
 * Also highlight the selected earthquake if it's in the list.
 *
 * @param options {Object}
 *   {
 *     app: {Object} Application
 *     el: {Element}
 *   }
 *
 * @return _this {Object}
 *   {
 *     loadFeed: {Function}
 *     postInit: {Function}
 *     replaceList: {Function}
 *     reset: {Function}
 *   }
 */
var SignificantEqs = function (options) {
  var _this,
      _initialize,

      _app,
      _el,
      _json,

      _createList,
      _selectEq;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _el = options.el || document.createElement('div');
    _json = {};
  };

  /**
   * Create the SignificantEqs HTML list.
   *
   * @return list {Element}
   */
  _createList = function () {
    var data,
        li,
        list,
        props;

    // Default
    list = document.createElement('h4');
    list.id = 'significantEqs';
    list.innerHTML = 'None';

    if (_json.features) {
      list = document.createElement('ul');
      list.id = 'significantEqs';

      _json.features.forEach(feature => {
        props = feature.properties;
        data = {
          date: Luxon.DateTime.fromMillis(props.time).toUTC().toFormat('LLL d, yyyy TT'),
          mag: AppUtil.round(props.mag, 1),
          mmi: AppUtil.romanize(props.mmi),
          place: props.place
        };
        li = document.createElement('li');

        li.id = feature.id;
        li.innerHTML = L.Util.template(
          '<div>' +
            '<span class="mag">{mag}</span>' +
            '<span class="impact-bubble mmi{mmi}" title="ShakeMap maximum estimated intensity">' +
              '<strong class="roman">{mmi}</strong>' +
            '</span>' +
          '</div>' +
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

    return list;
  };

  /**
   * Event handler to select the earthquake the user clicked on.
   */
  _selectEq = function () {
    var eqs,
        input;

    eqs = _el.querySelectorAll('li');
    input = document.getElementById('eqid');

    eqs.forEach(eq => {
      if (eq.id === this.id) {
        if (input.value !== eq.id) { // eq is not already selected
          input.value = eq.id;

          // Input event is not triggered when it's changed programmatically
          _app.SelectBar.handleMainshock();
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
   * Load the feed data and display the list of earthquakes.
   */
  _this.loadFeed = function () {
    _app.JsonFeed.fetch({
      id: 'significantEqs',
      name: 'Significant Earthquakes',
      url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson'
    }).then(json => {
      _json = json; // cache feed data

      _this.replaceList();
    });
  };

  /**
   * Initialization that depends on other Classes being ready before running.
   */
  _this.postInit = function () {
    _this.loadFeed();
  };

  /**
   * Show the list of Significant Earthquakes (replaces the current list or the
   * loader on initial load).
   */
  _this.replaceList = function () {
    var list = _createList();

    _el.replaceWith(list);

    _el = list;
  };

  /**
   * Unselect all earthquakes in the list.
   */
  _this.reset = function () {
    var lis = _el.querySelectorAll('li');

    lis.forEach(li =>
      li.classList.remove('selected')
    );
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = SignificantEqs;
