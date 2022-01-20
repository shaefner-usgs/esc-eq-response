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

      _addListeners,
      _handleEscapeKey;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _id = options.id + 'Lightbox';
  };

  /**
   * Add listener for close button.
   *
   * @param div {Element}
   */
  _addListeners = function (div) {
    div.addEventListener('click', e => {
      e.preventDefault();
      _this.hide();
    });
  };

  /**
   * Hide Lightbox when user hits the escape key.
   *
   * @param e {Event}
   */
  _handleEscapeKey = function (e) {
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
   *     Lightbox content (typically an <img> element)
   */
  _this.add = function (html) {
    var div = document.createElement('div');

    div.classList.add('lightbox', 'hide');
    div.id = _id;
    div.innerHTML = html;

    _this.remove(); // first remove any existing Lightbox
    document.body.appendChild(div);

    _addListeners(div);
  };

  /**
   * Hide the Lightbox.
   */
  _this.hide = function () {
    var div = document.getElementById(_id);

    if (div) {
      div.classList.add('hide');
    }

    // Remove escape key listener
    document.removeEventListener('keydown', _handleEscapeKey);
  };

  /**
   * Remove the Lightbox from the document.
   */
  _this.remove = function () {
    var div = document.getElementById(_id);

    if (div) {
      div.parentNode.removeChild(div);
    }
  };

  /**
   * Show the Lightbox.
   */
  _this.show = function () {
    var div = document.getElementById(_id);

    if (div) {
      div.classList.remove('hide');
    }

    // Add escape key listener
    document.addEventListener('keydown', _handleEscapeKey);
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Lightbox;
