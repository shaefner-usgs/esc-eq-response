'use strict';


var AppUtil = require('util/AppUtil'),
    Svg = require('util/Svg');


/**
 * Add SVG elements to the LegendBar.
 *
 * @param options {Object}
 *     {
 *       el: {Element}
 *     }
 *
 * @return _this {Object)
 *     {
 *       reset: {Function}
 *     }
 */
var LegendBar = function (options) {
  var _this,
      _initialize,

      _el,

      _addSvgElements,
      _createMagRange,
      _getColors;


  _this = {};

  _initialize = function (options = {}) {
    _el = options.el;

    _addSvgElements();
  };

  /**
   * Add the SVG elements to the legend.
   */
  _addSvgElements = function () {
    var colors = _getColors(),
        svg = Svg(),
        line = svg.createLine({
          color: '#c00',
          opacity: '0.5'
        }),
        range = _createMagRange(svg, {
          fillOpacity: '0'
        }),
        triangle = svg.createTriangle({
          fillOpacity: '0'
        });

    Object.keys(colors).forEach(key => {
      var circle = svg.createCircle(colors[key]);

      _el.querySelector('.' + key).appendChild(circle);
    });

    _el.querySelector('.faults').appendChild(line);
    _el.querySelector('.magnitude').appendChild(range);
    _el.querySelector('.shakemap').appendChild(triangle);
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
   * Get the colors of the earthquake circles keyed by type.
   *
   * @return {Object}
   */
  _getColors = function () {
    return {
      asDay: {
        fillColor: '#f90'
      },
      asHour: {
        fillColor: '#f00'
      },
      asOlder: {
        fillColor: '#ffffe6'
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
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Reset to default state.
   */
  _this.reset = function () {
    var fieldnotes = _el.querySelector('.fieldnotes');

    fieldnotes.classList.add('hide');
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = LegendBar;
