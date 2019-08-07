'use strict';


var Svg = require('Svg');


var HelpPane = function (options) {
  var _this,
      _initialize,

      _el,
      _legend,
      _Svg,

      _addSvgElements;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _Svg = Svg();

    _el = options.el || document.createElement('div');
    _legend = _el.querySelector('.legend');

    _addSvgElements();
  };

  /**
   * Add SVG elements to legend html
   */
  _addSvgElements = function () {
    var circles,
        line,
        range,
        svg,
        triangle;

    circles = {
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

    Object.keys(circles).forEach(function(key) {
      svg = _Svg.getCircle(circles[key]);
      _legend.querySelector('.' + key).appendChild(svg);
    });

    line = _Svg.getLine({
      color: '#c00',
      opacity: '0.5'
    });
    _legend.querySelector('.faults').appendChild(line);

    range = _Svg.getCircleRange();
    _legend.querySelector('.magnitude').appendChild(range);

    triangle = _Svg.getTriangle();
    _legend.querySelector('.shakemap').appendChild(triangle);
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = HelpPane;
