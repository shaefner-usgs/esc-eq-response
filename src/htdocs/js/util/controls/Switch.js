/* global L */
'use strict';


var _DEFAULTS = {
  el: null, // existing Switch's <input>
  id: '',   // new Switch's id value
  name: ''  // new Switch's display name
};


/**
 * Create a new Switch (or configure an existing one), which is a checkbox
 * rendered as a sliding toggle.
 *
 * Either supply a pre-existing Switch Element or an id and display name.
 *
 * @param options {Object}
 *     {
 *       el: {Element} optional
 *       id: {String} optional
 *       name: {String} optional
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
var Switch = function (options) {
  var _this,
      _initialize,

      _data,
      _el,
      _label,

      _toggle;


  _this = {};

  _initialize = function (options = {}) {
    options = Object.assign({}, _DEFAULTS, options);

    _data = {
      id: options.id,
      name: options.name
    };
    _el = options.el;

    if (_el) {
      _this.addListeners();
    }
  };

  /**
   * Event handler that toggles the Switch.
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
   * Destroy this Class.
   */
  _this.destroy = function () {
    _initialize = null;

    _data = null;
    _el = null;
    _label = null;

    _toggle = null;

    _this = null;
  };

  /**
   * Get the HTML content for the Switch.
   *
   * @return {String}
   */
  _this.getContent = function () {
    return L.Util.template(
      '<input type="checkbox" id="{id}" value="" class="switch">' +
      '<label for="{id}"><span>{name}</span></label>',
      _data
    );
  };

  /**
   * Remove event listeners.
   */
  _this.removeListeners = function () {
    _label.removeEventListener('click', _toggle);
  };

  /**
   * Set the Switch on or off (and show/hide its optional details).
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
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Switch;
