'use strict';


/**
 * Create a new RadioBar (or configure an existing one), which is a list of
 * mutually exclusive items rendered as a navbar.
 *
 * Either supply a pre-existing RadioBar Element, or an id plus the items (and
 * optionally the initially selected item's id value).
 *
 * @param options {Object}
 *     {
 *       el: {Element} optional; existing RadioBar's <ul>
 *       id: {String} optional; new RadioBar's id value
 *       items: {Array} optional; new RadioBar's items
 *       selected: {String} optional; new RadioBar's initially selected item id
 *     {
 *
 * @return _this {Object}
 *     {
 *       addListeners: {Function}
 *       destroy: {Function}
 *       getHtml: {Function}
 *       getIds: {Function}
 *       setOption: {Function}
 *     {
 */
var RadioBar = function (options) {
  var _this,
      _initialize,

      _buttons,
      _id,
      _items,
      _selected,

      _getOption,
      _removeListeners;


  _this = {};

  _initialize = function (options = {}) {
    _buttons = []; // default
    _id = options.id;
    _items = options.items;
    _selected = options.selected || '';

    if (options.el) {
      _this.addListeners(options.el);
    }
  };

  /**
   * Get the given item's optional content node, if it exists.
   *
   * @param id {String}
   *     item's id value
   *
   * @return option {Element|null}
   */
  _getOption = function (id) {
    var option = null;

    if (id) {
      option = document.querySelector('.option.' + id);
    }

    return option;
  };

  /**
   * Remove event listeners.
   */
  _removeListeners = function () {
    _buttons.forEach(button => button.removeEventListener('click', _this.setOption));
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add event listeners.
   *
   * @param el {Element}
   *     RadioBar's <ul> container
   */
  _this.addListeners = function (el) {
    _buttons = el.querySelectorAll('li');

    _buttons.forEach(button => button.addEventListener('click', _this.setOption));
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _removeListeners();

    _initialize = null;

    _buttons = null;
    _id = null;
    _items = null;
    _selected = null;

    _getOption = null;
    _removeListeners = null;

    _this = null;
  };

  /**
   * Get the RadioBar's HTML.
   *
   * @return html {String}
   */
  _this.getHtml = function () {
    var html = `<ul id="${_id}" class="options">`;

    _items.forEach(item => {
      var selAttr = '';

      if (item.id === _selected) {
        selAttr = 'class="selected"';
      }

      html += `<li id="${item.id}" ${selAttr}>${item.name}</li>`;
    });

    html += '</ul>';

    return html;
  };

  /**
   * Get the id values of the RadioBar's options.
   *
   * @return ids {Array}
   */
  _this.getIds = function () {
    var ids = [];

    _buttons.forEach(button => ids.push(button.id));

    return ids;
  };

  /**
   * Highlight the selected option's button (+ show its content, if applicable).
   * Unselect (and hide) all other options.
   */
  _this.setOption = function () {
    var option = _getOption(this.id),
        sibling = this.parentNode.firstElementChild;

    // Selected option
    this.classList.add('selected'); // button

    if (option) {
      option.classList.remove('hide'); // content
    }

    // Unselected options
    while (sibling) {
      if (sibling !== this) {
        option = _getOption(sibling.id);

        sibling.classList.remove('selected');

        if (option) {
          option.classList.add('hide');
        }
      }

      sibling = sibling.nextElementSibling;
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = RadioBar;
