'use strict';


/**
 * Set the TitleBar's content (and the document's title).
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
    _defaults = { // cache initial text from HTML
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
   * @param feature {Object}
   */
  _setSubTitle = function (feature) {
    var p = _el.querySelector('p'),
        subTitle = _defaults.subTitle;

    if (feature.id?.includes('mainshock')) {
      subTitle = feature.data.eq.timeDisplay;
    }

    p.innerHTML = subTitle;
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
    } else {
      _this.setTitle({
        title: _defaults.title
      });
    }
  };

  /**
   * Set the title (both the header and the document's <title>).
   *
   * @param feature {Object}
   *     Mainshock or CatalogSearch
   */
  _this.setTitle = function (feature) {
    var url,
        h1 = _el.querySelector('h1'),
        title = feature.title;

    if (feature.id?.includes('mainshock')) { // add a link to the Event Page
      url = feature.data.eq.url;
      title =
        `<a href="${url}" class="external" target="new" title="USGS Event Page">` +
          `${title}<i class="icon-link"></i>` +
        '</a>';
    }

    h1.innerHTML = title;
    document.title = feature.title + ' | ' + _defaults.title; // include app name

    _repaint(h1);
    _setSubTitle(feature);
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = TitleBar;
