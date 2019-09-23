'use strict';


var Svg = require('Svg');


/**
 * Add SVG elements to help pane
 *
 * @param options {Object}
 *   {
 *     app: {Object}, // Application
 *     el: {Element}
 *   }
 */
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

    _el = options.el || document.createElement('div');
    _legend = _el.querySelector('.legend');
    _Svg = Svg();

    _addSvgElements();
  };

  /**
   * Add SVG elements to legend HTML
   */
  _addSvgElements = function () {
    var circle,
        circles,
        line,
        range,
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
      circle = _Svg.getCircle(circles[key]);
      _legend.querySelector('.' + key).appendChild(circle);
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
