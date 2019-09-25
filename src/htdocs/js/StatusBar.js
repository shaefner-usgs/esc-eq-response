'use strict';


/**
 * Set up a status bar to inform user of app's status (loading state, errors)
 *
 * @param options {Object}
 *   {
 *     app: {Object}, // Application
 *     el: {Element}
 *   }
 *
 * @return _this {Object}
 *   {
 *     addError: {Function},
 *     addLoadingMsg: {Function},
 *     hasError: {Function},
 *     remove: {Function},
 *     reset: {Function}
 *   }
 */
var StatusBar = function (options) {
  var _this,
      _initialize,

      _el,

      _doRemove,
      _hide,
      _show;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _el = options.el || document.createElement('div');
  };

  /**
   * Remove a status bar entry from DOM
   *
   * @param el {Element}
   */
  _doRemove = function (el) {
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
   * Hide status bar container (uses css slide-down animation)
   */
  _hide = function () {
    _el.classList.add('hide');
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
   * @param feature {Object}
   * @param errorMsg {String}
   */
  _this.addError = function (feature, errorMsg) {
    var closeButton,
        error;

    error = document.createElement('div');
    error.classList.add(feature.id, 'error');
    error.innerHTML = errorMsg + '<a href="#" class="close"></a>';

    closeButton = error.querySelector('.close');
    closeButton.addEventListener('click', function(e) {
      e.preventDefault();
      _this.remove(feature.id);
    });

    // Remove any leftover items for this Feature before adding another
    _this.remove(feature.id);

    _el.appendChild(error);
    _show();
  };

  /**
   * Add loading message to status bar
   *
   * @param feature {Object}
   *     optional; displays generic loading message if no Feature provided
   */
  _this.addLoadingMsg = function (feature) {
    var animEllipsis,
        id,
        item;

    animEllipsis = '<span>.</span><span>.</span><span>.</span>';
    id = 'rendering'; // generic id

    if (feature && feature.hasOwnProperty('id')) {
      id = feature.id;
    }

    item = document.createElement('div');
    item.classList.add(id);

    // Remove any leftover items for this Feature
    _this.remove(id);

    if (id === 'rendering') { // rendering app pane
      item.innerHTML = '<h4>Loading' + animEllipsis + '</h4>';
      _el.appendChild(item);
    } else { // loading Feature
      item.innerHTML = '<h4>Loading ' + feature.name + animEllipsis + '</h4>';

      // Insert loading Feature msgs 'above' rendering msgs
      _el.insertBefore(item, _el.querySelector('.rendering'));
    }

    _show();
  };

  /**
   * Check if error exists for Feature
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
  _this.remove = function (id) {
    var i,
        items;

    items = _el.querySelectorAll('.' + id);
    for (i = 0; i < items.length; i ++) {
      if (_el.children.length === 1) {
        _hide();

        // Don't remove last item until after hide css transition is complete
        window.setTimeout(_doRemove, 500, items[i]);
      } else {
        _doRemove(items[i]);
      }
    }
  };

  /**
   * Clear all messages from status bar
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
