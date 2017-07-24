'use strict';


var PlotsPane = function (options) {
  var _this,
      _initialize,

      _el,
      _features;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _el = options.el || document.createElement('div');
    _features = _el.querySelector('.features');

    _features.innerHTML = '<h2>Plots</h2>';
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = PlotsPane;
