/* global L */
'use strict';


/**
 * Create a new range Slider (or configure an existing one), which is a custom
 * UI component for setting an <input> value.
 *
 * Either supply a pre-existing Slider Element, or an id plus minimum, maximum,
 * and initial values (and optionally a filter and label).
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
      _filter,
      _id,
      _input,
      _label,
      _output,
      _slider,
      _style,

      _getValue,
      _removeListeners,
      _update;


  _this = {};

  _initialize = function (options = {}) {
    var el = options.el?.closest('.slider-container');

    _data = {
      max: options.max,
      min: options.min,
      val: options.val
    };
    _filter = options.filter;
    _id = options.id;
    _label = options.label;
    _style = document.getElementById('sliders');

    // Add a single <style> tag for all Sliders' styles
    if (!_style) {
      _style = document.createElement('style');
      _style.id = 'sliders';

      document.body.appendChild(_style);
    }

    if (el) {
      _this.addListeners(el);
    }
  };

  /**
   * Get the CSS value for the colored section of the Slider track.
   *
   * @return {String}
   */
  _getValue = function () {
    var max = Number(_input.max),
        min = Number(_input.min) || 0,
        value = Number(_input.value);

    if (max) {
      value = Math.floor(100 * (value - min) / (max - min));
    }

    return value + '% 100%';
  };

  /**
   * Remove event listeners.
   */
  _removeListeners = function () {
    _input.removeEventListener('input', _update);
  };

  /**
   * Event handler that updates the Slider track and optionally filters the
   * displayed content.
   */
  _update = function () {
    _this.setValue(this);

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
   * @param el {Element}
   *     Slider's parent <div> container
   */
  _this.addListeners = function (el) {
    _input = el.querySelector('input');
    _output = el.querySelector('output');
    _slider = el.querySelector('.slider');

    _input.addEventListener('input', _update);
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _removeListeners();

    _initialize = null;

    _data = null;
    _filter = null;
    _id = null;
    _input = null;
    _label = null;
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
    var template,
        data = Object.assign({}, _data, {
          id: _id,
          label: _label
        });

    template =
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

    return L.Util.template(template, data);
  };

  /**
   * Set the displayed value and inline styles for the colored section of the
   * Slider.
   */
  _this.setValue = function () {
    var newRules = '',
        oldRules = /`#${input.id}[^#]+`/g,
        value = _getValue(),
        vendorAttrs = ['webkit-slider-runnable', 'moz-range'];

    vendorAttrs.forEach(attr =>
      newRules += `#${_input.id}::-${attr}-track {background-size:${value} !important}`
    );

    _output.value = _input.value;

    // Remove the 'old' CSS rules from <style>, then add new ones
    _style.textContent = _style.textContent.replace(oldRules, '');
    _style.appendChild(document.createTextNode(newRules));

    // Set the style attribute on the control
    _slider.style.setProperty('--val', _input.value);
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Slider;
