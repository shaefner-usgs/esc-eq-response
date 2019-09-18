'use strict';


/**
 * Sets up navbar to switch between panes ('pages') of single page app
 *
 * @param options {Object}
 *   {
 *     app: {Object}, // Application
 *     el: {Element}
 *   }
 */
var NavBar = function (options) {
  var _this,
      _initialize,

      _app,
      _el,
      _navButtons,
      _panes,
      _throttle,

      _addListeners,
      _changePane,
      _clickNav,
      _getPaneId,
      _hidePanes,
      _saveScrollPosition,
      _setScrollPosition,
      _showPane;


  _this = {};

  _initialize = function (options) {
    var id;

    options = options || {};

    _app = options.app;
    _el = options.el || document.createElement('div');
    _navButtons = _el.querySelectorAll('.panes a');
    _panes = document.querySelectorAll('section.pane');

    id = _getPaneId();
    _changePane(id);

    _addListeners();
  };

  /**
   * Add event listeners for changing panes / saving scroll position
   */
  _addListeners = function () {
    var i,
        id;

    // Save current scroll postion when user scrolls page
    window.addEventListener('scroll', function() {
      _saveScrollPosition();
    });

    // Update UI when user changes pane via back/forward buttons
    window.addEventListener('hashchange', function () {
      id = _getPaneId();
      _changePane(id);
    });

    // Update UI when user changes pane via navbar
    for (i = 0; i < _navButtons.length; i ++) {
      _navButtons[i].addEventListener('click', _clickNav);
    }
  };

  /**
   * Switch between panes in UI
   *
   * @param id {String}
   */
  _changePane = function (id) {
    _app.StatusBar.addLoadingMsg();

    // Add a slight delay; otherwise loading (rendering) message does not display
    window.setTimeout(function() {
      _hidePanes();
      _showPane(id);
      _app.StatusBar.remove('rendering');
    }, 20);
  };

  /**
   * Event handler for tabs on NavBar
   *
   * @param e {Event}
   */
  _clickNav = function (e) {
    var id = e.target.hash.substr(1);

    e.preventDefault(); // prevent scrolling to #hash to mitigate page flickering
    window.history.pushState(null, null, e.target.hash);

    _changePane(id);
  };

  /**
   * Get id of selected pane from url (defaults to 'editPane' if not set)
   *
   * @return id {String}
   */
  _getPaneId = function () {
    var hash,
        id,
        paneExists;

    id = 'editPane'; // default

    hash = location.hash;
    paneExists = document.querySelector('section' + hash);
    if (hash && paneExists) {
      id = hash.substr(1);
    }

    return id;
  };

  /**
   * Hide all panes in UI; set all nav buttons to unselected
   */
  _hidePanes = function () {
    var button,
        i,
        pane;

    for (i = 0; i < _panes.length; i ++) {
      pane = _panes[i];
      button = _el.querySelector('[href="#' + pane.getAttribute('id') + '"]');

      button.classList.remove('selected');
      pane.classList.add('hide');
    }
  };

  /**
   * Save user's current scroll position in session storage
   */
  _saveScrollPosition = function () {
    var id,
        position;

    id = _getPaneId();
    position = window.pageYOffset;

    // Throttle scroll event so it doesn't fire off repeatedly in rapid succession
    window.clearTimeout(_throttle);
    _throttle = window.setTimeout(function() {
      window.sessionStorage.setItem(id, position);
    }, 25);
  };

  /**
   * Get user's former scroll position from session storage
   *
   * @param id {String}
   */
  _setScrollPosition = function (id) {
    var position;

    position = window.sessionStorage.getItem(id);

    if (position) {
      window.scroll(0, position);
    }
  };

  /**
   * Show selected pane in UI; set appropriate nav button to selected
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

    // Scroll to user's former position
    _setScrollPosition(id);

    // Update map container / render plots when unhidden so they display correctly
    if (id === 'mapPane') {
      _app.MapPane.map.invalidateSize();
      _app.MapPane.initView();
      // Fire an event so L.popup.update() can be called after map is visible,
      //   which seems to be necessary for Leaflet to display popups correctly
      //   when they're added to the map from another pane
      _app.MapPane.map.fire('visible');
    } else if (id === 'plotsPane') {
      _app.PlotsPane.render();
      _app.PlotsPane.resize();
    }
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Reset saved scroll positions for all panes except 'Edit'
   */
  _this.reset = function () {
    var i,
        id;

    for (i = 0; i < _panes.length; i ++) {
      id = _panes[i].getAttribute('id');
      if (id !== 'editPane') {
        window.sessionStorage.setItem(id, 0);
      }
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = NavBar;
