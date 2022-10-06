'use strict';


/**
 * Create and add a Lightbox to the DOM.
 *
 * Note: Set the Lightbox content and show it using its public methods.
 *
 * @param options {Object}
 *     {
 *       id: {String}
 *     }
 *
 * @return _this {Object}
 *     {
 *       destroy: {Function}
 *       setContent: {Function}
 *       show: {Function}
 *     }
 */
var Lightbox = function (options) {
  var _this,
      _initialize,

      _content,
      _el,

      _add,
      _addListeners,
      _hide,
      _onKeyDown,
      _remove,
      _removeListeners,
      _stopPropagation;


  _this = {};

  _initialize = function (options = {}) {
    _el = document.createElement('div');

    _add(options.id);
  };

  /**
   * Add the Lightbox to the DOM.
   *
   * @param id {String}
   */
  _add = function (id) {
    _el.classList.add('lightbox', 'hide');
    _el.id = id + '-lightbox';

    _remove(); // remove any pre-existing Lightbox first
    document.body.appendChild(_el);
  };

  /**
   * Add event listeners.
   */
  _addListeners = function () {
    _el.addEventListener('click', _hide);
    document.addEventListener('keydown', _onKeyDown, true);

    // Disable click to close on top of Lightbox's content
    if (_content) {
      _content.addEventListener('click', _stopPropagation);
    }
  };

  /**
   * Hide the Lightbox and remove its listeners.
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
    _el.removeEventListener('click', _hide);
    document.removeEventListener('keydown', _onKeyDown, true);

    if (_content) {
      _content.removeEventListener('click', _stopPropagation);
    }
  };

  /**
   * Event handler that stops event propagation.
   *
   * @param e {Event}
   */
  _stopPropagation = function (e) {
    e.stopPropagation();
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

    _content = null;
    _el = null;

    _add = null;
    _addListeners = null;
    _hide = null;
    _onKeyDown = null;
    _remove = null;
    _removeListeners = null;
    _stopPropagation = null;

    _this = null;
  };

  /**
   * Set the Lightbox's content.
   *
   * @param html {String}
   *
   * @return _this {Object}
   */
  _this.setContent = function (html) {
    _el.innerHTML = html;
    _content = _el.querySelector(':scope > *');

    return _this; // enable chaining
  };

  /**
   * Show the Lightbox.
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
