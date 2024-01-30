/* global L */
'use strict';


var _DEFAULTS = {
  el: null,     // existing Slider's <input>
  filter: null, // filter content based on Slider's value
  id: '',       // new Slider's id value
  label: '',    // new Slider's <label>
  max: 9,       // new Slider's maximum value
  min: 0,       // new Slider's minimum value
  val: 5        // new Slider's initial value
};


/**
 * Create a new range Slider (or configure an existing one), which is a custom
 * UI component for setting an <input> value.
 *
 * Either supply a pre-existing Slider Element, or an id plus the minimum,
 * maximum, and initial values (and optionally a filter and label).
 *
 * @param options {Object}
 *     {
 *       el: {Element} optional
 *       filter: {Function} optional
 *       id: {String} optional
 *       label: {String} optional
 *       max: {Number} optional
 *       min: {Number} optional
 *       val: {Number} optional
 *     {
 *
 * @return _this {Object}
 *     {
 *       addListeners: {Function}
 *       destroy: {Function}
 *       getContent: {Function}
 *       removeListeners: {Function}
 *       setValue: {Function}
 *     }
 */
var Slider = function (options) {
  var _this,
      _initialize,

      _data,
      _el,
      _filter,
      _output,
      _slider,
      _style,

      _getValue,
      _update;


  _this = {};

  _initialize = function (options = {}) {
    options = Object.assign({}, _DEFAULTS, options);

    _data = {
      id: options.id,
      label: options.label,
      max: options.max,
      min: options.min,
      val: options.val
    };
    _el = options.el;
    _filter = options.filter;
    _style = document.getElementById('sliders');

    // Add a single <style> tag for all Sliders' styles
    if (!_style) {
      _style = document.createElement('style');
      _style.id = 'sliders';

      document.body.appendChild(_style);
    }

    if (_el) {
      _this.addListeners();

      if (_el.value) {
        _this.setValue();
      }
    }
  };

  /**
   * Get the CSS percentage value for the colored section of the Slider's track.
   *
   * @return {String}
   */
  _getValue = function () {
    var max = Number(_el.max) || 9,
        min = Number(_el.min) || 0,
        value = Number(_el.value),
        percentage = Math.floor(100 * (value - min) / (max - min));

    return percentage + '% 100%';
  };

  /**
   * Event handler that updates the Slider's track and optionally filters the
   * displayed content.
   */
  _update = function () {
    _this.setValue();
    sessionStorage.setItem(_el.id, _el.value);

    if (_filter) {
      _filter.call(this);
      window.scroll(0, window.pageYOffset); // prevent page scrolling
    }
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add event listeners (and set dependent vars).
   *
   * @param el {Element} optional; default is _el
   *     Slider's <input>
   */
  _this.addListeners = function (el = _el) {
    var container = el.closest('.slider-container');

    _el = el; // in case it wasn't set in _initialize()

    // Set Element refs now that it's safe to assume Slider has been rendered
    _output = container.querySelector('output');
    _slider = container.querySelector('.slider');

    _el.addEventListener('input', _update);
  };

  /**
   * Destroy this Class.
   */
  _this.destroy = function () {
    _initialize = null;

    _data = null;
    _el = null;
    _filter = null;
    _output = null;
    _slider = null;
    _style = null;

    _getValue = null;
    _update = null;

    _this = null;
  };

  /**
   * Get the HTML content for the Slider.
   *
   * @return {String}
   */
  _this.getContent = function () {
    var template =
      '<div class="slider-container">' +
        '<div class="min">{min}</div>' +
        '<div class="slider inverted" style="--min:{min}; --max:{max}; --val:{val};">' +
          '<input id="{id}" type="range" min="{min}" max="{max}" value="{val}">' +
          '<output for="{id}">{val}</output>' +
        '</div>' +
        '<div class="max">{max}</div>' +
      '</div>';

    if (_filter) {
      template =
        '<div class="filter">' +
          '<label for="{id}">{label}</label>' +
          template +
        '</div>';
    }

    return L.Util.template(template, _data);
  };

  /**
   * Remove event listeners.
   */
  _this.removeListeners = function () {
    if (_el) {
      _el.removeEventListener('input', _update);
    }
  };

  /**
   * Set the displayed value and inline styles that highlight the 'active'
   * section of the Slider (based on the <input>'s current value).
   */
  _this.setValue = function () {
    var value,
        newStyles = '',
        oldStyles = new RegExp(`#${_el.id}[^#]+`, 'g'),
        vendorAttrs = ['webkit-slider-runnable', 'moz-range'];

    if (_el) {
      value = _getValue();

      vendorAttrs.forEach(attr =>
        newStyles += `#${_el.id}::-${attr}-track {background-size:${value} !important}`
      );

      _output.value = _el.value;

      // Set the inline CSS styles in <style#sliders>
      _style.textContent = _style.textContent.replace(oldStyles, '');
      _style.appendChild(document.createTextNode(newStyles));

      // Set the style attribute on the control
      _slider.style.setProperty('--val', _el.value);
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Slider;
