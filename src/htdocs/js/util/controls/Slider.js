/* global L */
'use strict';


/**
 * Create a new range Slider (or configure an existing one), which is a custom
 * UI component for setting an <input> value.
 *
 * Either supply a pre-existing Slider Element, or an id plus the minimum,
 * maximum, and initial values (and optionally a filter and label).
 *
 * @param options {Object}
 *     {
 *       el: {Element} optional; existing Slider's <input>
 *       filter: {Function} optional; filters content based on Slider's value
 *       id: {String} optional; new Slider's id value
 *       label: {String} optional; new Slider's filter <label>
 *       max: {Number} optional; new Slider's maximum value
 *       min: {Number} optional; new Slider's minimum value
 *       val: {Number} optional; new Slider's initial value
 *     {
 *
 * @return _this {Object}
 *     {
 *       addListeners: {Function}
 *       destroy: {Function}
 *       getHtml: {Function}
 *       setValue: {Function}
 *     {
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
      _removeListeners,
      _update;


  _this = {};

  _initialize = function (options = {}) {
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
   * Get the CSS value for the colored section of the Slider track.
   *
   * @return {String}
   */
  _getValue = function () {
    var max = Number(_el.max),
        min = Number(_el.min) || 0,
        value = Number(_el.value);

    if (max && value) {
      value = Math.floor(100 * (value - min) / (max - min));
    }

    return value + '% 100%';
  };

  /**
   * Remove event listeners.
   */
  _removeListeners = function () {
    if (_el) {
      _el.removeEventListener('input', _update);
    }
  };

  /**
   * Event handler that updates the Slider track and optionally filters the
   * displayed content.
   */
  _update = function () {
    _this.setValue();

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
    _output = container.querySelector('output');
    _slider = container.querySelector('.slider');

    _el.addEventListener('input', _update);
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _removeListeners();

    _initialize = null;

    _data = null;
    _el = null;
    _filter = null;
    _output = null;
    _slider = null;
    _style = null;

    _getValue = null;
    _removeListeners = null;
    _update = null;

    _this = null;
  };

  /**
   * Get the Slider's HTML.
   *
   * @return {String}
   */
  _this.getHtml = function () {
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
   * Set the displayed value and inline styles for the colored section of the
   * Slider.
   */
  _this.setValue = function () {
    var newStyles = '',
        oldStyles = /`#${input.id}[^#]+`/g,
        value = _getValue(),
        vendorAttrs = ['webkit-slider-runnable', 'moz-range'];

    vendorAttrs.forEach(attr =>
      newStyles += `#${_el.id}::-${attr}-track {background-size:${value} !important}`
    );

    _output.value = _el.value;

    // Set the inline CSS styles in <style#sliders>
    _style.textContent = _style.textContent.replace(oldStyles, '');
    _style.appendChild(document.createTextNode(newStyles));

    // Set the style attribute on the control
    _slider.style.setProperty('--val', _el.value);
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Slider;
