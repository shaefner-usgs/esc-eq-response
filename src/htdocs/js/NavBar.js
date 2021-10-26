'use strict';


var AppUtil = require('util/AppUtil');


/**
 * Switch between panes (i.e. 'pages') of the app and toggle/switch between
 * sidebars.
 *
 * Also mitigate issues where map/plots don't render correctly when they're
 * created while their respective pane is hidden.
 *
 * @param options {Object}
 *   {
 *     app: {Object} Application
 *     el: {Element}
 *   }
 *
 * @return _this {Object}
 *   {
 *     hideAll: {Function}
 *     postInit: {Function}
 *     reset: {Function}
 *     switchSideBars: {Function}
 *   }
 */
var NavBar = function (options) {
  var _this,
      _initialize,

      _app,
      _el,

      _addListeners,
      _renderPane,
      _renderPlots,
      _showPane,
      _showSideBar,
      _switchPanes;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _el = options.el || document.createElement('nav');

    _addListeners();
  };

  /**
   * Add event listeners.
   */
  _addListeners = function () {
    var close,
        lis;

    close = document.querySelector('aside .icon-close');
    lis = _el.querySelectorAll('#navSub li');

    // Switch between panes
    window.addEventListener('hashchange', _switchPanes);

    // Switch between sidebars
    lis.forEach(li => {
      li.addEventListener('click', () => {
        var button,
            id;

        button = li.querySelector('i');
        id = button.className.match(/icon-(\w+)/)[1];

        _this.switchSideBars(id);
      });
    });

    // Close the sidebar
    close.addEventListener('click', () =>
      _app.SideBar.toggle('off')
    );
  };

  /**
   * Render the pane matching the given id value. These are extra steps that
   * are necessary to render the pane correctly when it is unhidden.
   *
   * @param id {String}
   */
  _renderPane = function (id) {
    _app.setScrollPosition(id);

    if (id === 'mapPane') {
      _app.MapPane.render();
    } else if (id === 'plotsPane') {
      _renderPlots();
    }

    _app.SideBar.toggleMapLinks(id);
  };

  /**
   * Wrapper method to render the plots (and display the rendering status) when
   * the PlotsPane is shown.
   */
  _renderPlots = function () {
    var numPlots = Object.keys(_app.PlotsPane.getPlots()).length;

    if (numPlots > 0 && !_app.PlotsPane.rendered) {
      _app.StatusBar.addItem({
        id: 'rendering',
        name: 'Plots'
      }, {
        prepend: 'Rendering'
      });

      // Add a slight delay; otherwise rendering message does not display
      setTimeout(() => {
        _app.PlotsPane.render();
        _app.StatusBar.removeItem('rendering');
      }, 50);
    }

    _app.PlotsPane.resize(); // in case size of content area changed
  };

  /**
   * Show the pane matching the given id value and select the appropriate nav
   * button.
   *
   * @param id {String}
   */
  _showPane = function (id) {
    var button,
        selPane;

    button = _el.querySelector('[href="#' + id + '"]');
    selPane = document.getElementById(id);

    button.classList.add('selected');
    selPane.classList.remove('hide');

    _renderPane(id);
  };

  /**
   * Show the sidebar matching the given id value, set the 'sidebar' URL
   * parameter, and select the given nav button.
   *
   * @param id {String}
   */
  _showSideBar = function (id) {
    var button,
        selSideBar;

    button = _el.querySelector('.icon-' + id);
    selSideBar = document.getElementById(id);

    button.classList.add('selected');
    selSideBar.classList.remove('hide');

    _app.SideBar.toggle('on');
  };

  /**
   * Switch to the Pane matching the current URL hash.
   */
  _switchPanes = function () {
    var id = _app.getPaneId();

    _this.hideAll('panes');
    _showPane(id);
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Hide all panes or all sidebars and unselect all of their nav buttons.
   *
   * @param items {String}
   *     'panes' or 'sidebars'
   */
  _this.hideAll = function (items) {
    var button,
        els,
        id;

    if (items === 'sidebars') {
      els = document.querySelectorAll('section.bar');
    } else {
      els = document.querySelectorAll('section.pane');
    }

    els.forEach(el => {
      id = el.getAttribute('id');

      if (el.classList.contains('pane')) { // panes
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
    var sideBarId = AppUtil.getParam('sidebar');

    if (sideBarId === null) {
      sideBarId = 'selectBar'; // default
    }
    if (sideBarId) {
      _showSideBar(sideBarId);
    }

    _showPane(_app.getPaneId());
  };

  /**
   * Reset to default state.
   */
  _this.reset = function () {
    location.hash = _app.defaultPaneId;

    _switchPanes();
  };

  /**
   * Switch to the Sidebar matching the current 'sidebar' URL parameter.
   *
   * @param id {String}
   */
  _this.switchSideBars = function (id) {
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
