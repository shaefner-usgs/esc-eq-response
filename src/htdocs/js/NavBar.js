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
 *     getPaneId: {Function}
 *     postInit: {Function}
 *     reset: {Function}
 *     switchSideBars: {Function}
 *   }
 */
var NavBar = function (options) {
  var _this,
      _initialize,

      _app,
      _defaultPaneId,
      _el,
      _panes,
      _sideBars,

      _addListeners,
      _hideAll,
      _renderPane,
      _renderPlots,
      _showPane,
      _showSideBar,
      _switchPanes,
      _toggleSideBar;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _defaultPaneId = 'mapPane';
    _el = options.el || document.createElement('nav');
    _panes = document.querySelectorAll('section.pane');
    _sideBars = document.querySelectorAll('section.bar');

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
    window.addEventListener('hashchange', () => {
      _switchPanes();
    });

    // Switch between sidebars
    lis.forEach(li => {
      li.addEventListener('click', function() {
        var button,
            id;

        button = this.querySelector('i');
        id = button.className.match(/icon-(\w+)/)[1];

        _this.switchSideBars(id);
      });
    });

    // Close the sidebar
    close.addEventListener('click', () => {
      _toggleSideBar('off');
    });
  };

  /**
   * Hide all panes or sidebars and unselect all of their nav buttons.
   *
   * @param els {Elements}
   *     panes or sidebars
   */
  _hideAll = function (els) {
    var button,
        id;

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
   * Render the pane matching the given id value. These are extra steps that
   * are necessary to render the selected pane correctly when it is unhidden.
   *
   * @param id {String}
   */
  _renderPane = function (id) {
    var link = document.querySelector('#selectBar a[href="#mapPane"]');

    _app.setScrollPosition(id);

    if (id === 'mapPane') {
      _app.MapPane.render();
      link.classList.add('hide-link'); // unlink 'map' text on selectBar
    } else {
      link.classList.remove('hide-link');
    }

    if (id === 'plotsPane') {
      _renderPlots();
    }
  };

  /**
   * Render the plots (and display the rendering status).
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
      window.setTimeout(function() {
        _app.PlotsPane.render();
        _app.StatusBar.removeItem('rendering');
      }, 25);
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
   * Show the sidebar matching the given id value, set the sidebar urlParam,
   * and select the given nav button.
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

    _toggleSideBar('on');
  };

  /**
   * Switch between panes.
   */
  _switchPanes = function () {
    var id = _this.getPaneId();

    _hideAll(_panes);
    _showPane(id);
  };

  /**
   * Toggle the sidebar on/off and shift the map's center point. Also resize
   * plots if they are visible and set the sidebar URLparam.
   *
   * @param status {String}
   *     either 'on' or 'off'
   */
  _toggleSideBar = function (status) {
    var button,
        id,
        selSideBar,
        toggled;

    button = _el.querySelector('#navSub .selected');
    id = button.className.match(/icon-(\w+)/)[1];
    selSideBar = document.getElementById(id);
    toggled = true;

    if (status === 'on') { // open
      AppUtil.setParam('sidebar', id);
      _app.setScrollPosition(id);

      if (document.body.classList.contains('sidebar')) {
        toggled = false; // already open
      } else {
        document.body.classList.add('sidebar');
      }

      if (id === 'settingsBar') {
        _app.SettingsBar.setFocusedField();
      }
    } else { // close
      AppUtil.setParam('sidebar', '');
      _hideAll(_sideBars);

      selSideBar.classList.remove('hide'); // keep visible for animation
      document.body.classList.remove('sidebar');
    }

    if (toggled) {
      _app.MapPane.shiftMap();

      if (_this.getPaneId() === 'plotsPane') {
        _app.PlotsPane.resize();
      }
    }
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Get the id value of the selected pane from the URL.
   *
   * @return id {String}
   */
  _this.getPaneId = function () {
    var hash,
        id,
        paneExists;

    hash = location.hash;
    id = _defaultPaneId;
    paneExists = document.querySelector('section' + hash);

    if (hash && paneExists) {
      id = hash.substr(1);
    }

    return id;
  };

  /**
   * Initialization that depends on other Classes being ready before running.
   */
  _this.postInit = function () {
    var paneId,
        sideBarId;

    paneId = _this.getPaneId();
    sideBarId = AppUtil.getParam('sidebar');

    if (sideBarId === null) {
      sideBarId = 'selectBar'; // default
    }
    if (sideBarId) {
      _showSideBar(sideBarId);
    }

    _showPane(paneId);
  };

  /**
   * Reset to default state.
   */
  _this.reset = function () {
    location.hash = _defaultPaneId;

    _switchPanes();
  };

  /**
   * Switch between sidebars.
   *
   * @param id {String}
   */
  _this.switchSideBars = function (id) {
    if (id === AppUtil.getParam('sidebar')) {
      window.sessionStorage.setItem(id, 0); // reset scroll position to top
    }

    _hideAll(_sideBars);
    _showSideBar(id);
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = NavBar;
