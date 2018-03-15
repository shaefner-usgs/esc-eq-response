'use strict';


var Util = require('hazdev-webutils/src/util/Util');


var _SVG_DEFAULTS;

_SVG_DEFAULTS = {
  color: '#000',
  fillColor: '#fff',
  fillOpacity: 0.85,
  opacity: 0.6,
  radius: 12
};


var Svg = function (options) {
  var _this,
      _initialize,

      _getCircle;


  _this = {};

  _initialize = function (options) {
    options = options || {};
  };

  _getCircle = function (opts) {
    var svg,
        svgOpts;

    svgOpts = Util.extend({}, _SVG_DEFAULTS, opts);
    //svg = document.createElement('svg');
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.innerHTML = [
      '<circle cx="',
      svgOpts.radius + 1,
      '" cy="',
      svgOpts.radius + 1,
      '" r="',
      svgOpts.radius,
      '" stroke="',
      svgOpts.color,
      '" stroke-width="1" opacity="',
      svgOpts.opacity,
      '" fill="',
      svgOpts.fillColor,
      '" fill-opacity="',
      svgOpts.fillOpacity,
      '"></circle>'
    ].join('');

    return svg;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  _this.getCircle = function (opts) {
    return _getCircle(opts);
  };

  _this.getLine = function (opts) {
    var svg,
        svgOpts;

    svgOpts = Util.extend({}, _SVG_DEFAULTS, opts);
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.innerHTML = '<path d="M221.9,220.8c3,7,6.6,10.2,9.5,11.9c1.3,0.8, ' +
      '2.2,1.1,3.7,2.1c4.1,2.9,6.1,7.3,7.1,10.5" stroke="black" stroke-width="3" />';

    return svg;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Svg;
