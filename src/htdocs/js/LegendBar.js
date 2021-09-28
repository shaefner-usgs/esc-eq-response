'use strict';


var Svg = require('util/Svg');


/**
 * Add SVG elements to the LegendBar.
 *
 * @param options {Object}
 *   {
 *     el: {Element}
 *   }
 *
 * @return _this {Object)
 */
var LegendBar = function (options) {
  var _this,
      _initialize,

      _el,
      _Svg,

      _addSvgElements,
      _getColors;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _el = options.el || document.createElement('section');
    _Svg = Svg();

    _addSvgElements();
  };

  /**
   * Add the SVG elements to the legend.
   */
  _addSvgElements = function () {
    var circle,
        colors,
        line,
        range,
        triangle;

    colors = _getColors();
    line = _Svg.createLine({
      color: '#c00',
      opacity: '0.5'
    });
    range = _Svg.createCircleRange();
    triangle = _Svg.createTriangle();

    Object.keys(colors).forEach(key => {
      circle = _Svg.createCircle(colors[key]);

      _el.querySelector('.' + key).appendChild(circle);
    });

    _el.querySelector('.faults').appendChild(line);
    _el.querySelector('.magnitude').appendChild(range);
    _el.querySelector('.shakemap').appendChild(triangle);
  };

  /**
   * Get the colors of the earthquake circles.
   *
   * @return colors {Object}
   */
  _getColors = function () {
    var colors = {
      asDay: {
        fillColor: '#f90'
      },
      asHour: {
        fillColor: '#f00'
      },
      asOlder: {
        fillColor: '#ffb'
      },
      asWeek: {
        fillColor: '#ff0'
      },
      foreshocks: {
        fillColor: '#99a'
      },
      historical: {
        fillColor: '#dde'
      },
      mainshock: {
        fillColor: '#00f'
      },
    };

    return colors;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = LegendBar;
