'use strict';


var AppUtil = require('util/AppUtil');


/**
 * Kick off the creation of Features when the user selects a Mainshock and also
 * display its details below the Event ID <input>.
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
    var reset,
        search;

    reset = document.getElementById('reset');
    search = _el.querySelector('.search');

    // Reset app when the reset button is clicked
    reset.addEventListener('click', e => {
      var input = _el.querySelector('input');

      e.preventDefault();

      input.value = '';

      _app.MapPane.showSearchLayer();
      _app.NavBar.reset();
      _app.reset();
      _app.setScrollPosition('selectBar'); // scroll to top
    });

    // Show the SearchBar when the 'search' link is clicked
    search.addEventListener('click', e => {
      e.preventDefault();

      _app.NavBar.switchSideBars('searchBar');
    });

    // Load a new set of Features when the Mainshock <input> is changed
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
   * Check if the current value entered in the Event ID field is valid.
   *
   * @return isValid {Boolean}
   */
  _isEqidValid = function () {
    var isValid,
        regex;

    isValid = false;
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
   * Handler for creating a new Mainshock - triggered when the Event ID <input>
   * is changed.
   *
   * Note: must be called manually when the Event ID is changed programmatically.
   */
  _this.handleMainshock = function () {
    var id = 'mainshock';

    _app.reset();

    if (_eqid.value) {
      _app.JsonFeed.initThrottlers(id);

      // Immediately show loading status (don't wait for throttle timers)
      _app.StatusBar.clearItems();
      _app.StatusBar.addItem({
        id: id,
        name: 'Mainshock'
      });

      // Throttle requests
      _app.JsonFeed.throttlers[id].push(
        setTimeout(_createMainshock, 500)
      );
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
    var details,
        mainshock;

    details = _el.querySelector('.details');
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
