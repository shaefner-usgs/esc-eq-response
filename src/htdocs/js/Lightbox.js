'use strict';


var Util = require('hazdev-webutils/src/util/Util');


var _DEFAULTS = {};

/**
 * Create a lightbox overlay
 *
 * @param options {Object}
 *
 * @return _this {Object}
 *   {
 *     add: {Function},
 *     hide: {Function},
 *     remove: {Function},
 *     show: {Function}
 *   }
 */
var Lightbox = function (options) {
  var _this,
      _initialize,

      _addListener,
      _handleEscapeKey;


  _this = {};

  _initialize = function (options) {
    options = Util.extend({}, _DEFAULTS, options);
  };

  /**
   * Add listener for close button
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
   * Hide lightbox when user hits escape key
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
   * Add Lightbox to document
   *
   * @param html {String}
   *     Lightbox content (typically an img tag)
   */
  _this.add = function (html) {
    var div;

    // first remove any existing lightbox
    _this.remove();

    div = document.createElement('div');
    div.classList.add('lightbox', 'hide');
    div.innerHTML = html;

    document.body.appendChild(div);

    _addListener(div);
  };

  /**
   * Hide lightbox
   */
  _this.hide = function () {
    var div;

    div = document.querySelector('body > .lightbox');
    if (div) {
      div.classList.add('hide');
    }

    // Remove escape key listener
    document.removeEventListener('keydown', _handleEscapeKey);
  };

  /**
   * Remove lightbox from document
   */
  _this.remove = function () {
    var div;

    div = document.querySelector('body > .lightbox');
    if (div) {
      div.parentNode.removeChild(div);
    }
  };

  /**
   * Show lightbox
   */
  _this.show = function () {
    var div;

    div = document.querySelector('body > .lightbox');
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
