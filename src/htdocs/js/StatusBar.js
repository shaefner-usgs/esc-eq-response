'use strict';


/**
 * Show the loading state of app and external feed data and log errors.
 *
 * @param options {Object}
 *   {
 *     app: {Object} Application
 *     el: {Element}
 *   }
 *
 * @return _this {Object}
 *   {
 *     addError: {Function}
 *     addItem: {Function}
 *     clearItems: {Function}
 *     hasError: {Function}
 *     postInit: {Function}
 *     removeItem: {Function}
 *     reset: {Function}
 *   }
 */
var StatusBar = function (options) {
  var _this,
      _initialize,

      _app,
      _el,

      _addListeners,
      _getMessage,
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
   * Add event listeners.
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

    // Remove StatusBar item
    if (close) {
      close.addEventListener('click', e => {
        e.preventDefault();
        _this.removeItem(id);
      });
    }

    // Reload a Feature or catalog search
    if (reload) {
      reload.addEventListener('click', e => {
        e.preventDefault();
        _this.removeItem(id);

        if (id === 'search') {
          _app.SearchBar.searchCatalog();
        } else if (id === 'significantEqs') {
          _app.SignificantEqs.loadFeed();
        } else { // Feature
          _app.Features.createFeature(id);
        }
      });
    }
  };

  /**
   * Get the loading message.
   *
   * @param item {Object}
   * @param opts {Object}
   *
   * @return {String}
   */
  _getMessage = function (item, opts) {
    var loader,
        msg;

    loader = '<span class="ellipsis"><span>.</span><span>.</span><span>.</span></span>';
    msg = '';

    if (item.name) {
      msg += item.name;
    }
    if (opts.append) {
      msg += ' ' + opts.append;
    }
    if (opts.prepend) {
      msg = opts.prepend + ' ' + msg;
    }

    return msg += loader;
  };

  /**
   * Hide the StatusBar container.
   */
  _hide = function () {
    _el.classList.add('hide');
  };

  /**
   * Remove a StatusBar item (node) from the DOM.
   *
   * @param el {Element}
   */
  _removeNode = function (el) {
    var parent = el.parentNode;

    if (parent) {
      parent.removeChild(el);

      // Due to a timing issue w/ CSS transition, 'hide' class is not always set
      if (!parent.hasChildNodes()) {
        parent.style.display = 'none';
      }
    }
  };

  /**
   * Show the StatusBar container.
   */
  _show = function () {
    _el.style.display = 'block'; // undo setting to 'none' in _removeNode()

    _el.classList.remove('hide');
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add an error to the StatusBar (and show it).
   *
   * @param error {Object}
   *   {
   *     id: {String} Feature id
   *     message: {String} error message
   *     status: {Number|String} optional; status code or 'timeout'
   *   }
   */
  _this.addError = function (error) {
    var content,
        div,
        isFeature,
        isSearch,
        isSignificantEqs;

    content = error.message;
    div = document.createElement('div');
    isFeature = _app.Features.isFeature(error.id);
    isSearch = (error.id === 'search' ? true : false);
    isSignificantEqs = (error.id === 'significantEqs' ? true : false);

    if (
      (isFeature || isSearch || isSignificantEqs) &&
      error.status !== 400 &&
      error.status !== 404
    ) {
      content += '<a href="#" class="reload"></a>';
    }

    content += '<a href="#" class="close"></a>';
    div.innerHTML = content;

    div.classList.add(error.id, 'error');

    // Remove any leftover items with this id, then add it
    _this.removeItem(error.id);
    _el.appendChild(div);
    _addListeners(div, error.id);
    _show();
  };

  /**
   * Add an item to the StatusBar (and show it).
   *
   * @param item {Object}
   *   {
   *     id: {String} Feature id
   *     name: {String} optional
   *   }
   * @param opts {Object}
   *   {
   *     append: {String} optional
   *     prepend: {String} optional
   *   }
   */
  _this.addItem = function (item, opts) {
    var defaults,
        div,
        message;

    defaults = {
      append: '',
      prepend: 'Loading'
    };
    div = document.createElement('div');
    opts = Object.assign({}, defaults, opts);
    message = _getMessage(item, opts);

    div.innerHTML = '<h4>' + message + '</h4>';

    div.classList.add(item.id);

    // Remove any leftover items with this id, then add it
    _this.removeItem(item.id);
    _el.appendChild(div);
    _show();
  };

  /**
   * Clear all items from the StatusBar (and hide it).
   */
  _this.clearItems = function () {
    while (_el.firstChild) {
      _el.removeChild(_el.lastChild); // faster to remove lastChild
    }

    _hide();
  };

  /**
   * Check if an error already exists for a given item.
   *
   * @param id {String}
   *     Feature id
   *
   * @return {Boolean}
   */
  _this.hasError = function (id) {
    var error = _el.querySelector('.' + id + '.error');

    if (error) {
      return true;
    }

    return false;
  };

  /**
   * Initialization that depends on other Classes being ready before running.
   */
  _this.postInit = function () {
    _this.removeItem('initial'); // remove initial "Loading..." message
  };

  /**
   * Remove an item from the StatusBar (and hide it if it's empty).
   *
   * @param id {String}
   *     Feature id
   */
  _this.removeItem = function (id) {
    var items = _el.querySelectorAll('.' + id);

    items.forEach(item => { // also remove duplicate items
      if (_el.children.length === 1) {
        _hide();

        // Don't remove node until CSS transition is complete
        setTimeout(_removeNode, 500, item);
      } else {
        _removeNode(item);
      }
    });
  };

  /**
   * Clear all items from the StatusBar.
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
