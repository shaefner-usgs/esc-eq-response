'use strict';


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
  _this.addError = function (id, error) {
    var p;

    _showModule();

    p = document.createElement('p');
    p.classList.add(id, 'error');
    p.innerHTML = error;

    _el.appendChild(p);

    // clean up stranded loading message for this feature
    _this.removeItem(id);
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
   * Remove error from loading module
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
