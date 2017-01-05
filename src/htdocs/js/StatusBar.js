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

      _hideStatusBar,
      _showStatusBar;


  _this = {};

  _initialize = function (options) {
    options = options || {};
    _el = options.el || document.createElement('div');
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

  /**
   * Add error to status bar
   *
   * @param id {String}
   *     CSS class
   * @param error {String}
   */
  _this.addError = function (id, errorMsg) {
    var error;

    _this.removeItem(id); // remove any leftover loading messages
    _showStatusBar();

    error = document.createElement('p');
    error.classList.add(id, 'error');
    error.innerHTML = errorMsg;

    _el.appendChild(error);
  };

  /**
   * Add item to status bar
   *
   * @param id {String}
   *     CSS class
   * @param name {String}
   */
  _this.addItem = function (id, name) {
    var item;

    _this.removeError(id); // remove any leftover errors
    _showStatusBar();

    item = document.createElement('p');
    item.classList.add(id);
    item.innerHTML = 'Loading ' + name + '&hellip;';

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
   * @param id {String}
   *     CSS class
   *
   * @return {Boolean}
   */
  _this.hasError = function (id) {
    var error;

    error = _el.querySelector('.' + id + '.error');
    if (error) {
      return true;
    }
  };

  /**
   * Remove error from status bar (and hide if empty)
   *
   * @param id {String}
   *     CSS class
   */
  _this.removeError = function (id) {
    var error;

    error = _el.querySelector('.error.' + id);
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
   * @param id {String}
   *     CSS class
   */
  _this.removeItem = function (id) {
    var item;

    item = _el.querySelector('.' + id);
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
