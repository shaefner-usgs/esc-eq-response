'use strict';


/**
 * Set up a status bar to inform user of app's status (loading state, errors)
 *
 * @param options {Object}
 *   {
 *     app: {Object}
 *     el: {Element}
 *   }
 */
var StatusBar = function (options) {
  var _this,
      _initialize,

      _el,

      _hide,
      _removeFromDom,
      _show;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _el = options.el || document.createElement('div');
  };

  /**
   * Hide status bar (uses css slide-down animation)
   */
  _hide = function () {
    _el.classList.add('hide');
  };

  /**
   * Remove status bar entry from DOM
   *
   * @param el {Element}
   */
  _removeFromDom = function (el) {
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
   * Show status bar (uses css slide-up animation)
   */
  _show = function () {
    _el.classList.remove('hide');
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add error to status bar
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

    // Remove any leftover items for this feature
    _this.remove(feature.id);

    _el.appendChild(error);
    _show();
  };

  /**
   * Add loading message to status bar
   *
   * @param feature {Object}
   *     optional; displays generic loading message if no feature
   */
  _this.addLoadingMsg = function (feature) {
    var animEllipsis,
        id,
        item;

    animEllipsis = '<span>.</span><span>.</span><span>.</span>';
    id = 'rendering';
    if (feature && feature.hasOwnProperty('id')) {
      id = feature.id;
    }
    item = document.createElement('div');
    item.classList.add(id);

    // Remove any leftover items for this feature
    _this.remove(id);

    if (id === 'rendering') { // rendering app pane
      item.innerHTML = '<h4>Loading' + animEllipsis + '</h4>';
      _el.appendChild(item);
    }
    else { // loading feature
      item.innerHTML = '<h4>Loading ' + feature.name + animEllipsis + '</h4>';

      // Insert loading feature msgs 'above' rendering msgs
      _el.insertBefore(item, _el.querySelector('.rendering'));
    }

    _show();
  };

  /**
   * Check if error exists for feature
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
   * Remove item from status bar (and hide/remove status bar if empty)
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

        // Don't remove last item until after css transition to hide is complete
        window.setTimeout(_removeFromDom, 500, items[i]);
      } else {
        _removeFromDom(items[i]);
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
