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
 *       getContent: {Function}
 *       getIds: {Function}
 *       removeListeners: {Function}
 *       setOption: {Function}
 *     }
 */
var RadioBar = function (options) {
  var _this,
      _initialize,

      _buttons,
      _id,
      _items,
      _selected,

      _getOption;


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
   * @return option {Mixed <Element|null>}
   */
  _getOption = function (id) {
    var option = null;

    if (id) {
      option = document.querySelector('.option.' + id);
    }

    return option;
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

    _buttons.forEach(button => button.addEventListener('click', () => {
      _this.setOption(button);
    }));
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _initialize = null;

    _buttons = null;
    _id = null;
    _items = null;
    _selected = null;

    _getOption = null;

    _this = null;
  };

  /**
   * Get the HTML content for the RadioBar.
   *
   * @return html {String}
   */
  _this.getContent = function () {
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
   * Remove event listeners.
   */
  _this.removeListeners = function () {
    _buttons.forEach(button => button.removeEventListener('click', () => {
      _this.setOption(button);
    }));
  };

  /**
   * Highlight the selected option's button (+ show its content, if applicable).
   * Unselect (and hide) all other options.
   *
   * @param el {Element}
   *
   * @return _this {Object}
   */
  _this.setOption = function (el) {
    var option = _getOption(el.id),
        sibling = el.parentNode.firstElementChild;

    // Selected option
    el.classList.add('selected'); // button

    if (option) {
      option.classList.remove('hide'); // content
    }

    // Unselected options
    while (sibling) {
      if (sibling !== el) {
        option = _getOption(sibling.id);

        sibling.classList.remove('selected');

        if (option) {
          option.classList.add('hide');
        }
      }

      sibling = sibling.nextElementSibling;
    }

    return _this; // enable chaining
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = RadioBar;
