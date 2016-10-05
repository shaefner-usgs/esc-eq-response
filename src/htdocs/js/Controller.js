'use strict';


var Controller = function (options) {
  var _this,
      _initialize,

      _modes,

      _addListeners,
      _changeMode,
      _getDefaultPaneId,
      _hidePanes,
      _showPane;


  _this = {};

  _initialize = function () {
    var id;

    _modes = document.querySelectorAll('.modes a');
    id = _getDefaultPaneId();

    _addListeners();
    _showPane(id);
  };

  /**
   * Add Event Listeners
   */
  _addListeners = function () {
    var i;

    // Update UI when user changes mode
    for (i = 0; i < _modes.length; i ++) {
      _modes[i].addEventListener('click', _changeMode);
    }
  };

  /**
   * Switch between modes in UI
   *
   * @param e {Object} Event
   */
  _changeMode = function (e) {
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

    for (var i = 0; i < _modes.length; i ++) {
      id = _modes[i].hash.substr(1);
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
  };


  _initialize(options);
  options = null;
  return _this;
};

module.exports = Controller;
