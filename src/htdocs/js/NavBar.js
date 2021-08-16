'use strict';


/**
 * Switch between panes (i.e. 'pages') of the app.
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
 *   }
 */
var NavBar = function (options) {
  var _this,
      _initialize,

      _app,
      _el,

      _addListeners,
      _hidePanes,
      _renderPane,
      _renderPlots,
      _showPane,
      _switchPanes;


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
    // Update the UI when user switches panes
    window.addEventListener('hashchange', () => {
      _switchPanes();
    });
  };

  /**
   * Hide all panes and unselect all nav buttons.
   */
  _hidePanes = function () {
    var button,
        id;

    _this.panes.forEach(pane => {
      id = pane.getAttribute('id');
      button = _el.querySelector('[href="#' + id + '"]');

      button.classList.remove('selected');
      pane.classList.add('hide');
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

    if (id === 'editPane') {
      _app.EditPane.setFocusedField();
    } else if (id === 'mapPane') {
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
        pane;

    button = _el.querySelector('[href="#' + id + '"]');
    pane = document.getElementById(id);

    button.classList.add('selected');
    pane.classList.remove('hide');

    _renderPane(id);
  };

  /**
   * Switch between panes.
   */
  _switchPanes = function () {
    var id = _this.getPaneId();

    _hidePanes();
    _showPane(id);
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
    id = 'editPane'; // default
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
