'use strict';


/**
 * Sets up a status bar to inform user of app's status
 *
 * @param options {Object}
 *   {
 *     el: {Element}
 *   }
 */
var StatusBar = function (options) {
  var _this,
      _initialize,

      _el,

      _getClassName,
      _hideStatusBar,
      _removeFromDom,
      _showStatusBar;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _el = options.el || document.createElement('div');
  };

  /**
   * Get className for status bar item (first word in featureName, lowercased)
   *
   * @param featureName {String}
   *
   * @return {String}
   */
  _getClassName = function (featureName) {
    return /[^\s]+/.exec(featureName)[0].toLowerCase();
  };

  /**
   * Hide status bar (using css slide-down animation)
   */
  _hideStatusBar = function () {
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
        _hideStatusBar(); // should already be hidden, but just in case...
      }
      parent.removeChild(el);
    }
  };

  /**
   * Show status bar (using css slide-up animation)
   */
  _showStatusBar = function () {
    _el.classList.remove('hide');
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add error to status bar
   *
   * @param featureName {String}
   * @param errorMsg {String}
   */
  _this.addError = function (featureName, errorMsg) {
    var error;

    error = document.createElement('div');
    error.classList.add(_getClassName(featureName), 'error');
    error.innerHTML = errorMsg;

    // Remove any leftover items for this feature
    _this.removeItem(featureName);

    _el.appendChild(error);
    _showStatusBar();
  };

  /**
   * Add item to status bar
   *
   * @param featureName {String}
   *     pass in 'rendering' to display generic loading message
   */
  _this.addItem = function (featureName) {
    var animEllipsis,
        className,
        item,
        refNode;

    animEllipsis = '<span>.</span><span>.</span><span>.</span>';
    className = _getClassName(featureName);
    item = document.createElement('div');
    item.classList.add(className);

    // Remove any leftover items for this feature
    _this.removeItem(featureName);

    if (className === 'rendering') { // rendering app panes
      item.innerHTML = '<h4>Loading' + animEllipsis + '</h4>';
      _el.appendChild(item);
    }
    else { // loading feature
      item.innerHTML = '<h4>Loading ' + featureName + animEllipsis + '</h4>';
      refNode = _el.querySelector('.rendering');
      // Insert loading feature msgs 'above' rendering msgs
      _el.insertBefore(item, refNode);
    }

    _showStatusBar();
  };

  /**
   * Check if error(s) exist(s)
   *
   * @param featureName {String}
   *
   * @return {Boolean}
   */
  _this.hasError = function (featureName) {
    var error;

    error = _el.querySelector('.' + _getClassName(featureName) + '.error');
    if (error) {
      return true;
    }
  };

  /**
   * Remove item from status bar (and hide/remove status bar if empty)
   *
   * @param featureName {String}
   */
  _this.removeItem = function (featureName) {
    var i,
        items;

    items = _el.querySelectorAll('.' + _getClassName(featureName));
    for (i = 0; i < items.length; i ++) {
      if (_el.children.length === 1) {
        _hideStatusBar();
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
    _hideStatusBar();
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = StatusBar;
