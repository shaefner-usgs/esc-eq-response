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
      _zIndex,

      _hideStatusBar,
      _getZindex,
      _showStatusBar;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _el = options.el || document.createElement('div');
    _zIndex = 10000;
  };

  /**
   * Get z-index value for status bar entry
   *   counts down so that previous entries are displayed until they're removed
   *
   * @return _zIndex {Integer}
   */
  _getZindex = function () {
    // Don't let z-index get "too low" (sorta hacky, but does the trick)
    if (_zIndex < 9000) {
      _zIndex = 10000;
    }
    _zIndex --;

    return _zIndex;
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
    error.style.zIndex = _getZindex();

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
    item.style.zIndex = _getZindex();

    _el.appendChild(item);
  };

  /**
   * Clear all messages from status bar
   */
  _this.clearAll = function () {
    _el.innerHTML = '';
    _hideStatusBar();
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
    var item;

    item = _el.querySelector('.' + className);
    if (item) {
      item.parentNode.removeChild(item);
    }

    if (_el.children.length === 0) {
      _hideStatusBar();
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = StatusBar;
