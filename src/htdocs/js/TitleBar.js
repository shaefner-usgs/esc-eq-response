'use strict';


/**
 * Set the TitleBar's content.
 *
 * @param options {Object}
 *   {
 *     el: {Element}
 *   }
 *
 * @return _this {Object)
 *   {
 *     reset: {Function}
 *     setTitle: {Function}
 *   }
 */
var TitleBar = function (options) {
  var _this,
      _initialize,

      _el,
      _subTitle,
      _title,

      _setSubTitle;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _el = options.el;
    _subTitle = _el.querySelector('p').innerText;
    _title = document.title;
  };

  /**
   * Set the TitleBar's subtitle.
   *
   * @param subTitle {String}
   */
  _setSubTitle = function (subTitle) {
    var p = _el.querySelector('p');

    p.innerHTML = subTitle || _subTitle;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Reset to default state.
   */
  _this.reset = function () {
    _this.setTitle();
  };

  /**
   * Set the TitleBar's title (and the document's <title>).
   *
   * @param opts {Object} optional; default is {}
   *   {
   *     htmlTime: {String}
   *     title: {String}
   *     type: {String}
   *     url: {String}
   *   }
   */
  _this.setTitle = function (opts = {}) {
    var appName,
        docTitle,
        h1,
        title;

    appName = document.title.split(' | ')[1] || document.title;
    h1 = _el.querySelector('h1');
    title = _title;

    if (opts.title) {
      title = opts.title;

      if (opts.type === 'search') {
        _title = opts.title; // cache value

        if (!document.body.classList.contains('no-mainshock')) {
          return; // don't change the title if a Mainshock is selected
        }
      }
    }

    docTitle = title + ' | ' + appName;

    if (opts.url) {
      title = `<a href="${opts.url}" target="new">${title}<i class="icon-link"></i></a>`;
    }

    h1.innerHTML = title;
    document.title = docTitle;

    _setSubTitle(opts.htmlTime || '');
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = TitleBar;
