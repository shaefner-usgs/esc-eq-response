'use strict';


var AppUtil = require('util/AppUtil');


/**
 * Toggle/render the app's SideBars and remember their scroll positions. Also
 * toggle the map links in the SideBar.
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *       el: {Element}
 *     }
 *
 * @return _this {Object}
 *     {
 *       getSelected: {Function}
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
      _render,
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
   * Render the given SideBar so it displays correctly. Also update the Pane's
   * layout when the SideBar is toggled.
   *
   * @param sidebar {String}
   * @param state {String <on|off>}
   * @param toggled {Boolean}
   */
  _render = function (sidebar, state, toggled) {
    var pane = _app.Pane.getSelected();

    if (state === 'on') {
      if (sidebar === 'search') {
        _app.SearchBar.render();
      } else if (sidebar === 'settings') {
        _app.SettingsBar.render();
      }
    }

    if (toggled) {
      _app.MapPane.shiftMap();

      if (pane === 'plots') {
        _app.PlotsPane.resize();
      } else if (pane === 'summary') {
        _app.SummaryPane.render();
      }
    }
  };

  /**
   * Event handler that saves the current scroll position in sessionStorage.
   */
  _saveScrollPosition = function () {
    var name = _this.getSelected(),
        position = _el.scrollTop;

    clearTimeout(_throttler);

    // Throttle scroll event
    _throttler = setTimeout(() =>
      sessionStorage.setItem(name, position), 100
    );
  };

  /**
   * Set the scroll position to its previously saved value.
   *
   * @param name {String}
   *     SideBar name
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
   * Get the selected SideBar from the URL.
   *
   * @return name {String}
   *     SideBar name
   */
  _this.getSelected = function () {
    var name = 'select', // default
        param = AppUtil.getParam('sidebar'),
        sidebarExists = document.getElementById(param + '-bar');

    if (param && sidebarExists) {
      name = param;
    } else if (param === '') {
      name = '';
    }

    return name;
  };

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
   * Toggle the SideBar on/off and set the 'sidebar' URL parameter.
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
    } else { // close SideBar
      AppUtil.setParam('sidebar', ''); // suppresses default SideBar onload
      document.body.classList.remove('sidebar');
      _app.NavBar.hideAll('sidebars');

      el.classList.remove('hide'); // keep visible for animation
    }

    _render(name, state, toggled);
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
