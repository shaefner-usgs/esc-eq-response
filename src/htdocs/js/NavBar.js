'use strict';


/**
 * Set up navbar to switch between panes (i.e. 'pages') of single page app
 *
 * Also save / set scroll positions to return pane to previous state, and deal
 *   with issues where map/plots don't display correctly when created while
 *   their respective pane is hidden
 *
 * @param options {Object}
 *   {
 *     app: {Object}, // Application
 *     el: {Element}
 *   }
 *
 * @return _this {Object}
 *   {
 *     reset: {Function}
 *   }
 */
var NavBar = function (options) {
  var _this,
      _initialize,

      _app,
      _el,
      _panes,
      _throttle,

      _addListeners,
      _changePane,
      _getPaneId,
      _hidePanes,
      _renderPlots,
      _saveScrollPosition,
      _setScrollPosition,
      _showPane;


  _this = {};

  _initialize = function (options) {
    var id;

    options = options || {};

    _app = options.app;
    _el = options.el || document.createElement('div');
    _panes = document.querySelectorAll('section.pane');

    id = _getPaneId();

    _changePane(id);
    _addListeners();
  };

  /**
   * Add event listeners for switching panes / saving scroll position
   */
  _addListeners = function () {
    var id;

    // Update UI when user switches pane
    window.addEventListener('hashchange', function () {
      id = _getPaneId();
      _changePane(id);
    });

    // Save current scroll postion when user scrolls page
    window.addEventListener('scroll', function () {
      _saveScrollPosition();
    });
  };

  /**
   * Switch to selected pane in UI
   *
   * @param id {String}
   */
  _changePane = function (id) {
    _hidePanes();
    _showPane(id);
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

    hash = location.hash;
    id = 'editPane'; // default
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
      pane.classList.add('hide');

      button = _el.querySelector('[href="#' + pane.getAttribute('id') + '"]');
      button.classList.remove('selected');
    }
  };

  /**
   * Display rendering message (and render plots) when plots pane is activated
   */
  _renderPlots = function () {
    var numPlots;

    numPlots = Object.keys(_app.PlotsPane.getPlots()).length;
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

    _app.PlotsPane.resize(); // in case user adjusted window size in another pane
  };

  /**
   * Save user's current scroll position in session storage
   */
  _saveScrollPosition = function () {
    var id,
        position;

    id = _getPaneId();
    position = window.pageYOffset;

    // Throttle scroll event so it doesn't fire off in rapid succession
    window.clearTimeout(_throttle);
    _throttle = window.setTimeout(function() {
      window.sessionStorage.setItem(id, position);
    }, 25);
  };

  /**
   * Set scroll position to former value, which is saved in sessionStorage
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
   * Show selected pane and set scroll position; highlight selected nav button
   *
   * @param id {String}
   */
  _showPane = function (id) {
    var button,
        pane;

    button = _el.querySelector('[href="#' + id + '"]');
    button.classList.add('selected');

    pane = document.getElementById(id);
    pane.classList.remove('hide');

    _setScrollPosition(id);

    // Map and plots need special care to display correctly when unhidden
    if (id === 'editPane') {
      _app.EditPane.setFocusedField();
    } else if (id === 'mapPane') {
      _app.MapPane.map.invalidateSize();
      _app.MapPane.initView();
      _app.MapPane.map.fire('visible'); // for popups added when map is hidden
    } else if (id === 'plotsPane') {
      _renderPlots();
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
