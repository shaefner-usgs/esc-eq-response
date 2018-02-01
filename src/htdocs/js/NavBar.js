'use strict';


/**
 * Sets up navbar to switch between panes ('pages') of single page app
 *
 * @param options {Object}
 *   {
 *     el: {Element},
 *     mapPane: {Object}, // MapPane instance
 *     plotsPane: {Object} // PlotsPane instance
 *   }
 */
var NavBar = function (options) {
  var _this,
      _initialize,

      _el,
      _panes,

      _MapPane,
      _PlotsPane,

      _addListeners,
      _changePane,
      _getPaneId,
      _hidePanes,
      _saveScrollPosition,
      _setScrollPosition,
      _showPane;


  _this = {};

  _initialize = function (options) {
    var id;

    options = options || {};

    _el = options.el || document.createElement('div');
    _panes = _el.querySelectorAll('.panes a');

    _MapPane = options.mapPane;
    _PlotsPane = options.plotsPane;

    id = _getPaneId();
    _changePane(id);

    _addListeners();
  };

  /**
   * Add event listener for changing panes
   */
  _addListeners = function () {
    var id;

    // Save current scroll postion when user scrolls
    window.addEventListener('scroll', function() {
      _saveScrollPosition();
    });

    // Update UI when user changes pane
    window.addEventListener('hashchange', function () {
      id = _getPaneId();
      _changePane(id);
    });
  };

  /**
   * Switch between panes in UI
   *
   * @param id {String}
   */
  _changePane = function (id) {
    _hidePanes();
    _showPane(id);
  };

  /**
   * Get id of pane to show (default to 'editPane' unless set in url string)
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
        id,
        pane;

    for (i = 0; i < _panes.length; i ++) {
      id = _panes[i].hash.substr(1);
      button = _el.querySelector('[href="#' + id + '"]');
      pane = document.getElementById(id);

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

    window.sessionStorage.setItem(id, position);
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

    // Update map container / render plots so they display correctly when unhidden
    if (id === 'mapPane') {
      _MapPane.map.invalidateSize();
    } else if (id === 'plotsPane') {
      _PlotsPane.renderPlots();
      _PlotsPane.resizePlots();
    }
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Clear saved scroll positions from session storage
   *   set to '0' instead of removing so all values are explicitly set
   */
  _this.clearScrollPositions = function () {
    var i,
        id;

    for (i = 0; i < _panes.length; i ++) {
      id = _panes[i].hash.substr(1);
      window.sessionStorage.setItem(id, 0);
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = NavBar;
