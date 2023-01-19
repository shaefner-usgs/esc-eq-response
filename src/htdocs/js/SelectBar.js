'use strict';


var AppUtil = require('util/AppUtil');


/**
 * Create the Features when a new Mainshock is selected and display its details
 * on the SideBar.
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *       el: {Element}
 *     }
 *
 * @return _this {Object}
 *     {
 *       postInit: {Function}
 *       reset: {Function}
 *       setMainshock: {Function}
 *     }
 */
var SelectBar = function (options) {
  var _this,
      _initialize,

      _app,
      _el,
      _eqid,

      _addListeners,
      _createFeatures,
      _hardReset,
      _isEqidValid,
      _setStatus;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;
    _el = options.el;
    _eqid = document.getElementById('eqid');

    // Set the Event ID <input>'s initial value
    _eqid.value = AppUtil.getParam('eqid');

    _addListeners();
    _setStatus();
  };

  /**
   * Add event listeners.
   */
  _addListeners = function () {
    var reset = document.getElementById('reset'),
        search = _el.querySelector('.search');

    // Reset the app
    reset.addEventListener('click', _hardReset);

    // Show the SearchBar
    search.addEventListener('click', e => {
      e.preventDefault();
      _app.NavBar.switchSideBar('searchBar');
    });

    // Create a new Mainshock and fetch its Features
    _eqid.addEventListener('input', _this.setMainshock);
  };

  /**
   * Create the Features if the Mainshock's eqid is valid.
   */
  _createFeatures = function () {
    var message;

    if (_isEqidValid()) {
      AppUtil.setParam('eqid', _eqid.value);
      _app.Features.createFeatures();

      if (AppUtil.getParam('aftershocks')) {
        _app.SettingsBar.setInterval('aftershocks'); // set up auto refresh
      }
    } else {
      message =
        '<h4>Error Loading Mainshock</h4>' +
        '<ul>' +
          `<li>Event ID (${_eqid.value}) is invalid</li>` +
        '</ul>';

      _app.StatusBar.addError({
        id: 'mainshock',
        message: message,
        status: 'invalid'
      });
    }
  };

  /**
   * Event handler that performs a 'hard' reset, returning the app to its
   * default state.
   *
   * @param e {Event}
   */
  _hardReset = function (e) {
    var input = _el.querySelector('input'),
        map = _app.MapPane.map,
        search = _app.Features.getFeature('catalog-search').mapLayer,
        sidebar = document.getElementById('sideBar');

    input.value = '';
    sidebar.scrollTop = 0;

    e.preventDefault();

    if (!map.hasLayer(search)) {
      map.addLayer(search);
    }

    _setStatus('disabled');
    _app.reset();
    _app.NavBar.reset();
    _app.SettingsBar.resetCatalog();
  };

  /**
   * Check if the Event ID <input> value is valid.
   *
   * @return isValid {Boolean}
   */
  _isEqidValid = function () {
    var isValid = false,
        regex = /^[^/\\:]+$/; // no slashes or colons

    if (regex.test(_eqid.value)) {
      isValid = true;
    }

    return isValid;
  };

  /**
   * Set the status of the Reset button.
   *
   * @param status {String <enabled|disabled>}
   */
  _setStatus = function (status) {
    var reset = document.getElementById('reset'),
        title = 'Disabled because no mainshock is selected';

    if (status === 'enabled') {
      reset.removeAttribute('title');
      reset.classList.remove('dim');
    } else {
      reset.setAttribute('title', title);
      reset.classList.add('dim');
    }
  };


  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Initialization that depends on other Classes being ready before running.
   */
  _this.postInit = function () {
    // Get things rolling if an Event ID is already set
    if (AppUtil.getParam('eqid')) {
      _this.setMainshock();
    }
  };

  /**
   * Reset to default state.
   */
  _this.reset = function () {
    var el = document.getElementById('mainshock'), // Mainshock details
        significantEqs = _app.Features.getFeature('significant-eqs');

    el.classList.add('hide');

    if (_app.Features.isFeature(significantEqs)) {
      significantEqs.update(); // unselects all Events
    }
  };

  /**
   * Event handler that sets a new Mainshock.
   *
   * Note: triggered automatically if the Event ID <input> is changed by the
   * user; must be called manually if the <input> is changed programmatically.
   */
  _this.setMainshock = function () {
    _app.reset();

    if (_eqid.value) {
      _app.StatusBar.removeItems();
      _createFeatures();
      _setStatus('enabled');
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = SelectBar;
