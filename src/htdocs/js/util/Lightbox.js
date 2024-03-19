/* global L */
'use strict';


var _DEFAULTS = {
  content: '',
  targets: [], // target Elements that open the Lightbox
  title: ''
};


/**
 * Create and render a Lightbox. Optionally set its content/title upon
 * instantiation, or later via public methods.
 *
 * @param options {Object}
 *     {
 *       content: {String} optional
 *       id: {String}
 *       targets: {NodeList} optional
 *       title: {String} optional
 *     }
 *
 * @return _this {Object}
 *     {
 *       destroy: {Function}
 *       hide: {Function}
 *       render: {Function}
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
      _content,
      _el,
      _id,
      _targets,
      _title,

      _addListeners,
      _disableClick,
      _getContent,
      _onKeyDown,
      _remove,
      _removeListeners,
      _show;


  _this = {};

  _initialize = function (options = {}) {
    options = Object.assign({}, _DEFAULTS, options);

    _content = options.content;
    _id = options.id;
    _el = document.getElementById(_id) || document.createElement('div');
    _targets = options.targets;
    _title = options.title;
  };

  /**
   * Add event listeners.
   */
  _addListeners = function () {
    _button = _el.querySelector('.icon-close');
    _container = _el.querySelector('.container');

    _button.addEventListener('click', _this.hide);
    _container.addEventListener('click', _disableClick); // Lightbox (content)
    _el.addEventListener('click', _this.hide); // silhouette (background)

    _targets.forEach(target => {
      target.addEventListener('click', _show);
    });

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
   * Note: placeholders are used for the title/content if not provided during
   * instantiation.
   *
   * @return {String}
   */
  _getContent = function () {
    var data = {
      content: _content,
      title: _title
    };

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
   * Event handler that hides the Lightbox when the user hits the escape key.
   *
   * @param e {Event}
   */
  _onKeyDown = function (e) {
    if (e.key === 'Escape') {
      e.stopPropagation(); // don't also close Leaflet Popup (if applicable)

      _this.hide();
    }
  };

  /**
   * Remove the Lightbox.
   */
  _remove = function () {
    _removeListeners();

    if (document.getElementById(_id)) {
      _el.parentNode.removeChild(_el);
    }
  };

  /**
   * Remove event listeners.
   */
  _removeListeners = function () {
    _button?.removeEventListener('click', _this.hide);
    _container?.removeEventListener('click', _disableClick);
    _el.removeEventListener('click', _this.hide);

    _targets.forEach(target => {
      target.removeEventListener('click', _show);
    });

    document.removeEventListener('keydown', _onKeyDown, true);
  };

  /**
   * Event handler that shows the Lightbox.
   *
   * @param e {Event}
   */
  _show = function (e) {
    e.preventDefault();
    _this.show();
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Destroy this Class.
   */
  _this.destroy = function () {
    _remove();

    _initialize = null;

    _button = null;
    _container = null;
    _content = null;
    _el = null;
    _id = null;
    _targets = null;
    _title = null;

    _addListeners = null;
    _disableClick = null;
    _getContent = null;
    _onKeyDown = null;
    _remove = null;
    _removeListeners = null;
    _show = null;

    _this = null;
  };

  /**
   * Hide the Lightbox.
   */
  _this.hide = function () {
    _el.classList.add('hide');
  };

  /**
   * Render the Lightbox (which is hidden by default).
   *
   * @return _this {Object}
   */
  _this.render = function () {
    if (!document.getElementById(_id)) {
      document.body.appendChild(_el);
    }

    _el.classList.add('lightbox', 'hide');
    _el.id = _id;
    _el.innerHTML = _getContent();

    _addListeners();

    return _this; // enable chaining
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

    _content = content;

    if (div) {
      div.innerHTML = content;
    }

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

    _title = title;

    if (h3) {
      h3.innerHTML = title;
    }

    return _this; // enable chaining
  };

  /**
   * Show the Lightbox.
   *
   * @param reset {Boolean} optional; default is false
   *     Reset scroll position to top
   *
   * @return _this {Object}
   */
  _this.show = function (reset = false) {
    var container = _el.querySelector('.container');

    if (reset) {
      container.scrollTop = 0;
    }

    _el.classList.remove('hide');

    return _this; // enable chaining
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Lightbox;
