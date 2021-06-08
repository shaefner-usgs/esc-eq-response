'use strict';


var AppUtil = require('util/AppUtil'),
    Util = require('hazdev-webutils/src/util/Util');


var _DEFAULTS;

_DEFAULTS = {
  color: '#000',
  fillColor: '#fff',
  fillOpacity: 0.85,
  height: 20,
  opacity: 0.6,
  radius: 9,
  width: 20
};

/**
 * Creates <svg> elements
 *
 * @return _this {Object}
 *   {
 *     getBeachBall: {Function},
 *     getCircle: {Function},
 *     getCircleRange: {Function},
 *     getLine: {Function},
 *     getTriangle: {Function}
 *   }
 */
var Svg = function () {
  var _this;


  _this = {};

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Create an SVG beachball
   *
   * @param opts {Object}
   *
   * @return svg {Element}
   */
  _this.getBeachBall = function (opts) {
    var svg,
        svgOpts;

    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgOpts = Util.extend({}, _DEFAULTS, opts);

    svg.innerHTML = '<path d="M3.4,7.8C3.6,8.4,3.7,9,3.9,9.7c0.2,0.6,0.5,1.2,' +
      '0.8,1.8C5,12,5.2,12.4,5.6,13c-1.5,1.7-2.5,3.3-3.3,5.4C2.1,18,2,17.9,' +
      '1.9,17.8c-0.2-0.4-0.3-0.7-0.4-1.1s-0.2-0.8-0.3-1.2C1.1,15,1.1,14.6,1,' +
      '14.2C1,13.8,1,13.4,1,12.9c0-0.9,0.1-1.7,0.3-2.5c0.2-0.8,0.4-1.6,' +
      '0.7-2.3c0.3-0.7,0.8-1.6,1.2-2.3C3.2,6.5,3.3,7.1,3.4,7.8L3.4,7.8z" ' +
      'fill="' + svgOpts.color + '" fill-opacity="' + svgOpts.opacity + '" />';
    svg.innerHTML += '<path d="M11.4,18.4c-0.6-0.3-1.1-0.7-1.6-1.1c-0.5-0.4-1' +
      '-0.8-1.5-1.2c-0.5-0.4-0.9-0.9-1.4-1.4C6.5,14.2,6,13.5,5.6,13c1.5-1.7,' +
      '3.6-3.2,5.6-4.3c4-2.1,8.7-2.8,13-1.7c0.2,0.3,0.4,0.8,0.6,1.1c0.2,0.4,' +
      '0.3,0.7,0.4,1.1c0.1,0.4,0.2,0.8,0.3,1.2c0.1,0.4,0.1,0.8,0.2,1.2c0,0.4,' +
      '0.1,0.8,0.1,1.3s0,0.8-0.1,1.3c0,0.4-0.1,0.8-0.2,1.2c-0.1,0.4-0.2,' +
      '0.8-0.3,1.2c-0.1,0.4-0.3,0.8-0.4,1.1c-0.2,0.4-0.3,0.7-0.5,1.1c-0.2,' +
      '0.4-0.2,0.4-0.4,0.7C19.8,21.4,15.1,20.5,11.4,18.4L11.4,18.4z" ' +
      'fill="' + svgOpts.color + '" fill-opacity="' + svgOpts.opacity + '" />';
    svg.innerHTML += '<path cx="445.06662" cy="300.91925" r="208.23299" ' +
      'stroke-width="1" stroke="' + svgOpts.color + '" fill="none" ' +
      'stroke-opacity="' + svgOpts.opacity + '" d="M25.7,12.9c0,6.8-5.5,' +
      '12.4-12.4,12.4S1,19.8,1,12.9S6.5,0.6,13.3,0.6S25.7,6.1,25.7,12.9z" />';

    svg.setAttribute('height', svgOpts.height);
    svg.setAttribute('viewBox', '0 0 27 27');
    svg.setAttribute('width', svgOpts.width);

    return svg;
  };

  /**
   * Create an SVG circle
   *
   * @param opts {Object}
   *
   * @return svg {Element}
   */
  _this.getCircle = function (opts) {
    var elemSize,
        svg,
        svgOpts;

    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgOpts = Util.extend({}, _DEFAULTS, opts);

    elemSize = Math.ceil(svgOpts.radius * 2 + 2);

    svg.innerHTML = [
      '<circle cx="',
      elemSize / 2,
      '" cy="',
      elemSize / 2,
      '" r="',
      svgOpts.radius,
      '" stroke="',
      svgOpts.color,
      '" stroke-width="1" stroke-opacity="',
      svgOpts.opacity,
      '" fill="',
      svgOpts.fillColor,
      '" fill-opacity="',
      svgOpts.fillOpacity,
      '" />'
    ].join('');

    svg.setAttribute('height', elemSize);
    svg.setAttribute('width', elemSize);

    return svg;
  };

  /**
   * Create a range of SVG circles
   *
   * @param opts {Object}
   *
   * @return ol {Element}
   */
  _this.getCircleRange = function (opts) {
    var circle,
        i,
        li,
        max,
        min,
        ol;

    opts = opts || {};
    max = opts.max || 7;
    min = opts.min || 0;
    ol = document.createElement('ol');
    ol.classList.add('mags');

    for (i = min; i <= max; i ++) {
      li = document.createElement('li');
      circle = _this.getCircle({
        radius: AppUtil.getRadius(i)
      });
      li.appendChild(circle);
      ol.appendChild(li);
    }

    return ol;
  };

  /**
   * Create an SVG line segment
   *
   * @param opts {Object}
   *
   * @return svg {Element}
   */
  _this.getLine = function (opts) {
    var svg,
        svgOpts;

    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgOpts = Util.extend({}, _DEFAULTS, opts);

    svg.innerHTML = [
      '<path fill="#fff" stroke-width="2" stroke-linecap="round" stroke="',
      svgOpts.color,
      '" stroke-opacity="',
      svgOpts.opacity,
      '" d="M1.5,1.5c2.6,0.4,5.9,1.3,8,4c1.4,1.8,1.5,3.4,2,5c0.9,3,3.1,6.9,9,11" />'
    ].join('');

    svg.setAttribute('height', svgOpts.height);
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', svgOpts.width);

    return svg;
  };

  /**
   * Create an SVG triangle
   *
   * @param opts {Object}
   *
   * @return svg {Element}
   */
  _this.getTriangle = function (opts) {
    var svg,
        svgOpts;

    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgOpts = Util.extend({}, _DEFAULTS, opts);

    svg.innerHTML = [
      '<polygon points="10,3 19,18 1,18" stroke-width="1" stroke="',
      svgOpts.color,
      '" stroke-opacity="',
      svgOpts.opacity,
      '" fill="',
      svgOpts.fillColor,
      '" fill-opacity="',
      svgOpts.fillOpacity,
      '" />'
    ].join('');

    svg.setAttribute('height', svgOpts.height);
    svg.setAttribute('viewBox', '0 0 20 20');
    svg.setAttribute('width', svgOpts.width);

    return svg;
  };


  return _this;
};


module.exports = Svg;
