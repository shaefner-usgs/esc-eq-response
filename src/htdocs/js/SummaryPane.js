/* global L */
'use strict';


var ImagesLoaded = require('imagesloaded'),
    Masonry = require('masonry-layout');


/**
 * Add/remove a Feature's content and set up the Masonry layout plugin. Also
 * keep the Tablesort plugin's direction indicators in sync when swapping time
 * zones.
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
 *       render: {Function}
 *       reset: {Function}
 *       swapSort: {Function}
 *     }
 */
var SummaryPane = function (options) {
  var _this,
      _initialize,

      _app,
      _el,
      _masonry,

      _initMasonry;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;
    _el = options.el;
  };

  /**
   * Initialize the Masonry layout plugin.
   *
   * @param phase {String <initial|final>} optional; default is 'initial'
   */
  _initMasonry = function (phase = 'initial') {
    var images,
        duration = 0, // default; disable transition
        el = _el.querySelector('.mainshock .products');

    if (phase === 'final') {
      duration = '.25s';
    }

    _masonry = new Masonry(el, {
      columnWidth: 400,
      gutter: 16,
      itemSelector: '.bubble',
      transitionDuration: duration
    });

    if (phase === 'initial') {
      images = ImagesLoaded(el);
      images.on('progress', () => {
        if (_masonry) { // check in case Feature destroyed before images load
          _masonry.layout(); // update layout as images load
        }
      });
    }

    _masonry.phase = phase;
  };


  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add the given Feature's summary content.
   *
   * @param feature {Object}
   */
  _this.addContent = function (feature) {
    var el, selectors;

    if (feature.content) {
      selectors = [
        `div.${feature.id}.content`, // parent container, or
        `div.${feature.id} .content` // child container
      ].join(',');
      el = _el.querySelector(selectors);

      el.insertAdjacentHTML('beforeend', feature.content);
      el.classList.remove('hide'); // un-hide placeholder if it was hidden
    }

    if (feature.id.includes('mainshock')) {
      _initMasonry();
    }
  };

  /**
   * Add the given Feature's placeholder. Content is added separately when the
   * fetched data is ready.
   *
   * @param feature {Object}
   */
  _this.addFeature = function (feature) {
    var el = _el.querySelector('.container'),
        html = L.Util.template(
          '<div class="{id} feature">' +
            '<h2>{name}</h2>' +
            '{placeholder}' +
          '</div>',
          feature
        );

    el.insertAdjacentHTML('beforeend', html);
  };

  /**
   * Remove the given Feature.
   *
   * @param feature {Object}
   */
  _this.removeFeature = function (feature) {
    var el = _el.querySelector('.' + feature.id);

    if (el) {
      el.parentNode.removeChild(el);
    }
  };

  /**
   * Render the Masonry layout.
   */
  _this.render = function () {
    var status,
        mainshock = _app.Features.getMainshock();

    if (_app.Features.isFeature(mainshock)) {
      status = _app.Features.getStatus();

      if (status === 'ready' && _masonry.phase === 'initial') {
        // Masonry API doesn't allow changing settings, so create a new instance
        _masonry.destroy();
        _initMasonry('final');
      } else {
        _masonry.layout(); // update layout
      }
    }
  };

  /**
   * Reset to default state.
   */
  _this.reset = function () {
    _el.querySelector('.container').innerHTML = '';

    _masonry?.destroy();
  };

  /**
   * Swap the given tables' sort indicators to the currently visible time field
   * (UTC or User time).
   *
   * Note: should be called when the timezone option is changed and when a
   * Feature is added.
   *
   * @param tables {NodeList|Array}
   */
  _this.swapSort = function (tables) {
    var indicator, sortDown, sortUp, hidden, visible,
        fields = ['userTime', 'utcTime'],
        visibleField = document.querySelector('#timezone .selected').id + 'Time';

    tables.forEach(table => {
      var div = table.closest('div.feature'),
          id = Array.from(div.classList).find(item => item !== 'feature'),
          feature = _app.Features.getFeature(id);

      fields.forEach(field => {
        if (field !== visibleField) {
          hidden = table.querySelector('th.' + field);
          sortDown = hidden.classList.contains('sort-down');
          sortUp = hidden.classList.contains('sort-up');
          visible = table.querySelector('th.' + visibleField);

          if (sortDown || sortUp) { // table currently sorted by time field
            indicator = sortDown ? 'sort-down' : 'sort-up';

            hidden.classList.remove(indicator);
            visible.classList.add(indicator);
            sessionStorage.setItem(feature.type + '-field', visibleField);
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
