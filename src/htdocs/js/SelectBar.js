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
 *     createMainshock: {Function}
 *     isEqidValid: {Function}
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
      _handleMainshock;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _el = options.el || document.createElement('section');
    _eqid = document.getElementById('eqid');

    _addListeners();
  };

  /**
   * Add event listeners.
   */
  _addListeners = function () {
    var reset,
        search;

    reset = _el.querySelector('.reset');
    search = _el.querySelector('.search');

    // Reset app when the reset button is clicked
    reset.addEventListener('click', () => {
      _app.NavBar.reset();
      _app.reset();
      _app.setScrollPosition('selectBar'); // scroll to top
    });

    // Show the searchBar when the 'search' link is clicked
    search.addEventListener('click', e => {
      e.preventDefault();

      _app.NavBar.switchSideBars('searchBar');
    });

    // Load a new set of Features when the Mainshock <input> is changed
    _eqid.addEventListener('input', _handleMainshock);
  };

  /**
   * Handler for managing a new Mainshock. Triggered when the Event ID <input>
   * is changed.
   */
  _handleMainshock = function () {
    var id = 'mainshock';

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
        setTimeout(() => {
          _this.createMainshock();
        }, 500)
      );
    } else {
      _app.reset();
    }
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Create a new Mainshock (which subsequently creates all other Features).
   */
  _this.createMainshock = function () {
    _app.reset();

    if (_this.isEqidValid()) {
      document.body.classList.remove('no-mainshock');

      _app.Features.createFeature('mainshock');
    }
  };

  /**
   * Check if the current value entered in the Event ID field is valid and
   * exists.
   *
   * @return isValid {Boolean}
   */
  _this.isEqidValid = function () {
    var isValid,
        regex;

    isValid = false;
    regex = /^[^/\\:]+$/; // no slashes or colons

    // 404 error is logged if Event ID is not found
    if (regex.test(_eqid.value) && !_app.StatusBar.hasError('mainshock')) {
      isValid = true;
    }

    return isValid;
  };

  /**
   * Initialization that depends on other Classes being ready before running.
   */
  _this.postInit = function () {
    // Get things rolling if an eqid is already set
    if (AppUtil.getParam('eqid')) {
      _this.createMainshock();
    }
  };

  /**
   * Reset to default state.
   */
  _this.reset = function () {
    _el.querySelector('.details').classList.add('hide'); // Mainshock details

    _app.SignificantEqs.unselectAll();

    // Add a slight delay so 'Reset' button can clear <input>s first
    setTimeout(() => {
      AppUtil.setQueryString(); // reset query string
    }, 25);
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

    _app.TitleBar.setTitle(mainshock.details);
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = SelectBar;
