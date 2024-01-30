'use strict';


var AppUtil = require('util/AppUtil'),
    Svg = require('util/Svg');


var _COLORS = {
  foreshocks: '#99a',
  historical: '#dde',
  mainshock: '#00f',
  pasthour: '#f00',
  pastday: '#f90',
  pastweek: '#ff0',
  older: '#ffffe6'
};


/**
 * Add the SVG elements to the LegendBar.
 *
 * @param options {Object}
 *     {
 *       el: {Element}
 *     }
 *
 * @return _this {Object)
 */
var LegendBar = function (options) {
  var _this,
      _initialize,

      _el,

      _createMagRange,
      _render;


  _this = {};

  _initialize = function (options = {}) {
    _el = options.el;

    _render();
  };

  /**
   * Create a range of <svg> circles as an ordered list.
   *
   * @param svg {Object}
   * @param opts {Object} optional; default is {}
   *
   * @return ol {Element}
   */
  _createMagRange = function (svg, opts = {}) {
    var circle, li,
        ol = document.createElement('ol');

    ol.classList.add('mags');

    for (var i = 0; i <= 7; i ++) {
      opts.radius = AppUtil.getRadius(i);
      circle = svg.createCircle(opts);
      li = document.createElement('li');

      li.appendChild(circle);
      ol.appendChild(li);
    }

    return ol;
  };

  /**
   * Render the SVG elements.
   */
  _render = function () {
    var svg = Svg(),
        line = svg.createLine({
          color: '#c00',
          opacity: '0.5'
        }),
        range = _createMagRange(svg),
        triangle = svg.createTriangle();

    Object.keys(_COLORS).forEach(key => {
      var circle = svg.createCircle({
        fillColor: _COLORS[key]
      });

      _el.querySelector('.' + key).appendChild(circle);
    });

    _el.querySelector('.faults').appendChild(line);
    _el.querySelector('.magnitude').appendChild(range);
    _el.querySelector('.shakemap').appendChild(triangle);
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = LegendBar;
