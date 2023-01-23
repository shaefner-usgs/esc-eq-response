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
      _isRefreshing,
      _subFeatures,

      _cacheFeatures,
      _embedFeatures,
      _getSummary,
      _updateTimestamp;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;
    _el = options.el;
    _isRefreshing = {};
    _subFeatures = {};
  };

  /**
   * Un-nest (i.e. preserve) the given Feature's sub-Features.
   *
   * @param feature {Object}
   */
  _cacheFeatures = function (feature) {
    var container, featureId,
        subFeatures = _el.querySelectorAll(`.${feature.id} .content .content`);

    if (subFeatures) {
      container = _el.querySelector('.container');
      featureId = feature.id.replace(/^dd-/, ''); // combine ComCat, DD sub-Features
      _subFeatures[featureId] = [];

      subFeatures.forEach(subFeature => {
        var id = Array.from(subFeature.classList).find(className =>
          className !== 'content'
        );

        _subFeatures[featureId].push(id); // store cached sub-Features by id
        container.appendChild(subFeature);
      });
    }
  };

  /**
   * Embed the given Feature's cached sub-Features (during a Feature refresh or
   * when swapping catalogs).
   *
   * @param feature {Object}
   */
  _embedFeatures = function (feature) {
    var featureId = feature.id.replace(/^dd-/, ''), // combined ComCat, DD sub-Features
        ids = _subFeatures[featureId];

    if (ids) {
      ids.forEach(id => {
        var content = _el.querySelector(`.container > .${id}`),
            placeholder = _el.querySelector(`.${feature.id} .${id}`);

        placeholder.replaceWith(content);
      });
    }
  };

  /**
   * Get the given Feature's summary content for a refresh.
   *
   * @param feature {Object}
   *
   * @return {String}
   */
  _getSummary = function (feature) {
    return L.Util.template(
      '<p class="description">{description}</p>' +
      '{summary}',
      feature
    );
  };

  /**
   * Update the timestamp.
   *
   * @param timestamp {Integer}
   */
  _updateTimestamp = function (timestamp) {
    var datetime = Luxon.DateTime.fromMillis(timestamp),
        el = document.getElementById('updated'),
        tz = AppUtil.getTimeZone(),
        userTime = datetime.toFormat("ccc, LLL d, yyyy 'at' tt"); // eslint-disable-line

    el.innerHTML = `${userTime} (${tz})`;
    el.setAttribute('datetime', datetime.toISO());
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add the given Feature's summary. If the Feature is being refreshed,
   * replace the existing summary.
   *
   * @param feature {Object}
   */
  _this.addContent = function (feature) {
    var selectors = `
          div.${feature.id}.content,
          div.${feature.id} .content
        `,
        el = _el.querySelector(selectors),
        status = _app.Features.getStatus();

    if (feature.id === 'mainshock') {
      _updateTimestamp(feature.updated);
    }

    if (_isRefreshing[feature.id]) {
      _cacheFeatures(feature);

      el.innerHTML = _getSummary(feature);
      _isRefreshing[feature.id] = false;
    } else if (feature.summary) {
      el.insertAdjacentHTML('beforeend', feature.summary);
      el.classList.remove('hide'); // un-hide placeholder if hidden
    }

    _embedFeatures(feature);

    if (status === 'ready') {
      _app.Features.getFeature('mainshock').enableDownload();
    }
  };

  /**
   * Add the given Feature's placeholder to the DOM. The summary is appended to
   * el.content when the fetched data is ready.
   *
   * @param feature {Object}
   */
  _this.addFeature = function (feature) {
    var el, html;

    if (
      feature.placeholder &&
      !_isRefreshing[feature.id] &&
      Object.prototype.hasOwnProperty.call(feature, 'summary')
    ) {
      el = _el.querySelector('.container');
      html = L.Util.template(
        '<div class="{id} feature">' +
          '<h2>{name}</h2>' +
          '{placeholder}' +
        '</div>',
        feature
      );

      el.insertAdjacentHTML('beforeend', html);
    }
  };

  /**
   * Remove the given Feature, but leave its placeholder intact if it is a
   * "sub-Feature" that is nested within another Feature. Also preserve any
   * nested Features.
   *
   * If the Feature is being refreshed, defer and instead remove it when the new
   * Feature is added.
   *
   * @param feature {Object}
   */
  _this.removeFeature = function (feature) {
    var el = _el.querySelector('.' + feature.id),
        isNested = Boolean(_el.closest('.feature'));

    _isRefreshing[feature.id] = (feature.status === 'refreshing') ? true : false;

    if (el && !_isRefreshing[feature.id]) {
      if (isNested) {
        el.innerHTML = ''; // nested sub-Feature
      } else {
        _cacheFeatures(feature);
        el.parentNode.removeChild(el);
      }
    }
  };

  /**
   * Reset to default state.
   */
  _this.reset = function () {
    _el.querySelector('.container').innerHTML = '';

    _isRefreshing = {};
    _subFeatures = {};
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
        visibleField = document.querySelector('#timezone .selected').id + 'Time';

    tables.forEach(table => {
      fields.forEach(field => {
        if (field !== visibleField) {
          thHidden = table.querySelector('th.' + field);
          thVisible = table.querySelector('th.' + visibleField);
          sortDown = thHidden.classList.contains('sort-down');
          sortUp = thHidden.classList.contains('sort-up');

          if (sortDown || sortUp) {
            indicator = sortDown ? 'sort-down' : 'sort-up';

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
