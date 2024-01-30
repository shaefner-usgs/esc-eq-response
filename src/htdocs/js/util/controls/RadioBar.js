'use strict';


var _DEFAULTS = {
  el: null,    // existing RadioBar's <ul>
  id: '',      // new RadioBar's id value
  items: [],   // new RadioBar's items
  selected: '' // new RadioBar's initially selected item
};


/**
 * Create a new RadioBar (or configure an existing one), which is a list of
 * mutually exclusive items rendered as a navbar.
 *
 * Either supply a pre-existing RadioBar Element, or an id plus the items (and
 * optionally the initially selected item's id value).
 *
 * @param options {Object}
 *     {
 *       el: {Element} optional
 *       id: {String} optional
 *       items: {Array} optional
 *       selected: {String} optional
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
      _data,
      _el,

      _unsetOptions;


  _this = {};

  _initialize = function (options = {}) {
    options = Object.assign({}, _DEFAULTS, options);

    _buttons = []; // default
    _data = {
      id: options.id,
      items: options.items,
      selected: options.selected
    };
    _el = options.el;

    if (_el) {
      _this.addListeners();
    }
  };

  /**
   * Unhighlight all options (+ hide their content).
   *
   * @param el {Element}
   */
  _unsetOptions = function (el) {
    var option,
        sibling = el.parentNode.firstElementChild;

    while (sibling) {
      sibling.classList.remove('selected'); // button

      if (sibling.id) {
        option = document.querySelector(`.option.${sibling.id}`);

        option?.classList.add('hide'); // content
      }

      sibling = sibling.nextElementSibling;
    }
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add event listeners.
   *
   * @param el {Element} optional; default is _el
   *     RadioBar's <ul> container
   */
  _this.addListeners = function (el = _el) {
    _buttons = el.querySelectorAll('li');
    _el = el; // in case it wasn't set in _initialize()

    _buttons.forEach(button => button.addEventListener('click', e => {
      if (button.classList.contains('selected')) {
        e.stopImmediatePropagation(); // ignore subsequent clicks
      } else {
        _this.setOption(button);
      }
    }));
  };

  /**
   * Destroy this Class.
   */
  _this.destroy = function () {
    _initialize = null;

    _buttons = null;
    _data = null;
    _el = null;

    _unsetOptions = null;

    _this = null;
  };

  /**
   * Get the HTML content for the RadioBar.
   *
   * @return html {String}
   */
  _this.getContent = function () {
    var html = `<ul id="${_data.id}" class="options">`;

    _data.items.forEach(item => {
      var classNames,
          classList = [];

      if (item.class) {
        classList.push(item.class);
      }
      if (item.id === _data.selected) {
        classList.push('selected');
      }

      classNames = classList.join(' ');
      html += `<li class="${classNames}" id="${item.id}">${item.name}</li>`;
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
   * Highlight the selected option (+ show its content, if applicable).
   *
   * @param el {Element}
   *     selected <li>
   *
   * @return _this {Object}
   */
  _this.setOption = function (el) {
    var option, value;

    if (el) {
      value = el.id || el.className || '';

      _unsetOptions(el);
      el.classList.add('selected'); // button
      sessionStorage.setItem(_el.id, value);

      if (el.id) {
        option = document.querySelector(`.option.${el.id}`);

        option?.classList.remove('hide'); // content
      }
    }

    return _this; // enable chaining
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = RadioBar;
