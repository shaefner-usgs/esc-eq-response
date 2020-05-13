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

      _app,
      _el,

      _addListeners,
      _hide,
      _removeNode,
      _show;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _el = options.el || document.createElement('div');
  };

  /**
   * Add listeners for close/reload buttons on an Error item
   *
   * @param div {Element}
   * @param id {String}
   *     Feature id
   */
  _addListeners = function (div, id) {
    var close,
        reload;

    close = div.querySelector('.close');
    reload = div.querySelector('.reload');

    close.addEventListener('click', function(e) {
      e.preventDefault();
      _this.removeItem(id);
    });

    reload.addEventListener('click', function(e) {
      e.preventDefault();
      _this.removeItem(id);
      _app.Features.instantiateFeature(id);
    });
  };

  /**
   * Hide status bar container
   */
  _hide = function () {
    _el.classList.add('hide');
  };

  /**
   * Remove a status bar entry (node) from DOM
   *
   * @param el {Element}
   */
  _removeNode = function (el) {
    var parent;

    parent = el.parentNode;
    if (parent) {
      parent.removeChild(el);

      // Due to a timing issue w/ CSS animation, 'hide' class is not always set
      if (!parent.hasChildNodes()) {
        parent.style.display = 'none';
      }
    }
  };

  /**
   * Show status bar container
   */
  _show = function () {
    _el.classList.remove('hide');
    _el.style.display = 'block'; // undo setting to 'none' in _removeNode()
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add an error to status bar
   *
   * @param id {String}
   *     Feature id
   * @param errorMsg {String}
   */
  _this.addError = function (id, errorMsg) {
    var div;

    div = document.createElement('div');
    div.classList.add(id, 'error');
    div.innerHTML = errorMsg +
      '<a href="#" class="reload"></a>' +
      '<a href="#" class="close"></a>';

    // Remove any leftover items with this id, then add item
    _this.removeItem(id);
    _el.appendChild(div);
    _addListeners(div, id);
    _show();
  };

  /**
   * Add an item to status bar
   *
   * @param item {Object}
   *   {
   *     id: {String}, (Feature id)
   *     name: {String} (optional)
   *   }
   * @param options {Object}
   *   {
   *     append: {String}, (optional)
   *     prepend: {String} (optional)
   *   }
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
    options = Util.extend({}, defaults, options);

    msg = '';
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

    div = document.createElement('div');
    div.classList.add(item.id);
    div.innerHTML = '<h4>' + msg + '</h4>';

    // Remove any leftover items with this id, then add item
    _this.removeItem(item.id);
    _el.appendChild(div);
    _show();
  };

  /**
   * Check if an error exists for item
   *
   * @param id {String}
   *     Feature id
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
   * Remove an item from status bar (and hide status bar if empty)
   *
   * @param id {String}
   *     Feature id
   */
  _this.removeItem = function (id) {
    var i,
        items;

    items = _el.querySelectorAll('.' + id);
    for (i = 0; i < items.length; i ++) {
      if (_el.children.length === 1) {
        _hide();

        // Don't remove node until after CSS hide transition is complete
        window.setTimeout(_removeNode, 500, items[i]);
      } else {
        _removeNode(items[i]);
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
