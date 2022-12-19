'use strict';


/**
 * Set the TitleBar's content.
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *       el: {Element}
 *     }
 *
 * @return _this {Object)
 *     {
 *       reset: {Function}
 *       setTitle: {Function}
 *     }
 */
var TitleBar = function (options) {
  var _this,
      _initialize,

      _app,
      _defaults,
      _el,

      _repaint,
      _setSubTitle;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;
    _el = options.el;
    _defaults = { // cache initial text from static HTML
      subTitle: _el.querySelector('p').innerText, // instructions
      title: _el.querySelector('h1').innerText // app name
    };
  };

  /**
   * "Repaint" to fix a rendering bug in Safari 15.
   *
   * @param el {Element}
   */
  _repaint = function (el) {
    el.style.display = 'none';
    el.offsetHeight;
    el.style.display = 'block';
  };

  /**
   * Set the subtitle.
   *
   * @param subTitle {String} optional
   */
  _setSubTitle = function (subTitle = '') {
    var p = _el.querySelector('p');

    p.innerHTML = subTitle || _defaults.subTitle;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Reset to default state.
   */
  _this.reset = function () {
    var search = _app.Features.getFeature('catalog-search');

    if (_app.Features.isFeature(search)) {
      _this.setTitle(search);
    }
  };

  /**
   * Set the title (both the TitleBar and document <title>).
   *
   * @param feature {Object}
   *     Mainshock or CatalogSearch Feature
   */
  _this.setTitle = function (feature) {
    var subTitle,
        h1 = _el.querySelector('h1'),
        title = feature.title;

    if (feature.id === 'mainshock') {
      subTitle = feature.data.timeDisplay;
      title = // link to Event Page
        `<a href="${feature.data.url}" class="external" target="new" title="USGS Event Page">` +
          `${title}<i class="icon-link"></i>` +
        '</a>';
    }

    h1.innerHTML = title;
    document.title = feature.title + ' | ' + _defaults.title; // include app's name;

    _repaint(h1);
    _setSubTitle(subTitle);
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = TitleBar;
