'use strict';


/**
 * Sets up a status bar to inform user of app's status
 *
 * @param options {Object}
 *   {
 *     el: {Element}
 *   }
 */
var LoadingModule = function (options) {
  var _this,
      _initialize,

      _el,

      _hideModule,
      _showModule;


  _this = {};

  _initialize = function (options) {
    options = options || {};
    _el = options.el || document.createElement('div');
  };

  /**
   * Hide loading module
   */
  _hideModule = function () {
    _el.classList.add('hide');
  };

  /**
   * Show loading module
   */
  _showModule = function () {
    _el.classList.remove('hide');
  };

  /**
   * Add error to loading module
   *
   * @param id {String}
   *     CSS class
   * @param error {String}
   */
  _this.addError = function (id, errorMsg) {
    var error;

    _this.removeItem(id); // remove any leftover loading messages
    _showModule();

    error = document.createElement('p');
    error.classList.add(id, 'error');
    error.innerHTML = errorMsg;

    _el.appendChild(error);
  };

  /**
   * Add item to loading module
   *
   * @param id {String}
   *     CSS class
   * @param name {String}
   */
  _this.addItem = function (id, name) {
    var item;

    _this.removeError(id); // remove any leftover errors
    _showModule();

    item = document.createElement('p');
    item.classList.add(id);
    item.innerHTML = 'Loading ' + name + '&hellip;';

    _el.appendChild(item);
  };

  /**
   * Clear all messages from loading module
   */
  _this.clearAll = function () {
    _el.innerHTML = '';
    _hideModule();
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
   * Remove error from loading module (and hide if empty)
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
      _hideModule();
    }
  };

  /**
   * Remove item from loading module (and hide if empty)
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
      _hideModule();
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = LoadingModule;
