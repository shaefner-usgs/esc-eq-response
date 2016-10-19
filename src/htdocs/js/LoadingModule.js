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
   * Add message to loading module
   *
   * @param id {String}
   * @param name {String}
   */
  _this.addItem = function (id, name) {
    var p;

    _showModule();

    p = document.createElement('p');
    p.setAttribute('class', id);
    p.innerHTML = 'Loading ' + name + '&hellip;';

    _el.appendChild(p);
  };

  /**
   * Remove message from loading module (and hide if empty)
   *
   * @param id {String}
   */
  _this.removeItem = function (id) {
    var p;

    p = _el.querySelector('.' + id);

    if (_el.children.length === 1) {
      // add a slight delay if removing last message
      window.setTimeout(function () {
        p.parentNode.removeChild(p);
        _hideModule();
      }, 500);
    } else {
      p.parentNode.removeChild(p);
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = LoadingModule;
