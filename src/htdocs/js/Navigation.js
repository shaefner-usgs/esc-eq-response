'use strict';


/**
 * Switches between panes ('pages') of single page app
 *
 * @param options {Object}
 *   {
 *     el: {Element},
 *     mapPane: {Object} // MapPane instance
 *   }
 */
var Navigation = function (options) {
  var _this,
      _initialize,

      _el,
      _panes,

      _addListener,
      _changePane,
      _getPaneId,
      _hidePanes,
      _map,
      _showPane;


  _this = {};

  _initialize = function (options) {
    var id;

    options = options || {};
    _el = options.el || document.createElement('div');
    _map = options.mapPane.map;

    _panes = _el.querySelectorAll('.panes a');
    id = _getPaneId();

    _addListener();
    _hidePanes();
    _showPane(id);
  };

  /**
   * Add Event Listeners
   */
  _addListener = function () {
    var id;

    // Update UI when user changes pane
    window.onhashchange = function () {
      id = _getPaneId();
      _changePane(id);
    };
  };

  /**
   * Switch between panes in UI
   *
   * @param e {Event}
   */
  _changePane = function (id) {
    _hidePanes();
    _showPane(id);
  };

  /**
   * Get id of pane to show (default to 'edit' unless set in url string)
   *
   * @return id {String}
   */
  _getPaneId = function () {
    var id = 'edit';

    if (location.hash) {
      id = location.hash.substr(1);
    }

    return id;
  };

  /**
   * Hide all panes in UI; set all nav buttons to unselected
   */
  _hidePanes = function () {
    var button,
        id,
        pane;

    for (var i = 0; i < _panes.length; i ++) {
      id = _panes[i].hash.substr(1);
      button = _el.querySelector('[href="#' + id + '"]');
      pane = document.getElementById(id);

      button.classList.remove('selected');
      pane.classList.add('hide');
    }
  };

  /**
   * Show selected pane in UI; set appropriate nav button to selected
   *
   * @param id {String}
   *    id of pane to show
   */
  _showPane = function (id) {
    var button,
        pane;

    button = _el.querySelector('[href="#' + id + '"]');
    pane = document.getElementById(id);

    button.classList.add('selected');
    pane.classList.remove('hide');

    // Update map container so it displays correctly when unhidden
    if (id === 'map') {
      _map.invalidateSize();
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Navigation;
