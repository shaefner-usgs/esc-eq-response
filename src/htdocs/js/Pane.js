'use strict';


/**
 * Render/handle the app's Panes and remember each Pane's scroll position.
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
 *       render: {Function}
 *       reset: {Function}
 *       setScrollPosition: {Function}
 *     }
 */
var Pane = function (options) {
  var _this,
      _initialize,

      _app,
      _el,
      _throttler,

      _addListeners,
      _renderPlots,
      _saveScrollPosition;


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
    var select = _el.querySelector('a.select');

    // Show the SelectBar
    select.addEventListener('click', () => {
      sessionStorage.setItem('select', 0);
      _app.NavBar.switchSideBar('select');
    });

    // Save the scroll position
    window.addEventListener('scroll', _saveScrollPosition);
  };

  /**
   * Wrapper method that renders the plots (and displays the rendering status).
   */
  _renderPlots = function () {
    if (
      document.body.classList.contains('mainshock') &&
      !_app.PlotsPane.rendered
    ) {
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

    _app.PlotsPane.resize(); // in case size of content area has changed
  };

  /**
   * Event handler that saves the current scroll position in sessionStorage.
   */
  _saveScrollPosition = function () {
    var name = _this.getSelected(),
        position = window.pageYOffset;

    clearTimeout(_throttler);

    // Throttle scroll event
    _throttler = setTimeout(() =>
      sessionStorage.setItem(name, position), 250
    );
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Get the selected Pane from the URL.
   *
   * @return name {String}
   *     Pane name
   */
  _this.getSelected = function () {
    var hash = location.hash,
        name = 'map', // default
        paneExists = _el.querySelector(hash + '-pane');

    if (hash && paneExists) {
      name = hash.substring(1);
    }

    return name;
  };

  /**
   * Render the given Pane so it displays correctly when it's unhidden.
   *
   * @param name {String}
   *     Pane name
   */
  _this.render = function (name) {
    var mainshock = _app.Features.getFeature('mainshock');

    _this.setScrollPosition(name);
    _app.SideBar.toggleLinks(name);

    if (name === 'map') {
      _app.MapPane.render();
    } else if (name === 'plots') {
      _renderPlots();
    } else if (name ==='summary' && mainshock.render) {
      mainshock.render();
    }
  };

  /**
   * Reset to default state.
   */
  _this.reset = function () {
    var panes = _el.querySelectorAll('section.pane');

    panes.forEach(pane => {
      var name = pane.getAttribute('id').replace('-pane', '');

      sessionStorage.setItem(name, 0);
    });
  };

  /**
   * Set the scroll position to its previously saved value.
   *
   * @param name {String}
   *     Pane name
   */
  _this.setScrollPosition = function (name) {
    var position = Number(sessionStorage.getItem(name));

    if (position !== null) {
      window.scroll(0, position);
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Pane;
