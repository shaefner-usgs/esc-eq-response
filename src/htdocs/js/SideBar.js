'use strict';


var AppUtil = require('util/AppUtil');


/**
 * Toggle the SideBar on/off (and render it properly), set the 'sidebar' URL
 * parameter, and remember each SideBar's scroll position. Also toggle the map
 * links in the SideBar.
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *       el: {Element}
 *     }
 *
 * @return _this {Object}
 *     {
 *       reset: {Function}
 *       toggle: {Function}
 *       toggleLinks: {Function}
 *     }
 */
var SideBar = function (options) {
  var _this,
      _initialize,

      _app,
      _el,
      _throttler,

      _addListeners,
      _saveScrollPosition,
      _setScrollPosition;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;
    _el = options.el;

    _addListeners();
    _this.reset();
  };

  /**
   * Add event listeners.
   */
  _addListeners = function () {
    var close = _el.querySelector('a.icon-close');

    // Close the SideBar
    close.addEventListener('click', () =>
      _this.toggle('off')
    );

    // Save the scroll position
    _el.addEventListener('scroll', _saveScrollPosition);
  };

  /**
   * Save the current scroll position in sessionStorage.
   */
  _saveScrollPosition = function () {
    var name = AppUtil.getParam('sidebar'),
        position = _el.scrollTop;

    clearTimeout(_throttler);

    // Throttle scroll event
    _throttler = setTimeout(() =>
      sessionStorage.setItem(name, position), 250
    );
  };

  /**
   * Set the scroll position to its previously saved value.
   *
   * @param name {String}
   */
  _setScrollPosition = function (name) {
    var position = Number(sessionStorage.getItem(name));

    if (position !== null) {
      _el.scrollTop = position;
    }
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Reset to default state.
   */
  _this.reset = function () {
    var sidebars = _el.querySelectorAll('section.bar');

    sidebars.forEach(sidebar => {
      var name = sidebar.getAttribute('id').replace('-bar', '');

      sessionStorage.setItem(name, 0);
    });
  };

  /**
   * Toggle the SideBar on/off and set the 'sidebar' URL parameter. Also shift
   * the map's center point and resize the plots if they are visible.
   *
   * @param state {String <on|off>}
   */
  _this.toggle = function (state) {
    var selected = document.querySelector('#nav-sub .selected'),
        name = selected.className.match(/icon-(\w+)/)[1],
        el = document.getElementById(name + '-bar'),
        toggled = true; // default; whether or not SideBar visibility changed

    if (state === 'on') { // open SideBar (if it's closed)
      AppUtil.setParam('sidebar', name);
      _setScrollPosition(name);

      if (document.body.classList.contains('sidebar')) {
        toggled = false; // already open
      } else {
        document.body.classList.add('sidebar');
      }

      if (name === 'search') {
        _app.SearchBar.renderMap();
      } else if (name === 'settings') {
        _app.SettingsBar.setFocusedField();
      }
    } else { // close SideBar
      AppUtil.setParam('sidebar', ''); // retain param to repress default SideBar
      document.body.classList.remove('sidebar');

      _app.NavBar.hideAll('sidebars');
      el.classList.remove('hide'); // keep visible for animation
    }

    if (toggled) {
      _app.MapPane.shiftMap();

      if (_app.Pane.getSelected() === 'plots') {
        _app.PlotsPane.resize();
      }
    }
  };

  /**
   * Toggle the 'map' links depending on whether or not the MapPane is visible.
   *
   * @param name {String}
   *     Pane name
   */
  _this.toggleLinks = function (name) {
    var links = _el.querySelectorAll('a[href="#map"]');

    links.forEach(link => {
      if (name === 'map') {
        link.classList.add('hide-link');
      } else {
        link.classList.remove('hide-link');
      }
    });
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = SideBar;
