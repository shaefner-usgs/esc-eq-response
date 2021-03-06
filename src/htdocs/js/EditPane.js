'use strict';


var AppUtil = require('util/AppUtil');


/**
 * Handle form fields and set URL to match application state; display Mainshock
 *   details.
 *
 * Also kicks off creation of Features.
 *
 * @param options {Object}
 *   {
 *     app: {Object}, // Application
 *     el: {Element}
 *   }
 *
 * @return _this {Object}
 *   {
 *     addFeature: {Function},
 *     addLoader: {Function},
 *     initFeatures: {Function},
 *     postInit: {Function},
 *     removeFeature: {Function},
 *     reset: {Function},
 *     selSignificantEq: {Function},
 *     setDefaults: {Function},
 *     setFocusedField: {Function}
 *     showMainshock: {Function}
 *   }
 */
var EditPane = function (options) {
  var _this,
      _initialize,

      _app,
      _el,
      _eqid,
      _eqidPrevValue,
      _fields,
      _focusedField,
      _timers,

      _addListener,
      _checkIfNew,
      _checkIfValid,
      _getDefaults,
      _hideMainshock,
      _initListeners,
      _loadEvent,
      _refreshFeature,
      _resetCounts,
      _resetForm,
      _resetTitle,
      _saveFocusedField;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _el = options.el || document.createElement('div');
    _eqid = document.getElementById('eqid');
    _eqidPrevValue = null;
    _fields = _el.querySelectorAll('input'); // all form fields
    _timers = {};

    _initListeners();
    AppUtil.setFormFieldValues();
    AppUtil.setQueryStringValues();
  };

  /**
   * Add an event listener
   *
   * @param els {NodeList | Array}
   *     Elements
   * @param type {String}
   *     Event type
   * @param listener {Function}
   */
  _addListener = function (els, type, listener) {
    var i;

    for (i = 0; i < els.length; i ++) {
      els[i].addEventListener(type, listener);
    }
  };

  /**
   * Check if eqid entered by user is 'new' (different from previous value)
   *
   * @return isNew {Boolean}
   */
  _checkIfNew = function () {
    var isNew = false;

    if (_eqidPrevValue && _eqid.value !== _eqidPrevValue) {
      isNew = true;
    }
    _eqidPrevValue = _eqid.value; // cache previous value

    return isNew;
  };

  /**
   * Check if eqid is valid and exists
   *
   * @return isValid {Boolean}
   */
  _checkIfValid = function () {
    var isValid,
        regex;

    isValid = false;
    regex = /^[^/\\:]+$/; // no slashes, colons

    // 404 error is logged if eqid not found
    if (regex.test(_eqid.value) && !_app.StatusBar.hasError('mainshock')) {
      isValid = true;
    }

    return isValid;
  };

  /**
   * Get default values for form fields that depend on user-selected mainshock
   *
   * Default values for aftershock and historical seismicity differences are
   * based on rupture length, which we estimate from the Hanks-Bakun (2014)
   * magitude-area relation. We round to the nearest 10km via 10*round(0.1*value).
   *
   * ruptureArea = 10**(M-4), ruptureLength(approx) = A**0.7
   *
   * Aftershock / Forshock distance = ruptureLength,
   * Historical distance = 1.5 * ruptureLength
   *
   * @return {Object}
   */
  _getDefaults = function () {
    var mag,
        ruptureArea,
        ruptureLength;

    mag = _app.Features.getFeature('mainshock').json.properties.mag;
    ruptureArea = Math.pow(10, mag - 4);
    ruptureLength = Math.pow(ruptureArea, 0.7);

    return {
      'as-dist': Math.max(5, 10 * Math.round(0.1 * ruptureLength)),
      'as-mag': 0,
      'fs-days': 30,
      'fs-dist': Math.max(5, 10 * Math.round(0.1 * ruptureLength)),
      'fs-mag': 1,
      'hs-dist': Math.max(20, 15 * Math.round(0.1 * ruptureLength)),
      'hs-mag': Math.round(Math.max(4, mag - 2)),
      'hs-years': 10
    };
  };

  /**
   * Hide mainshock details on edit pane
   */
  _hideMainshock = function () {
    _el.querySelector('.details').classList.add('hide');
  };

  /**
   * Initialize event listeners
   *
   * Note that _addListener() expects a NodeList (or an array) as the first arg
   */
  _initListeners = function () {
    var aftershocks,
        foreshocks,
        historical,
        reset;

    aftershocks = _el.querySelectorAll('.aftershocks');
    foreshocks = _el.querySelectorAll('.foreshocks');
    historical = _el.querySelectorAll('.historical');
    reset = _el.querySelector('.reset');

    // Update querystring param when form field is changed
    _addListener(_fields, 'input', AppUtil.updateParam);

    // Remember focused field
    _addListener(_fields, 'focus', _saveFocusedField);

    // Load a new set of Feature layers when eqid is changed
    _addListener([_eqid], 'input', _loadEvent);

    // Update Features when params are changed (fires when change is committed)
    _addListener(aftershocks, 'input', _refreshFeature);
    _addListener(foreshocks, 'input', _refreshFeature);
    _addListener(historical, 'input', _refreshFeature);

    // Clear Features when reset button is pressed
    _addListener([reset], 'click', _app.resetApp);
  };

  /**
   * Load a new Event (triggered when the Event ID field is changed)
   */
  _loadEvent = function () {
    var id = 'mainshock';

    if (this.value) {
      // Immediately show loading status (don't wait for throttle timers)
      _app.StatusBar.clearItems();
      _app.StatusBar.addItem({
        id: id,
        name: 'Mainshock'
      });

      if (!Object.prototype.hasOwnProperty.call(_timers, id)) {
        _timers[id] = [];
      }

      _timers[id].forEach(function(timer) { // clear throttled requests
        window.clearTimeout(timer);
        _timers[id].shift();
      });

      _timers[id].push( // throttle requests
        window.setTimeout(function() {
          _this.initFeatures();
        }, 500)
      );
    } else {
      _app.resetApp();
    }
  };

  /**
   * Refresh a Feature (triggered when a Feature's form field is changed)
   */
  _refreshFeature = function () {
    var div,
        eqidIsValid,
        feature,
        featureId;

    eqidIsValid = _checkIfValid();

    if (eqidIsValid) {
      div = this; // parent container of form field
      featureId = div.className;
      feature = _app.Features.getFeature(featureId);

      // Immediately show loading status (don't wait for trottle timers)
      if (feature) { // not set if Feature failed to load (e.g. bad request)
        _app.StatusBar.addItem({
          id: feature.id,
          name: feature.name
        });
      }

      if (!Object.prototype.hasOwnProperty.call(_timers, featureId)) {
        _timers[featureId] = [];
      }

      _timers[featureId].forEach(function(timer) { // clear throttled requests
        window.clearTimeout(timer);
        _timers[featureId].shift();
      });

      _timers[featureId].push( // throttle requests
        window.setTimeout(function() {
          if (feature) {
            _app.SummaryPane.disableDownload();
            _app.Features.refreshFeature(feature);
          } else { // feature never instantiated (likely due to a bad ajax request)
            _app.Features.instantiateFeature(featureId);
          }
          _app.PlotsPane.rendered = false; // flag to re-render plots for Feature
        }, 500)
      );
    }
  };

  /**
   * Reset counts on Feature headers for form controls
   */
  _resetCounts = function () {
    var counts;

    counts = _el.querySelectorAll('.count');
    counts.forEach(function(count) {
      count.classList.add('hide');
      count.textContent = '';
    });
  };

  /**
   * Reset significant eqs (input fields cleared by reset button), querystring
   */
  _resetForm = function () {
    var select;

    // Set a slight delay so 'Reset' button can finish clearing input fields first
    setTimeout(function() {
      AppUtil.setQueryStringValues(); // reset query string

      // Rebuild significant eqs pulldown (to set selected item if necessary)
      select = _el.querySelector('.significant');
      if (select) {
        select.parentNode.removeChild(select);
        _app.SignificantEqs.addSignificantEqs();
      }
    }, 25);
  };

  /**
   * Reset page title to default and return it
   *
   * @return title {String}
   */
  _resetTitle = function () {
    var title;

    // Only keep 'generic' portion of title after '|' char (app name)
    title = document.title.split('|')[1] || document.title.split('|')[0];
    document.title = title;

    return title;
  };

  /**
   * Save id of form field selected (focused) by user
   *
   * @param e {Event}
   */
  _saveFocusedField = function (e) {
    _focusedField = e.target.id;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add count to Feature's name and hide 'loader'
   *
   * @param feature {Object}
   */
  _this.addFeature = function (feature) {
    var count,
        div,
        loader;

    div = _el.querySelector('.' + feature.id);

    if (div) { // Feature has configuration params
      loader = div.querySelector('.breather');
      loader.classList.add('hide');

      // Add count if applicable
      count = div.querySelector('.count');
      if (count && Object.prototype.hasOwnProperty.call(feature, 'count')) {
        count.textContent = feature.count;
        count.classList.remove('hide');
      }
    }
  };

  /**
   * Show 'loader' next to Feature's name and hide count
   *
   * @param feature {Object}
   */
  _this.addLoader = function (feature) {
    var count,
        div,
        loader;

    div = _el.querySelector('.' + feature.id);

    if (div) { // Feature has configuration params
      loader = div.querySelector('.breather');
      loader.innerHTML = '<div></div>';
      loader.classList.remove('hide');

      count = div.querySelector('.count');
      if (count) {
        count.classList.add('hide');
      }
    }
  };

  /**
   * Create Features (and subsequently add them to map, plots and summary panes)
   */
  _this.initFeatures = function () {
    var eqidIsValid;

    _app.resetApp(); // first reset app to default state

    eqidIsValid = _checkIfValid();
    if (eqidIsValid) {
      // Instantiate mainshock (other features are created after mainshock is ready)
      _app.Features.instantiateFeature('mainshock');
    }
  };

  /**
   * Initialization that depends on app's "primary" Classes already being
   *   instantiated in Application.js.
   */
  _this.postInit = function () {
    // Get things rolling if eqid is already set
    if (AppUtil.getParam('eqid') !== '') {
      _this.initFeatures();
    }
  };

  /**
   * Hide 'loader' and count next to Feature's name
   *
   * @param feature {Object}
   */
  _this.removeFeature = function (feature) {
    var count,
        div,
        loader;

    div = _el.querySelector('.' + feature.id);

    if (div) { // Feature has configuration params
      count = div.querySelector('.count');
      loader = div.querySelector('.breather');

      loader.classList.add('hide');
      if (count) {
        count.classList.add('hide');
      }
    }
  };

  /**
   * Reset edit pane to initial state
   */
  _this.reset = function () {
    _hideMainshock();
    _resetCounts();
    _resetForm();
    _resetTitle();
  };

  /**
   * Set user selected significant eq as mainshock
   */
  _this.selSignificantEq = function () {
    var index,
        significant;

    significant = _el.querySelector('.significant');
    index = significant.selectedIndex;

    _eqid.value = significant.options[index].value;

    // Call manually (eqid input event not triggered when value changed programmatically)
    AppUtil.setQueryStringValues();
    _this.initFeatures();
  };

  /**
   * Set default form field values / url params based on mainshock's details
   */
  _this.setDefaults = function () {
    var defaults,
        eqidIsNew;

    defaults = _getDefaults();
    eqidIsNew = _checkIfNew();

    // First, update url params with defaults
    Object.keys(defaults).forEach(function(key) {
      // Only set default value if empty or user entered a 'new' Event ID
      if (AppUtil.getParam(key) === '' || eqidIsNew) {
        AppUtil.setParam(key, defaults[key]);
      }
    });

    // Next, update all form fields to match url params
    AppUtil.setFormFieldValues();
  };

  /**
   * Set focus to field last selected by user (or Event ID field by default)
   */
  _this.setFocusedField = function () {
    var field;

    field = 'eqid'; // default
    if (_focusedField) {
      field = _focusedField;
    }
    document.getElementById(field).focus();
  };

  /**
   * Display mainshock's details on edit pane and also update <title>
   */
  _this.showMainshock = function () {
    var appTitle,
        details,
        mainshock,
        props;

    appTitle = _resetTitle();
    details = _el.querySelector('.details');
    mainshock = _app.Features.getFeature('mainshock');
    props = mainshock.json.properties;

    details.innerHTML = mainshock.mapLayer.getLayers()[0].getPopup().getContent();
    details.classList.remove('hide');

    document.title = props.magType + ' ' + AppUtil.round(props.mag, 1) +
      ' - ' + props.place + ' | ' + appTitle;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = EditPane;
