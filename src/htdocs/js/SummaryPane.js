/* global L */
'use strict';


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
      _embedFeatures;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;
    _el = options.el;
  };

  /**
   * Un-nest (i.e. preserve) the given Feature's sub-Features.
   *
   * @param feature {Object}
   */
  _cacheFeatures = function (feature) {
    var container = _el.querySelector('.container'),
        els = _el.querySelectorAll(`.${feature.id} .feature`);

    els.forEach(el => container.appendChild(el));
  };

  /**
   * Re-embed the given Feature's cached sub-Features (during a Feature refresh
   * or when swapping catalogs).
   *
   * @param feature {Object}
   */
  _embedFeatures = function (feature) {
    var els = _el.querySelectorAll('.container > .bubble');

    els.forEach(el => {
      var id = Array.from(el.classList).find(className =>
            !className.match('bubble|content|feature|hide')
          ),
          placeholder = _el.querySelector(`.${feature.id} .${id}`);

      if (placeholder) {
        placeholder.replaceWith(el);
      }
    });
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
    var el,
        mainshock = _app.Features.getFeature('mainshock'),
        selectors = `
          div.${feature.id}.content,
          div.${feature.id} .content
        `,
        status = _app.Features.getStatus();

    if (feature.isRefreshing) {
      _this.removeFeature(feature);
      _this.addFeature(feature);
    }

    if (feature.summary) {
      el = _el.querySelector(selectors);

      el.insertAdjacentHTML('beforeend', feature.summary);
      el.classList.remove('hide'); // un-hide placeholder if hidden
      mainshock.render(); // update Masonry layout
    }

    _embedFeatures(feature);

    if (status === 'ready') {
      mainshock.render(status);
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
   * @param feature {Object}
   */
  _this.removeFeature = function (feature) {
    var isNested,
        el = _el.querySelector('.' + feature.id);

    if (el && !el.closest('.details.bubble')) { // leave item in details strip
      isNested = Boolean(el.parentNode.closest('.feature'));

      if (isNested) {
        el.innerHTML = ''; // leave placeholder intact
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
