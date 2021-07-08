/* global L */
'use strict';


var AppUtil = require('util/AppUtil');


var _DEFAULTS = {
  color: '#000',
  fillColor: '#fff',
  fillOpacity: 0.85,
  height: 20,
  opacity: 0.6,
  radius: 9,
  width: 20
};

/**
 * Create <svg> elements.
 *
 * @return _this {Object}
 *   {
 *     createCircle: {Function}
 *     createCircleRange: {Function}
 *     createLine: {Function}
 *     createTriangle: {Function}
 *   }
 */
var Svg = function () {
  var _this,

      _createElement;


  _this = {};

  /**
   * Create a new <svg> element.
   *
   * @return {Element}
   */
  _createElement = function () {
    return document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Create an <svg> circle.
   *
   * @param opts {Object}
   *
   * @return svg {Element}
   */
  _this.createCircle = function (opts) {
    var data,
        size,
        svg,
        template;

    opts = Object.assign({}, _DEFAULTS, opts);
    size = Math.ceil(opts.radius * 2 + 2);
    data = Object.assign(opts, {
      origin: size / 2
    });
    svg = _createElement();
    template = '<circle cx="{origin}" cy="{origin}" r="{radius}" ' +
      'fill="{fillColor}" fill-opacity="{fillOpacity}" stroke="{color}" ' +
      'stroke-opacity="{opacity}" stroke-width="1" />';

    svg.innerHTML = L.Util.template(template, data);
    svg.setAttribute('height', size);
    svg.setAttribute('width', size);

    return svg;
  };

  /**
   * Create a range of <svg> circles as an ordered list.
   *
   * @param opts {Object}
   *
   * @return ol {Element}
   */
  _this.createCircleRange = function (opts) {
    var circle,
        li,
        ol;

    ol = document.createElement('ol');
    opts = Object.assign({
      max: 7,
      min: 0
    }, opts);

    ol.classList.add('mags');

    for (var i = opts.min; i <= opts.max; i ++) {
      circle = _this.createCircle({
        radius: AppUtil.getRadius(i)
      });
      li = document.createElement('li');

      li.appendChild(circle);
      ol.appendChild(li);
    }

    return ol;
  };

  /**
   * Create an <svg> line segment.
   *
   * @param opts {Object}
   *
   * @return svg {Element}
   */
  _this.createLine = function (opts) {
    var svg,
        template;

    opts = Object.assign({}, _DEFAULTS, opts);
    svg = _createElement();
    template = '<path fill="#fff" stroke="{color}" ' +
      'stroke-opacity="{opacity}" stroke-width="2" stroke-linecap="round" ' +
      'd="M1.5,1.5c2.6,0.4,5.9,1.3,8,4c1.4,1.8,1.5,3.4,2,5c0.9,3,3.1,6.9,9,11" />';

    svg.innerHTML = L.Util.template(template, opts);
    svg.setAttribute('height', opts.height);
    svg.setAttribute('width', opts.width);
    svg.setAttribute('viewBox', '0 0 ' + opts.width + ' ' + opts.height);

    return svg;
  };

  /**
   * Create an <svg> triangle.
   *
   * @param opts {Object}
   *
   * @return svg {Element}
   */
  _this.createTriangle = function (opts) {
    var svg,
        template;

    opts = Object.assign({}, _DEFAULTS, opts);
    svg = _createElement();
    template = '<polygon points="10,3 19,18 1,18" fill="{fillColor}" ' +
      'fill-opacity="{fillOpacity}" stroke="{color}" ' +
      'stroke-opacity="{opacity}" stroke-width="1" />';

    svg.innerHTML = L.Util.template(template, opts);
    svg.setAttribute('height', opts.height);
    svg.setAttribute('width', opts.width);
    svg.setAttribute('viewBox', '0 0 ' + opts.width + ' ' + opts.height);

    return svg;
  };


  return _this;
};


module.exports = Svg;
