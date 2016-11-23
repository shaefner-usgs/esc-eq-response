'use strict';


var LoadingModule = function (options) {
  var _this,
      _initialize,

      _el,

      _clearError,
      _hideModule,
      _showModule;


  _this = {};

  _initialize = function (options) {
    options = options || {};
    _el = options.el || document.createElement('div');
  };

  /**
   * Clear error message in loading module
   */
  _clearError = function (id) {
    var error;

    error = _el.querySelector('.error.' + id);
    if (error) {
      error.parentNode.removeChild(error);
    }
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
   * Add message to loading module
   *
   * @param id {String}
   * @param name {String}
   */
  _this.addItem = function (id, name) {
    var p;

    _clearError(id);
    _showModule();

    p = document.createElement('p');
    p.classList.add(id);
    p.innerHTML = 'Loading ' + name + '&hellip;';

    _el.appendChild(p);
  };

  /**
   * Clear all messages from loading module
   */
  _this.clearAll = function () {
    _el.innerHTML = '';
  };

  /**
   * Check if error message is present
   *
   * @param id {String}
   */
  _this.hasError = function (id) {
    var p;

    p = _el.querySelector('.' + id + '.error');
    if (p) {
      return true;
    }
  };

  /**
   * Remove message from loading module (and hide if empty)
   *
   * @param id {String}
   */
  _this.removeItem = function (id) {
    var p;

    p = _el.querySelector('.' + id);

    p.parentNode.removeChild(p);

    if (_el.children.length === 0) {
        _hideModule();
    }
  };

  _this.showError = function (id, error) {
    var p;

    _showModule();

    p = document.createElement('p');
    p.classList.add(id, 'error');
    p.innerHTML = error;

    _el.appendChild(p);

    // clean up stranded loading message for this feature
    _this.removeItem(id);
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = LoadingModule;
