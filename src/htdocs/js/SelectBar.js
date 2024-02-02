'use strict';


var AppUtil = require('util/AppUtil');


/**
 * Create the 'event' Features when a new Mainshock is selected or display an
 * error message if the Event ID is invalid. Also perform a 'hard' reset when
 * the user clicks the 'Reset' button.
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

      _addError,
      _addListeners,
      _hardReset,
      _isValid,
      _setStatus;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;
    _el = options.el;
    _eqid = document.getElementById('eqid');

    // Set the Event ID's initial value, if applicable
    _eqid.value = AppUtil.getParam('eqid');

    _addListeners();
    _setStatus();
  };

  /**
   * Add an error message indicating that the Event ID is invalid.
   */
  _addError = function () {
    var message =
      '<h4>Error Loading Mainshock</h4>' +
      '<ul>' +
        `<li>Event ID (${_eqid.value}) is invalid</li>` +
      '</ul>';

    _app.StatusBar.addError({
      id: 'mainshock',
      message: message,
      status: 'invalid'
    });
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
      _app.NavBar.switchSideBar('search');
    });

    // Create a new Mainshock
    _eqid.addEventListener('input', _this.setMainshock);
  };

  /**
   * Event handler that performs a 'hard' reset, returning the app to its
   * default state.
   *
   * @param e {Event}
   */
  _hardReset = function (e) {
    var map = _app.MapPane.map,
        search = _app.Features.getFeature('catalog-search').mapLayer,
        sidebar = document.getElementById('sidebar');

    e.preventDefault();

    _eqid.value = '';
    sidebar.scrollTop = 0;

    if (search && !map.hasLayer(search)) {
      map.addLayer(search);
    }

    _setStatus();
    _app.reset();
    _app.NavBar.reset();
    _app.SettingsBar.resetCatalog();
  };

  /**
   * Check if the Event ID's <input> value is valid.
   *
   * @return isValid {Boolean}
   */
  _isValid = function () {
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
   * @param status {String <enabled|disabled>} default is ''
   */
  _setStatus = function (status = '') {
    var reset = document.getElementById('reset');

    if (status === 'enabled') {
      reset.removeAttribute('title');
      reset.classList.remove('dim');
    } else {
      reset.setAttribute('title', 'Disabled because no mainshock is selected');
      reset.classList.add('dim');
    }
  };


  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Initialization that depends on the app's other Classes being ready first.
   */
  _this.postInit = function () {
    if (AppUtil.getParam('eqid')) {
      _this.setMainshock(); // get things rolling if an Event ID is already set
    }
  };

  /**
   * Reset to default state.
   */
  _this.reset = function () {
    var mainshock = document.getElementById('mainshock'),
        significantEqs = _app.Features.getFeature('significant-eqs');

    mainshock.classList.add('hide');

    if (_app.Features.isFeature(significantEqs)) {
      significantEqs.render(); // unselects all Events
    }
  };

  /**
   * Event handler that sets a new Mainshock.
   *
   * Note: triggered automatically if the Event ID <input> is changed by the
   * user; must be called manually if the <input> is changed programmatically.
   */
  _this.setMainshock = function () {
    var significantEqs = _app.Features.getFeature('significant-eqs');

    _app.reset();

    if (_eqid.value) {
      _setStatus('enabled');

      if (_isValid()) {
        AppUtil.setParam('eqid', _eqid.value);
        _app.Features.createFeatures();

        if (_app.Features.isFeature(significantEqs)) {
          significantEqs.render(); // select Event if applicable
        }
      } else {
        _addError();
      }
    } else {
      _setStatus('disabled');
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = SelectBar;
