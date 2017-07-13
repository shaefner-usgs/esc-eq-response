'use strict';


var PlotsPane = function (options) {
  var _this,
      _initialize,

      _el,
      _plots;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _el = options.el || document.createElement('div');
    _plots = _el.querySelector('.plots');

    _plots.innerHTML = '<h2>Plots</h2>';
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = PlotsPane;
