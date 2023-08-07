'use strict';


/**
 * Switch between Panes (i.e. 'pages') and toggle/switch between SideBars.
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *       el: {Element}
 *     }
 *
 * @return _this {Object}
 *     {
 *       hideAll: {Function}
 *       postInit: {Function}
 *       reset: {Function}
 *       switchSideBar: {Function}
 *     }
 */
var NavBar = function (options) {
  var _this,
      _initialize,

      _app,
      _el,

      _addListeners,
      _showPane,
      _showSideBar,
      _switchPane;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;
    _el = options.el;

    _addListeners();
  };

  /**
   * Add event listeners.
   */
  _addListeners = function () {
    var icons = _el.querySelectorAll('#nav-sub i'),
        tabs = _el.querySelectorAll('#nav-main a');

    // Switch Panes
    window.addEventListener('hashchange', _switchPane);

    // Switch SideBars
    icons.forEach(icon => {
      icon.addEventListener('click', () => {
        var name = icon.className.match(/icon-(\w+)/)[1];

        _this.switchSideBar(name);
      });
    });

    // Set scroll position
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        if (tab.hash.substr(1) === _app.Pane.getSelected()) {
          window.scrollTo(0, 0); // scroll to top if already selected
        }
      });
    });
  };

  /**
   * Show the given Pane and select its nav button.
   *
   * @param name {String}
   *     Pane name
   */
  _showPane = function (name) {
    var button = _el.querySelector('[href="#' + name + '"]'),
        pane = document.getElementById(name + '-pane');

    button.classList.add('selected');
    pane.classList.remove('hide');

    _app.Pane.render(name);
  };

  /**
   * Show the given SideBar and select its nav button.
   *
   * @param name {String}
   *     SideBar name
   */
  _showSideBar = function (name) {
    var button = _el.querySelector('.icon-' + name),
        sidebar = document.getElementById(name + '-bar');

    button.classList.add('selected');
    sidebar.classList.remove('hide');

    _app.SideBar.toggle('on');
  };

  /**
   * Event handler that switches to the Pane matching the URL hash.
   */
  _switchPane = function () {
    var name = _app.Pane.getSelected();

    _this.hideAll('panes');
    _showPane(name);
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Hide all Panes or SideBars and unselect all of their nav buttons.
   *
   * @param items {String <panes|sidebars>}
   */
  _this.hideAll = function (items) {
    var els = document.querySelectorAll('section.pane');

    if (items === 'sidebars') {
      els = document.querySelectorAll('section.bar');
    }

    els.forEach(el => {
      var button, name,
          id = el.getAttribute('id');

      if (el.classList.contains('pane')) {
        name = id.replace('-pane', '');
        button = _el.querySelector(`[href="#${name}"]`);
      } else { // sidebars
        name = id.replace('-bar', '');
        button = _el.querySelector('.icon-' + name);
      }

      button.classList.remove('selected');
      el.classList.add('hide');
    });
  };

  /**
   * Initialization that depends on the app's other Classes being ready first.
   */
  _this.postInit = function () {
    var sidebar = _app.SideBar.getSelected();

    if (sidebar) {
      _showSideBar(sidebar);
    }

    _showPane(_app.Pane.getSelected());
  };

  /**
   * Reset to default state.
   */
  _this.reset = function () {
    location.hash = '#map';

    _switchPane();
  };

  /**
   * Event handler that switches to the given SideBar.
   *
   * @param name {String}
   *     SideBar name
   */
  _this.switchSideBar = function (name) {
    if (name === _app.SideBar.getSelected()) {
      sessionStorage.setItem(name, 0); // scroll to top if already selected
    }

    _this.hideAll('sidebars');
    _showSideBar(name);
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = NavBar;
