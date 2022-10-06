/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
    Luxon = require('luxon');


/**
 * Add and remove a Feature's summary content and update the timestamp. Also
 * handle swapping the Tablesort plugin's direction indicators between user/UTC
 * time fields.
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *       el: {Element}
 *     }
 *
 * @return _this {Object}
 *     {
 *       addContent: {Function}
 *       addFeature: {Function}
 *       removeFeature: {Function}
 *       reset: {Function}
 *       swapSortIndicator: {Function}
 *     }
 */
var SummaryPane = function (options) {
  var _this,
      _initialize,

      _app,
      _el,

      _cacheFeatures,
      _updateTimestamp;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;
    _el = options.el;
  };

  /**
   * Un-nest (i.e. preserve) the given Feature's sub-Features.
   *
   * @param feature {Element}
   */
  _cacheFeatures = function (feature) {
    var subFeatures,
        container = _el.querySelector('.container');

    subFeatures = feature.querySelectorAll('.content .content');

    subFeatures.forEach(subFeature => {
      container.appendChild(subFeature);
    });
  };

  /**
   * Update the timestamp.
   */
  _updateTimestamp = function () {
    var el = document.getElementById('updated'),
        tz = AppUtil.getTimeZone(),
        userTime = Luxon.DateTime.now()
          .toFormat("ccc, LLL d, yyyy 'at' tt"); // eslint-disable-line

    el.innerHTML = `${userTime} (${tz})`;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add the given Feature's summary.
   *
   * @param feature {Object}
   */
  _this.addContent = function (feature) {
    var parent, selectors,
        status = _app.Features.getStatus();

    if (feature.summary) {
      selectors = `
        div.${feature.id}.content,
        div.${feature.id} .content
      `;
      parent = _el.querySelector(selectors);

      parent.insertAdjacentHTML('beforeend', feature.summary);
      parent.classList.remove('hide'); // un-hide placeholder

      _updateTimestamp();
    }

    // Add the Forecast to Aftershocks if it exists
    if (feature.id.includes('aftershocks')) {
      feature.addForecast();
    }

    if (status === 'ready') {
      _app.Features.getFeature('mainshock').enableDownload();
    }
  };

  /**
   * Add the given Feature's placeholder to the DOM. The summary is appended to
   * .content when the fetched data is ready.
   *
   * @param feature {Object}
   */
  _this.addFeature = function (feature) {
    var html, parent;

    if (
      feature.placeholder &&
      Object.prototype.hasOwnProperty.call(feature, 'summary')
    ) {
      html = L.Util.template(
        '<div class="{id} feature">' +
          '<h2>{name}</h2>' +
          '{placeholder}' +
        '</div>',
        feature
      );
      parent = _el.querySelector('.container');

      parent.insertAdjacentHTML('beforeend', html);
    }
  };

  /**
   * Remove the given Feature, but leave its placeholder intact if it is a
   * "sub-Feature" that is nested within another Feature.
   *
   * @param feature {Object}
   */
  _this.removeFeature = function (feature) {
    var el = _el.querySelector('.' + feature.id),
        isNested = Boolean(_el.closest('.feature'));

    if (el) {
      if (isNested) {
        el.innerHTML = ''; // nested sub-Feature
      } else {
        _cacheFeatures(el);
        el.parentNode.removeChild(el);
      }
    }
  };

  /**
   * Reset to default state.
   */
  _this.reset = function () {
    _el.querySelector('.container').innerHTML = '';
  };

  /**
   * Swap the given tables' sort indicators to the currently visible field
   * (i.e. UTC or User).
   *
   * Note: should be called when the timezone option is changed and when a
   * Feature is added.
   *
   * @param tables {NodeList|Array}
   */
  _this.swapSortIndicator = function (tables) {
    var indicator, sortDown, sortUp, thHidden, thVisible,
        fields = ['userTime', 'utcTime'],
        visibleField = document.querySelector('ul.timezone .selected').id + 'Time';

    tables.forEach(table => {
      fields.forEach(field => {
        if (field !== visibleField) {
          thHidden = table.querySelector('th.' + field);
          thVisible = table.querySelector('th.' + visibleField);
          sortDown = thHidden.classList.contains('sort-down');
          sortUp = thHidden.classList.contains('sort-up');

          if (sortDown || sortUp) {
            indicator = (sortDown ? 'sort-down' : 'sort-up');

            thHidden.classList.remove(indicator);
            thVisible.classList.add(indicator);
          }
        }
      });
    });
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = SummaryPane;
