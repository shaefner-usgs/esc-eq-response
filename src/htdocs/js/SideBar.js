'use strict';


var AppUtil = require('util/AppUtil');


/**
 *
 * @param options {Object}
 *   {
 *     app: {Object} Application
 *     el: {Element}
 *   }
 *
 * @return _this {Object}
 *   {
 *     setOption: {Function}
 *     toggle: {Function}
 *     toggleMapLinks: {Function}
 *   }
 */
var SideBar = function (options) {
  var _this,
      _initialize,

      _app,
      _el;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _el = options.el || document.createElement('section');
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Highlight and show the selected option on a 'radio-bar'; un-highlight and
   * hide all other options.
   */
  _this.setOption = function () {
    var option,
        sibling;

    option = _el.querySelector('.option.' + this.id);
    sibling = this.parentNode.firstElementChild;

    // Highlight the selected button and show its options (if applicable)
    this.classList.add('selected');

    if (option) {
      option.classList.remove('hide');
    }

    // Un-highlight all other buttons and hide their options
    while (sibling) {
      if (sibling !== this) {
        option = _el.querySelector('.option.' + sibling.id);

        sibling.classList.remove('selected');

        if (option) {
          option.classList.add('hide');
        }
      }

      sibling = sibling.nextElementSibling;
    }
  };

  /**
   * Toggle the sidebar on/off and shift the map's center point. Also set the
   * 'sidebar' URL parameter and resize the plots if they are visible.
   *
   * @param status {String}
   *     either 'on' or 'off'
   */
  _this.toggle = function (status) {
    var button,
        id,
        selSideBar,
        toggled;

    button = document.querySelector('#navSub .selected');
    id = button.className.match(/icon-(\w+)/)[1];
    selSideBar = document.getElementById(id);
    toggled = true; // default; whether or not sidebar visibility changed

    if (status === 'on') { // open sidebar
      AppUtil.setParam('sidebar', id);
      _app.setScrollPosition(id);

      if (document.body.classList.contains('sidebar')) {
        toggled = false; // already open
      } else {
        document.body.classList.add('sidebar');
      }

      if (id === 'searchBar') {
        _app.SearchBar.renderMap();
      } else if (id === 'settingsBar') {
        _app.SettingsBar.setFocusedField();
      }
    } else { // close sidebar
      AppUtil.setParam('sidebar', '');
      _app.NavBar.hideAll('sidebars');

      selSideBar.classList.remove('hide'); // keep visible for animation
      document.body.classList.remove('sidebar');
    }

    if (toggled) {
      _app.MapPane.shiftMap();

      if (_app.getPaneId() === 'plotsPane') {
        _app.PlotsPane.resize();
      }
    }
  };

  /**
   * Toggle the 'map' links depending on whether or not the MapPane is visible.
   *
   * @param paneId {String}
   */
  _this.toggleMapLinks = function (paneId) {
    var links = _el.querySelectorAll('a[href="#mapPane"]');

    links.forEach(link => {
      if (paneId === 'mapPane') {
        link.classList.add('hide-link');
      } else {
        link.classList.remove('hide-link');
      }
    });
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = SideBar;
