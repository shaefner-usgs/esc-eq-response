'use strict';


/**
 * Switches between app panes of the single page app
 *
 * @param options {Object}
 *   {
 *     mapPane: {Object} // mapPane instance
 *   }
 */
var Navigation = function (options) {
  var _this,
      _initialize,

      _panes,

      _addListeners,
      _changePane,
      _getDefaultPaneId,
      _hidePanes,
      _map,
      _showPane;


  _this = {};

  _initialize = function (options) {
    var id;

    _map = options.mapPane.map;
    _panes = document.querySelectorAll('.panes a');
    id = _getDefaultPaneId();

    _addListeners();
    _hidePanes();
    _showPane(id);
  };

  /**
   * Add Event Listeners
   */
  _addListeners = function () {
    var i;

    // Update UI when user changes mode
    for (i = 0; i < _panes.length; i ++) {
      _panes[i].addEventListener('click', _changePane);
    }
  };

  /**
   * Switch between panes in UI
   *
   * @param e {Object} Event
   */
  _changePane = function (e) {
    var id = e.target.hash.substr(1);

    _hidePanes();
    _showPane(id);
  };

  /**
   * Get id of default pane to show ('edit' unless set in url string)
   *
   * @return id {String}
   */
  _getDefaultPaneId = function () {
    var id = 'edit';

    if (location.hash) {
      id = location.hash.substr(1);
    }

    return id;
  };

  /**
   * Hide all panes in UI; set all mode buttons to unselected
   */
  _hidePanes = function () {
    var button,
        id,
        pane;

    for (var i = 0; i < _panes.length; i ++) {
      id = _panes[i].hash.substr(1);
      button = document.querySelector('[href="#' + id + '"]');
      pane = document.querySelector('#' + id);

      button.classList.remove('selected');
      pane.classList.add('hide');
    }
  };

  /**
   * Show selected pane in UI; set appropriate mode button to selected
   *
   * @param id {String}
   *    id of pane to show
   */
  _showPane = function (id) {
    var button,
        pane;

    button = document.querySelector('[href="#' + id + '"]');
    pane = document.querySelector('#' + id);

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
