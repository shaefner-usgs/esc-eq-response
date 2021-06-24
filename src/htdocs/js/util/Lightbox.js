'use strict';


/**
 * Create a Lightbox overlay.
 *
 * @return _this {Object}
 *   {
 *     add: {Function},
 *     hide: {Function},
 *     remove: {Function},
 *     show: {Function}
 *   }
 */
var Lightbox = function () {
  var _this,

      _addListener,
      _handleEscapeKey;


  _this = {};

  /**
   * Add listener for close button.
   *
   * @param div {Element}
   */
  _addListener = function (div) {
    div.addEventListener('click', function(e) {
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
   * Add Lightbox to document.
   *
   * @param html {String}
   *     Lightbox content (typically an <img> element)
   */
  _this.add = function (html) {
    var div = document.createElement('div');

    div.classList.add('lightbox', 'hide');
    div.innerHTML = html;

    _this.remove(); // first remove any existing Lightbox
    document.body.appendChild(div);

    _addListener(div);
  };

  /**
   * Hide Lightbox.
   */
  _this.hide = function () {
    var div = document.querySelector('body > .lightbox');

    if (div) {
      div.classList.add('hide');
    }

    // Remove escape key listener
    document.removeEventListener('keydown', _handleEscapeKey);
  };

  /**
   * Remove Lightbox from document.
   */
  _this.remove = function () {
    var div = document.querySelector('body > .lightbox');

    if (div) {
      div.parentNode.removeChild(div);
    }
  };

  /**
   * Show Lightbox.
   */
  _this.show = function () {
    var div = document.querySelector('body > .lightbox');

    if (div) {
      div.classList.remove('hide');
    }

    // Add escape key listener
    document.addEventListener('keydown', _handleEscapeKey);
  };

  return _this;
};


module.exports = Lightbox;
