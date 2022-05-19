'use strict';


var AppUtil = require('util/AppUtil');


/**
 * Kick off the creation of Features when the user selects a Mainshock and also
 * display its details on the SelectBar.
 *
 * @param options {Object}
 *   {
 *     app: {Object} Application
 *     el: {Element}
 *   }
 *
 * @return _this {Object}
 *   {
 *     handleMainshock: {Function}
 *     postInit: {Function}
 *     reset: {Function}
 *     showMainshock: {Function}
 *   }
 */
var SelectBar = function (options) {
  var _this,
      _initialize,

      _app,
      _el,
      _eqid,

      _addListeners,
      _createMainshock,
      _hardReset,
      _isEqidValid;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _el = options.el || document.createElement('section');
    _eqid = document.getElementById('eqid');

    // Set the Event ID <input>'s value
    _eqid.value = AppUtil.getParam('eqid');

    _addListeners();
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

      _app.NavBar.switchSideBars('searchBar');
    });

    // Create a new Mainshock and load its Features
    _eqid.addEventListener('input', _this.handleMainshock);
  };

  /**
   * Create a new Mainshock (which subsequently creates all other Features).
   */
  _createMainshock = function () {
    var message;

    if (_isEqidValid()) {
      AppUtil.setParam('eqid', _eqid.value);
      _app.Features.createFeature('mainshock');
    } else {
      message = '' +
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
   * Do a 'hard' reset when the 'Reset Mainshock' button is clicked.
   */
  _hardReset = function (e) {
    var input = _el.querySelector('input');

    e.preventDefault();
    this.classList.add('dim');

    input.value = '';

    _app.reset();
    _app.setScrollPosition('selectBar'); // scroll to top
    _app.MapPane.showSearchLayer();
    _app.NavBar.reset();
  };

  /**
   * Check if the current value entered in the Event ID field is valid.
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

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Handler for creating a new Mainshock. Triggered when the Event ID <input>
   * is changed.
   *
   * Note: must be called manually when the Event ID is changed programmatically.
   */
  _this.handleMainshock = function () {
    var id = 'mainshock',
        reset = document.getElementById('reset');

    _app.reset();

    if (_eqid.value) {
      _app.JsonFeed.initThrottlers(id);

      // Immediately show loading status (don't wait for throttle timers)
      document.body.classList.add('loading');
      _app.StatusBar.clearItems();
      _app.StatusBar.addItem({
        id: id,
        name: 'Mainshock'
      });

      // Throttle requests
      _app.JsonFeed.throttlers[id].push(
        setTimeout(_createMainshock, 500)
      );

      reset.classList.remove('dim');
    }
  };

  /**
   * Initialization that depends on other Classes being ready before running.
   */
  _this.postInit = function () {
    // Get things rolling if an Event ID is already set
    if (AppUtil.getParam('eqid')) {
      _this.handleMainshock();
    }
  };

  /**
   * Reset to default state.
   */
  _this.reset = function () {
    var details = _el.querySelector('.details');

    details.classList.add('hide'); // previously selected Mainshock's details
  };

  /**
   * Show the Mainshock's details.
   */
  _this.showMainshock = function () {
    var details = _el.querySelector('.details'),
        mainshock = _app.Features.getFeature('mainshock');

    details.innerHTML = mainshock.mapLayer.getLayers()[0].getPopup().getContent().outerHTML;
    details.classList.remove('hide');

    _app.TitleBar.setTitle(mainshock.data);
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = SelectBar;
