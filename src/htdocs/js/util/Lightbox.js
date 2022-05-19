'use strict';


/**
 * Create a Lightbox overlay instance.
 *
 * @param options {Object}
 *   {
 *     id: {String}
 *   }
 *
 * @return _this {Object}
 *   {
 *     add: {Function}
 *     hide: {Function}
 *     remove: {Function}
 *     show: {Function}
 *   }
 */
var Lightbox = function (options) {
  var _this,
      _initialize,

      _id,
      _lightbox,

      _onKeyDown;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _id = options.id + 'Lightbox';
  };

  /**
   * Hide the Lightbox when the user hits the escape key.
   *
   * @param e {Event}
   */
  _onKeyDown = function (e) {
    if (e.key === 'Escape') {
      _this.hide();
    }
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add the Lightbox to the document.
   *
   * @param html {String}
   *     Lightbox content
   */
  _this.add = function (html) {
    var content,
        div = document.createElement('div');

    div.id = _id;
    div.innerHTML = html;
    div.classList.add('lightbox', 'hide');

    _this.remove(); // first remove any pre-existing Lightbox w/ this _id
    document.body.appendChild(div);

    _lightbox = div;
    content = _lightbox.querySelector(':scope > *');

    // Disable click to close on Lightbox content
    if (content) {
      content.addEventListener('click', e => e.stopPropagation());
    }
  };

  /**
   * Hide the Lightbox.
   */
  _this.hide = function () {
    if (_lightbox) {
      _lightbox.classList.add('hide');
      _lightbox.removeEventListener('click', _this.hide);
    }

    document.removeEventListener('keydown', _onKeyDown);
  };

  /**
   * Remove the Lightbox from the document.
   */
  _this.remove = function () {
    if (_lightbox) {
      _lightbox.parentNode.removeChild(_lightbox);
    }
  };

  /**
   * Show the Lightbox.
   */
  _this.show = function () {
    if (_lightbox) {
      _lightbox.classList.remove('hide');
      _lightbox.addEventListener('click', _this.hide);
    }

    document.addEventListener('keydown', _onKeyDown);
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Lightbox;
