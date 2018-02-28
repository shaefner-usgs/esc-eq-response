'use strict';


/**
 * Sets up a status bar to inform user of app's status
 *
 * @param options {Object}
 *   {
 *     el: {Element}
 *   }
 */
var StatusBar = function (options) {
  var _this,
      _initialize,

      _el,

      _doRemove,
      _hideStatusBar,
      _showStatusBar;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _el = options.el || document.createElement('div');
  };

  /**
   * Remove status bar entry from DOM
   *
   * @param el {Element}
   */
  _doRemove = function (el) {
    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  };

  /**
   * Hide status bar
   */
  _hideStatusBar = function () {
    _el.classList.add('hide');
  };

  /**
   * Show status bar
   */
  _showStatusBar = function () {
    _el.classList.remove('hide');
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add error to status bar
   *
   * @param className {String}
   * @param error {String}
   */
  _this.addError = function (className, errorMsg) {
    var error;

    _this.removeItem(className); // remove any leftover items for this feature
    _showStatusBar();

    error = document.createElement('p');
    error.classList.add(className, 'error');
    error.innerHTML = errorMsg;

    _el.appendChild(error);
  };

  /**
   * Add item to status bar
   *
   * @param className {String}
   * @param name {String}
   */
  _this.addItem = function (className, name) {
    var item;

    _this.removeError(className); // remove any leftover errors for this feature
    _showStatusBar();

    if (name) {
      name = ' ' + name;
    }

    item = document.createElement('p');
    item.classList.add(className);
    item.innerHTML = 'Loading' + name + '&hellip;';

    _el.appendChild(item);
  };

  /**
   * Check if error(s) exist(s)
   *
   * @param className {String}
   *
   * @return {Boolean}
   */
  _this.hasError = function (className) {
    var error;

    error = _el.querySelector('.' + className + '.error');
    if (error) {
      return true;
    }
  };

  /**
   * Remove error from status bar (and hide if empty)
   *
   * @param className {String}
   */
  _this.removeError = function (className) {
    var error;

    error = _el.querySelector('.error.' + className);
    if (error) {
      error.parentNode.removeChild(error);
    }

    if (_el.children.length === 0) {
      _hideStatusBar();
    }
  };

  /**
   * Remove item from status bar (and hide if empty)
   *
   * @param className {String}
   */
  _this.removeItem = function (className) {
    var i,
        items;

    items = _el.querySelectorAll('.' + className);
    for (i = 0; i < items.length; i ++) {
      if (_el.children.length === 1) {
        _hideStatusBar();
        // Don't remove last item until after css transition to hide is complete
        window.setTimeout(_doRemove, 500, items[i]);
      } else {
        _doRemove(items[i]);
      }
    }
  };

  /**
   * Clear all messages from status bar
   */
  _this.reset = function () {
    _el.innerHTML = '';
    _hideStatusBar();
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = StatusBar;
