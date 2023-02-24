'use strict';


/**
 * Create a new Switch (or configure an existing one), which is a custom on/off
 * toggle that replaces a checkbox.
 *
 * Either supply a pre-existing Switch Element or an id and display name.
 *
 * @param options {Object}
 *     {
 *       el: {Element} optional; existing Switch's <input>
 *       id: {String} optional; new Switch's id value
 *       name: {String} optional; new Switch's display name
 *     {
 *
 * @return _this {Object}
 *     {
 *       addListeners: {Function}
 *       destroy: {Function}
 *       getHtml: {Function}
 *       removeListeners: {Function}
 *       setValue: {Function}
 *     }
 */
var Switch = function (options) {
  var _this,
      _initialize,

      _el,
      _id,
      _label,
      _name,

      _toggle;


  _this = {};

  _initialize = function (options = {}) {
    _el = options.el;
    _id = options.id;
    _name = options.name;

    if (_el) {
      _this.addListeners();
    }
  };

  /**
   * Event handler that toggles the Switch (and optional details).
   *
   * @param e {Event}
   */
  _toggle = function (e) {
    e.preventDefault();

    _this.setValue(!_el.checked);
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add event listeners.
   *
   * @param el {Element} optional; default is _el
   *     Switch's <input>
   */
  _this.addListeners = function (el = _el) {
    _el = el; // in case it wasn't set in _initialize()
    _label = _el.parentNode.querySelector('label');

    _label.addEventListener('click', _toggle);
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _initialize = null;

    _el = null;
    _id = null;
    _label = null;
    _name = null;

    _toggle = null;

    _this = null;
  };

  /**
   * Get the Switch's HTML.
   *
   * @return {String}
   */
  _this.getHtml = function () {
    return '' +
      `<input type="checkbox" id="${_id}" value="" class="switch">` +
      `<label for="${_id}"><span>${_name}</span></label>`;
  };

  /**
   * Remove event listeners.
   */
  _this.removeListeners = function () {
    _label.removeEventListener('click', _toggle);
  };

  /**
   * Set the Switch on or off.
   *
   * @param checked {Boolean} default is true
   *
   * @return _this {Object}
   */
  _this.setValue = function (checked = true) {
    var details = _el.parentNode.querySelector('input ~ .details');

    if (details) {
      if (checked) {
        details.classList.remove('hide');
      } else {
        details.classList.add('hide');
      }
    }

    _el.checked = checked;

    return _this; // enable chaining
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Switch;
