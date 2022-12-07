/* global L */
'use strict';


/**
 * Create and add a Lightbox to the DOM and optionally set its content and/or
 * title.
 *
 * Note: Show the Lightbox and set dynamic content using its public methods.
 *
 * @param options {Object}
 *     {
 *       content: {String}
 *       id: {String} required
 *       title: {String}
 *     }
 *
 * @return _this {Object}
 *     {
 *       destroy: {Function}
 *       setContent: {Function}
 *       setTitle: {Function}
 *       show: {Function}
 *     }
 */
var Lightbox = function (options) {
  var _this,
      _initialize,

      _button,
      _container,
      _el,

      _add,
      _addListeners,
      _disableClick,
      _getContent,
      _hide,
      _onKeyDown,
      _remove,
      _removeListeners;


  _this = {};

  _initialize = function (options = {}) {
    options = Object.assign({
      content: '',
      title: ''
    }, options);

    _el = document.createElement('div');

    _add(options);

    _button = _el.querySelector('.icon-close');
    _container = _el.querySelector('.container');
  };

  /**
   * Add the Lightbox to the DOM.
   *
   * @param opts {Object}
   */
  _add = function (opts) {
    var content = _getContent(opts);

    _el.id = opts.id;
    _el.innerHTML = content;

    _el.classList.add('lightbox', 'hide');
    document.body.appendChild(_el);
  };

  /**
   * Add event listeners.
   */
  _addListeners = function () {
    _button.addEventListener('click', _hide);
    _container.addEventListener('click', _disableClick);
    _el.addEventListener('click', _hide);

    document.addEventListener('keydown', _onKeyDown, true);
  };

  /**
   * Event handler that disables click to close in the content area.
   *
   * @param e {Event}
   */
  _disableClick = function (e) {
    e.stopPropagation();
  };

  /**
   * Get the HTML content for the Lightbox.
   *
   * Note: placeholders are included for the content and/or title if they were
   * not provided during instantiation.
   *
   * @param data {Object}
   *
   * @return {String}
   */
  _getContent = function (data) {
    return L.Util.template(
      '<div class="container">' +
        '<div class="close">' +
          '<a class="icon-close">×</a>' +
        '</div>' +
        '<h3>{title}</h3>' +
        '<div class="content">{content}</div>' +
      '</div>',
      data
    );
  };

  /**
   * Hide the Lightbox (and remove its listeners).
   */
  _hide = function () {
    _el.classList.add('hide');
    _removeListeners();
  };

  /**
   * Event handler that hides the Lightbox when the user hits the escape key.
   *
   * @param e {Event}
   */
  _onKeyDown = function (e) {
    if (e.key === 'Escape') {
      e.stopPropagation(); // don't also close Leaflet Popup

      _hide();
    }
  };

  /**
   * Remove the Lightbox from the DOM.
   */
  _remove = function () {
    if (document.getElementById(_el.id)) {
      _el.parentNode.removeChild(_el);
    }
  };

  /**
   * Remove event listeners.
   */
  _removeListeners = function () {
    _button.removeEventListener('click', _hide);
    _container.removeEventListener('click', _disableClick);
    _el.removeEventListener('click', _hide);

    document.removeEventListener('keydown', _onKeyDown, true);
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _remove(); // also remove from DOM

    _initialize = null;

    _button = null;
    _container = null;
    _el = null;

    _add = null;
    _addListeners = null;
    _disableClick = null;
    _getContent = null;
    _hide = null;
    _onKeyDown = null;
    _remove = null;
    _removeListeners = null;

    _this = null;
  };

  /**
   * Set the Lightbox's content.
   *
   * @param content {String}
   *
   * @return _this {Object}
   */
  _this.setContent = function (content) {
    var div = _el.querySelector('.content');

    div.innerHTML = content;

    return _this; // enable chaining
  };

  /**
   * Set the Lightbox's title.
   *
   * @param title {String}
   *
   * @return _this {Object}
   */
  _this.setTitle = function (title) {
    var h3 = _el.querySelector('.container > h3');

    h3.innerHTML = title;

    return _this; // enable chaining
  };

  /**
   * Show the Lightbox (and add its listeners).
   */
  _this.show = function () {
    _el.classList.remove('hide');
    _addListeners();
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Lightbox;
