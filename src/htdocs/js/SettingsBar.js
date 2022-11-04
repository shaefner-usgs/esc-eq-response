'use strict';


var AppUtil = require('util/AppUtil'),
    RadioBar = require('util/RadioBar');


var _SETTINGS = { // defaults
  'as-mag': 0,
  catalog: 'comcat',
  'fs-days': 30,
  'fs-mag': 1,
  'hs-years': 10,
  timezone: 'utc'
};


/**
 * Refresh Features and swap between catalogs and timezones when the settings
 * are changed. Also set the URL parameters to match the application's state
 * and set default values based on the selected Mainshock.
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
 *       setFocusedField: {Function}
 *       setValues: {Function}
 *     }
 */
var SettingsBar = function (options) {
  var _this,
      _initialize,

      _app,
      _catalogBar,
      _el,
      _focusedField,
      _throttlers,
      _timezoneBar,

      _addFeatures,
      _addListeners,
      _addOffset,
      _getDefaults,
      _hasChanged,
      _initButtons,
      _refreshFeature,
      _setCatalog,
      _setField,
      _setParam,
      _setStatus,
      _setTimeZone,
      _update;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;
    _catalogBar = RadioBar({
      el: document.getElementById('catalog')
    });
    _el = options.el;
    _throttlers = {};
    _timezoneBar = RadioBar({
      el: document.getElementById('timezone')
    });

    _addListeners();
    _addOffset();
    _setStatus('disabled');
  };

  /**
   * Add the given catalog's Features.
   *
   * @param catalog {String <comcat|dd>}
   */
  _addFeatures = function (catalog) {
    var features = _app.Features.getFeatures(catalog);

    Object.keys(features).forEach(id => {
      var feature = features[id];

      _app.Features.addFeature(feature);

      if (_hasChanged(feature)) {
        _refreshFeature(id);
      }
    });
  };

  /**
   * Add event listeners.
   */
  _addListeners = function () {
    var catalog = _el.querySelectorAll('#catalog li'),
        inputs = _el.querySelectorAll('input'),
        timezone = _el.querySelectorAll('#timezone li');

    // Set the catalog and timezone options
    catalog.forEach(button => button.addEventListener('click', _setCatalog));
    timezone.forEach(button => button.addEventListener('click', _setTimeZone));

    // Track changes to input fields
    inputs.forEach(input => {
      input.addEventListener('focus', _setField);
      input.addEventListener('input', _update);
    });

    // Safari clears form fields w/ autocomplete="off" when navigating "back" to app
    window.addEventListener('pageshow', () => {
      if (document.body.classList.contains('mainshock')) {
        // Set a slight delay so browser doesn't wipe out updated values
        setTimeout(_this.setValues, 25);
      }
    });
  };

  /**
   * Add the current UTC offset to 'User' timezone button.
   */
  _addOffset = function () {
    var button = document.getElementById('user');

    button.innerText += ` (${_app.utcOffset})`;
  };

  /**
   * Get the default parameter values for the selected Mainshock.
   *
   * Default values for distances are based on rupture length, which we estimate
   * from the Hanks-Bakun (2014) magnitude-area relation, rounded the nearest
   * 10km.
   *
   * ruptureArea (A) = 10 ** (M - 4)
   * ruptureLength = A ** 0.7 (approx)
   *
   * Aftershock, Foreshock distance = ruptureLength (km, min 5)
   * Historical distance = 1.5 * ruptureLength (km, min 20)
   *
   * @return {Object}
   */
  _getDefaults = function () {
    var mag = _app.Features.getFeature('mainshock').data.mag,
        ruptureArea = Math.pow(10, mag - 4),
        ruptureLength = Math.pow(ruptureArea, 0.7);

    return Object.assign({}, _SETTINGS, {
      'as-dist': Math.max(5, 10 * Math.round(0.1 * ruptureLength)),
      'fs-dist': Math.max(5, 10 * Math.round(0.1 * ruptureLength)),
      'hs-dist': Math.max(20, 15 * Math.round(0.1 * ruptureLength)),
      'hs-mag': Math.round(Math.max(4, mag - 2)),
    });
  };

  /**
   * Check if the given Feature's settings have changed since it was last
   * fetched.
   *
   * @param feature {Object}
   *
   * @return changed {Boolean}
   */
  _hasChanged = function (feature) {
    var inputs,
        changed = false, // default
        lookup = {
          dist: 'distance',
          mag: 'magnitude'
        },
        settings = _el.querySelector('.' + feature.id);

    if (settings) {
      inputs = settings.querySelectorAll('input');

      inputs.forEach(input => {
        var key = input.id.replace(/[a|f|h]s-/, '');

        key = lookup[key] || key;

        if (Number(input.value) !== feature.params[key]) {
          changed = true;
        }
      });
    }

    return changed;
  };

  /**
   * Set the initially selected catalog and timezone RadioBar buttons.
   */
  _initButtons = function () {
    var catalog = AppUtil.getParam('catalog') || _SETTINGS['catalog'],
        timezone = AppUtil.getParam('timezone') || _SETTINGS['timezone'],
        buttons = [
          document.getElementById(catalog),
          document.getElementById(timezone)
        ];

    buttons.forEach(button => {
      button.click(); // set selected button in UI
    });
  };

  /**
   * Refresh a Feature, throttling stacked requests when user changes Feature's
   * settings rapidly.
   *
   * @param id {String}
   *     Feature id
   */
  _refreshFeature = function (id) {
    var feature = _app.Features.getFeature(id);

    if (document.body.classList.contains('mainshock')) {
      // Immediately show loading status (don't wait for throttlers)
      _app.StatusBar.addItem({
        id: id,
        name: feature.name
      });

      if (_throttlers[id]) {
        clearTimeout(_throttlers[id]);
      }

      _throttlers[id] = setTimeout(_app.Features.refreshFeature, 500, id);

      _app.PlotsPane.rendered = false; // flag to (re-)render plots
    }
  };

  /**
   * Event handler that sets the earthquake catalog option.
   */
  _setCatalog = function () {
    var catalogs, mainshock, pane, prevCatalog, prevFeatures, status,
        catalog = this.id;

    _setParam('catalog', catalog);

    if (document.body.classList.contains('mainshock')) {
      catalogs = _catalogBar.getIds(),
      mainshock = _app.Features.getFeature('mainshock'),
      pane = _app.Pane.getSelected(),
      prevCatalog = catalogs.filter(item => item !== catalog)[0],
      prevFeatures = _app.Features.getFeatures(prevCatalog),
      status = _app.Features.getStatus(catalog);

      mainshock.update(catalog);
      mainshock.disableDownload();

      // Remove previous catalog's Features
      Object.keys(prevFeatures).forEach(id => {
        _app.Features.removeFeature(prevFeatures[id], false);
      });

      if (status === 'ready') { // re-add selected catalog's Features
        _addFeatures(catalog);
      } else { // create (and add) new catalog's Features
        _app.Features.createFeatures(catalog);
      }

      if (pane !== 'mapPane') {
        _app.Pane.setScrollPosition(pane);
      }

      _app.PlotsPane.rendered = false; // flag to (re-)render plots
    }
  };

  /**
   * Event handler that saves the last focused field and selects the text in the
   * field (when clicking the label or tabbing between fields).
   *
   * Note: doesn't work when clicking inside the field in some browsers.
   *
   * @param e {Event}
   */
  _setField = function (e) {
    var input = e.target;

    _focusedField = input.id;

    input.select();
  };

  /**
   * Set (or delete) the given URL parameter, depending on whether or not the
   * given value is the default.
   *
   * @param name {String}
   * @param value {String}
   */
  _setParam = function (name, value) {
    if (value === _SETTINGS[name]) { // default
      AppUtil.deleteParam(name, value);
    } else {
      AppUtil.setParam(name, value);
    }
  };

  /**
   * Set the status of the <input> fields and required notice.
   *
   * @param status {String <enabled|disabled>}
   */
  _setStatus = function (status) {
    var inputs = _el.querySelectorAll('input'),
        required = _el.querySelector('.required'),
        title = 'Disabled because no mainshock is selected';

    inputs.forEach(input => {
      if (status === 'enabled') {
        input.removeAttribute('disabled');
        input.removeAttribute('title');
      } else {
        input.setAttribute('disabled', 'disabled');
        input.setAttribute('title', title);
      }
    });

    if (status === 'enabled') {
      required.classList.remove('hide');
    } else {
      required.classList.add('hide');
    }
  };

  /**
   * Event handler that sets the timezone option.
   */
  _setTimeZone = function () {
    var tables,
        timezone = this.id,
        tzs = _timezoneBar.getIds();

    tzs.forEach(tz => document.body.classList.remove(tz));

    document.body.classList.add(timezone);
    _setParam('timezone', timezone);

    if (document.body.classList.contains('mainshock')) {
      tables = document.querySelectorAll('#summaryPane table.list.sortable');

      _app.PlotsPane.update();
      _app.SummaryPane.swapSortIndicator(tables);
    }
  };

  /**
   * Event handler that updates the URL parameter and refreshes a Feature.
   */
  _update = function () {
    var classList = Array.from(this.closest('div').classList),
        id = classList.filter(className => !className.includes('dd-'))[0];

    if (AppUtil.getParam('catalog') === 'dd') {
      id = classList.filter(className => className.includes('dd-'))[0];
    }

    AppUtil.updateParam(this.id); // <input> id

    if (this.value !== '') {
      _refreshFeature(id);
    }
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Initialization that depends on other Classes being ready before running.
   */
  _this.postInit = function () {
    _initButtons();
  };

  /**
   * Reset to default state.
   *
   * Note: Feature counts are removed separately via Features.js.
   */
  _this.reset = function () {
    var inputs = _el.querySelectorAll('input');

    inputs.forEach(input =>
      input.value = ''
    );

    _focusedField = null;

    _setStatus('disabled');
  };

  /**
   * Set the focus to the last field selected by the user.
   */
  _this.setFocusedField = function () {
    if (_focusedField) {
      document.getElementById(_focusedField).focus();
    }
  };

  /**
   * Set the input field values to the selected Mainshock's defaults. URL
   * parameter values (if present) override the defaults.
   */
  _this.setValues = function () {
    var defaults = _getDefaults();

    Object.keys(defaults).forEach(key => {
      var input = document.getElementById(key),
          param = AppUtil.getParam(key);

      if (input) {
        if (param) {
          input.value = param;
        } else {
          input.value = defaults[key];
        }
      }
    });

    _setStatus('enabled');
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = SettingsBar;
