'use strict';


var Svg = require('Svg');


var HelpPane = function (options) {
  var _this,
      _initialize,

      _Svg,

      _el;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _Svg = Svg();

    _el = options.el || document.createElement('div');

    var legend = _el.querySelector('.legend');

    var circle = _Svg.getCircle();
    legend.appendChild(circle);

    var line = _Svg.getLine();
    legend.appendChild(line);
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = HelpPane;
