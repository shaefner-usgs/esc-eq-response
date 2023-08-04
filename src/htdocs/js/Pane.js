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
 *       getSelPane: {Function}
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

    // Show the Select Bar
    select.addEventListener('click', () => {
      sessionStorage.setItem('select-bar', 0);
      _app.NavBar.switchSideBar('select-bar');
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
    var id = _this.getSelPane(),
        position = window.pageYOffset;

    clearTimeout(_throttler);

    // Throttle scroll event
    _throttler = setTimeout(() =>
      sessionStorage.setItem(id, position), 250
    );
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Get the selected Pane from the URL.
   *
   * @return id {String}
   *     Pane id
   */
  _this.getSelPane = function () {
    var hash = location.hash,
        id = 'map-pane', // default
        paneExists = _el.querySelector('section' + hash);

    if (hash && paneExists) {
      id = hash.substring(1);
    }

    return id;
  };

  /**
   * Render the given Pane so it displays correctly when it's unhidden.
   *
   * @param id {String}
   *     Pane id
   */
  _this.render = function (id) {
    _this.setScrollPosition(id);
    _app.SideBar.toggleLinks(id);

    if (id === 'map-pane') {
      _app.MapPane.render();
    } else if (id === 'plots-pane') {
      _renderPlots();
    }
  };

  /**
   * Reset to default state.
   */
  _this.reset = function () {
    var panes = _el.querySelectorAll('section.pane');

    panes.forEach(pane => {
      var id = pane.getAttribute('id');

      sessionStorage.setItem(id, 0);
    });
  };

  /**
   * Set the scroll position to its previously saved value.
   *
   * @param id {String}
   *     Pane id
   */
  _this.setScrollPosition = function (id) {
    var position = Number(sessionStorage.getItem(id));

    if (position !== null) {
      window.scroll(0, position);
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Pane;
