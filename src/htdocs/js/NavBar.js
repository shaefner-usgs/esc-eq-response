'use strict';


var AppUtil = require('util/AppUtil');


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
    var lis = _el.querySelectorAll('#navSub li');

    // Switch Panes
    window.addEventListener('hashchange', _switchPane);

    // Switch SideBars
    lis.forEach(li => {
      li.addEventListener('click', () => {
        var button = li.querySelector('i'),
            id = button.className.match(/icon-(\w+)/)[1];

        _this.switchSideBar(id);
      });
    });
  };

  /**
   * Show the given Pane and select its nav button.
   *
   * @param id {String}
   *     Pane id
   */
  _showPane = function (id) {
    var button = _el.querySelector('[href="#' + id + '"]'),
        pane = document.getElementById(id);

    button.classList.add('selected');
    pane.classList.remove('hide');

    _app.Pane.render(id);
  };

  /**
   * Show the given SideBar and select its nav button.
   *
   * @param id {String}
   *     SideBar id
   */
  _showSideBar = function (id) {
    var button = _el.querySelector('.icon-' + id),
        sideBar = document.getElementById(id);

    button.classList.add('selected');
    sideBar.classList.remove('hide');

    _app.SideBar.toggle('on');
  };

  /**
   * Event handler that switches to the Pane matching the URL hash.
   */
  _switchPane = function () {
    var id = _app.Pane.getSelected();

    _this.hideAll('panes');
    _showPane(id);
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
      var button,
          id = el.getAttribute('id');

      if (el.classList.contains('pane')) {
        button = _el.querySelector('[href="#' + id + '"]');
      } else { // sidebars
        button = _el.querySelector('.icon-' + id);
      }

      button.classList.remove('selected');
      el.classList.add('hide');
    });
  };

  /**
   * Initialization that depends on other Classes being ready before running.
   */
  _this.postInit = function () {
    var id = AppUtil.getParam('sidebar');

    if (id === null) {
      id = 'selectBar'; // default'
    }
    if (id) {
      _showSideBar(id);
    }

    _showPane(_app.Pane.getSelected());
  };

  /**
   * Reset to default state.
   */
  _this.reset = function () {
    location.hash = '#mapPane';

    _switchPane();
  };

  /**
   * Event handler that switches to the given SideBar.
   *
   * @param id {String}
   *     SideBar id
   */
  _this.switchSideBar = function (id) {
    if (id === AppUtil.getParam('sidebar')) {
      sessionStorage.setItem(id, 0); // reset scroll position to top
    }

    _this.hideAll('sidebars');
    _showSideBar(id);
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = NavBar;
