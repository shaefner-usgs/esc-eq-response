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
 *     panes: {Object}
 *     postInit: {Function}
 *     reset: {Function}
 *   }
 */
var NavBar = function (options) {
  var _this,
      _initialize,

      _app,
      _el,

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
    _el = options.el || document.createElement('div');

    _this.panes = document.querySelectorAll('section.pane');
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

    // Toggle/switch between sidebars
    lis.forEach(li => {
      li.addEventListener('click', function() {
        _toggleSideBar(this.querySelector('i'));
      });
    });

    // Close the sidebar
    close.addEventListener('click', (e) => {
      _toggleSideBar(e.target);
    });
  };

  /**
   * Hide all panes or sidebars and unselect all of their nav buttons. Also set
   * the sidebar urlParam to an empty value.
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

        AppUtil.setParam('sidebar', '');
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
    _app.setScrollPosition(id);

    if (id === 'mapPane') {
      _app.MapPane.render();
    } else if (id === 'plotsPane') {
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

    _app.PlotsPane.resize(); // in case user adjusted window size
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
   * and select the given nav button. Also set the sideBarWidth prop if it's not
   * already set.
   *
   * @param id {String}
   * @param button {Element}
   */
  _showSideBar = function (id, button) {
    var selSideBar = document.getElementById(id);

    button.classList.add('selected');
    selSideBar.classList.remove('hide');

    AppUtil.setParam('sidebar', id);

    if (!_app.sideBarWidth) {
      _app.sideBarWidth = document.querySelector('#sideBar').offsetWidth;
    }
  };

  /**
   * Switch between panes.
   */
  _switchPanes = function () {
    var id = _this.getPaneId();

    _hideAll(_this.panes);
    _showPane(id);
  };

  /**
   * Toggle the sidebar on/off and switch between sidebars.
   *
   * @param button {Element}
   *     button (icon) user clicked on
   */
  _toggleSideBar = function (button) {
    var id,
        sideBars,
        toggled;

    if (button.classList.contains('selected')) { // nothing to do
      return;
    }

    id = button.className.replace('icon-', '');
    sideBars = document.querySelectorAll('aside section');
    toggled = true;

    _hideAll(sideBars);

    if (id === 'close') {
      document.body.classList.remove('sidebar');
    } else {
      if (document.body.classList.contains('sidebar')) {
        toggled = false;
      } else {
        document.body.classList.add('sidebar');
      }

      _showSideBar(id, button);
    }

    if (toggled) {
      _app.MapPane.shiftMap({
        sidebar: true
      });

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
    id = 'mapPane'; // default
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
    _addListeners();
    _switchPanes();
  };

  /**
   * Reset to default state.
   */
  _this.reset = function () {

  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = NavBar;
