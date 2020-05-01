'use strict';


var Util = require('hazdev-webutils/src/util/Util');


/**
 * Set up a status bar to inform user of app's status (loading state, errors)
 *
 * @param options {Object}
 *   {
 *     el: {Element}
 *   }
 *
 * @return _this {Object}
 *   {
 *     addError: {Function},
 *     addItem: {Function},
 *     hasError: {Function},
 *     removeItem: {Function},
 *     reset: {Function}
 *   }
 */
var StatusBar = function (options) {
  var _this,
      _initialize,

      _el,

      _hide,
      _removeItem,
      _show;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _el = options.el || document.createElement('div');
  };

  /**
   * Hide status bar container (uses css slide-down animation)
   */
  _hide = function () {
    _el.classList.add('hide');
  };

  /**
   * Remove a status bar entry from DOM
   *
   * @param el {Element}
   */
  _removeItem = function (el) {
    var parent;

    parent = el.parentNode;
    if (parent) {
      if (parent.children.length === 1) {
        _hide(); // should already be hidden, but just in case...
      }
      parent.removeChild(el);
    }
  };

  /**
   * Show status bar container (uses css slide-up animation)
   */
  _show = function () {
    _el.classList.remove('hide');
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add an error to status bar
   *
   * @param item {Object}
   *   {
   *     id: {String}
   *   }
   * @param errorMsg {String}
   */
  _this.addError = function (item, errorMsg) {
    var closeButton,
        error;

    error = document.createElement('div');
    error.classList.add(item.id, 'error');
    error.innerHTML = errorMsg + '<a href="#" class="close"></a>';

    closeButton = error.querySelector('.close');
    closeButton.addEventListener('click', function(e) {
      e.preventDefault();
      _this.removeItem(item.id);
    });

    // Remove any leftover items for this item before adding another
    _this.removeItem(item.id);

    _el.appendChild(error);
    _show();
  };

  /**
   * Add an item to status bar
   *
   * @param item {Object}
   *   {
   *     id: {String},
   *     name: {String} (optional)
   *   }
   * @param options {Object}
   *     optional
   */
  _this.addItem = function (item, options) {
    var animEllipsis,
        defaults,
        div,
        msg;

    animEllipsis = '<span>.</span><span>.</span><span>.</span>';
    defaults = {
      append: '',
      prepend: 'Loading'
    };
    div = document.createElement('div');
    msg = '';
    options = Util.extend({}, defaults, options);

    if (item.name) {
      msg = item.name;
    }
    if (options.append) {
      msg += ' ' + options.append;
    }
    if (options.prepend) {
      msg = options.prepend + ' ' + msg;
    }
    msg += animEllipsis;

    // Remove any leftover items with this id, then add item
    _this.removeItem(item.id);

    div.classList.add(item.id);
    div.innerHTML = '<h4>' + msg + '</h4>';
    _el.appendChild(div);

    _show();
  };

  /**
   * Check if an error exists for item
   *
   * @param id {String}
   *
   * @return {Boolean}
   */
  _this.hasError = function (id) {
    var error;

    error = _el.querySelector('.' + id + '.error');
    if (error) {
      return true;
    }
  };

  /**
   * Wrapper method to remove item from status bar (and hide status bar if empty)
   *
   * @param id {String}
   */
  _this.removeItem = function (id) {
    var i,
        items;

    items = _el.querySelectorAll('.' + id);
    for (i = 0; i < items.length; i ++) {
      if (_el.children.length === 1) {
        // Leave final item up a bit longer
        window.setTimeout(_hide, 500);
        // Don't remove from DOM until after CSS hide transition is complete
        window.setTimeout(_removeItem, 1500, items[i]);
      } else {
        _removeItem(items[i]);
      }
    }
  };

  /**
   * Clear all items from status bar
   */
  _this.reset = function () {
    _el.innerHTML = '';
    _hide();
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = StatusBar;
