'use strict';


/**
 * Set the TitleBar's content.
 *
 * @param options {Object}
 *   {
 *     app: {Object} Application
 *     el: {Element}
 *   }
 *
 * @return _this {Object)
 */
var TitleBar = function(options) {
  var _this,
      _initialize,

      _app,
      _el,
      _subTitle,

      _setSubTitle;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _el = options.el;
    _subTitle = _el.querySelector('p').innerText;
  };

  /**
   * Set the TitleBar's sub title.
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
    _app.setTitle(); // resets Document title and calls TitleBar's _this.setTitle()
  };

  /**
   * Set the TitleBar's title.
   *
   * @param opts {Object} optional; default is {}
   *   {
   *     htmlTime: {String} optional
   *     title: {String} optional
   *     url: {String} optional
   *   }
   */
  _this.setTitle = function(opts = {}) {
    var h1,
        title;

    h1 = _el.querySelector('h1');
    title = opts.title || document.title;

    if (opts.url) {
      title = `<a href="${opts.url}" target="new">${title}<i class="icon-link"></i></a>`;
    }

    h1.innerHTML = title;

    _setSubTitle(opts.htmlTime || '');
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = TitleBar;
