'use strict';


var AppUtil = require('util/AppUtil'),
    Luxon = require('luxon'),
    RadioBar = require('util/controls/RadioBar'),
    Switch = require('util/controls/Switch');


var _SETTINGS = { // defaults
  aftershocks: 'm15',
  'as-mag': 0,
  catalog: 'comcat',
  'catalog-search': 'm15',
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
 *       resetCatalog: {Function}
 *       setFocusedField: {Function}
 *       setInterval: {Function}
 *       setStatus: {Function}
 *       setValues: {Function}
 *       updateTimeStamp: {Function}
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
      _timers,
      _timezoneBar,
      _title,

      _addFeatures,
      _addListeners,
      _addOffset,
      _getDefaults,
      _getFeatureId,
      _getInterval,
      _getTitle,
      _hasChanged,
      _initButtons,
      _initSwitches,
      _setCatalog,
      _setField,
      _setParam,
      _setRefresh,
      _setTimeout,
      _setTimeZone,
      _swapTimer,
      _update;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;
    _catalogBar = RadioBar({
      el: document.getElementById('catalog')
    });
    _el = options.el;
    _throttlers = {};
    _timers = {};
    _timezoneBar = RadioBar({
      el: document.getElementById('timezone')
    });

    RadioBar({
      el: document.getElementById('as-refresh')
    });
    RadioBar({
      el: document.getElementById('cs-refresh')
    });

    Switch({
      el: document.getElementById('aftershocks')
    });
    Switch({
      el: document.getElementById('catalog-search')
    });

    _addListeners();
    _addOffset();
    _initSwitches();
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
        _app.Features.refreshFeature(id);
      }
    });
  };

  /**
   * Add event listeners.
   */
  _addListeners = function () {
    var catalog = _el.querySelectorAll('#catalog li'),
        inputs = _el.querySelectorAll('input[type=number]'),
        selectors = [
          'input[type=checkbox] + label',
          '#as-refresh',
          '#cs-refresh'
        ],
        refresh = _el.querySelectorAll(selectors.join()),
        timezone = _el.querySelectorAll('#timezone li');

    // Set the catalog, timezone and refresh options
    catalog.forEach(button => button.addEventListener('click', _setCatalog));
    refresh.forEach(target => target.addEventListener('click', _setRefresh));
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
    var button = document.getElementById('user'),
        minutes = new Date().getTimezoneOffset(),
        hours = Math.abs(minutes / 60),
        sign = (minutes > 0 ? '-' : '+'),
        utcOffset = `UTC${sign}${hours}`;

    button.innerText += ` (${utcOffset})`;
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
   * Get the Feature id from the given name.
   *
   * @param name {String}
   *     URL parameter name
   *
   * @return featureId {String}
   */
  _getFeatureId = function (name) {
    var featureId = name;

    if (name === 'aftershocks' && AppUtil.getParam('catalog') === 'dd') {
      featureId = 'dd-aftershocks'; // add double-difference prefix
    }

    return featureId;
  };

  /**
   * Get the refresh interval (in milliseconds) from the URL parameter value
   * with the given name.
   *
   * @param name {String}
   *     URL parameter name
   *
   * @return {Integer}
   */
  _getInterval = function (name) {
    var value = AppUtil.getParam(name);

    return parseInt(value.replace(/\D/g, '')) * 60 * 1000; // strip 'm'
  };

  /**
   * Get the title attribute for the given Feature's inputs.
   *
   * @param feature {Object}
   *
   * @return title {String}
   *     hint to user explaining why Feature's settings are disabled
   */
  _getTitle = function (feature) {
    var input, title;

    if (!_title) {
      input = _el.querySelector('input[type=number]'); // first input w/ title
      _title = input.title; // cache initial value
    }

    if (document.body.classList.contains('mainshock')) {
      title = `Disabled because ${feature.name} failed to load`;
    } else {
      title = _title;
    }

    return title;
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
      inputs = settings.querySelectorAll('input[type=number]');

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
   * Set the initially selected catalog, timezone and refresh buttons.
   */
  _initButtons = function () {
    var aftershocks = AppUtil.getParam('aftershocks') || _SETTINGS['aftershocks'],
        catalog = AppUtil.getParam('catalog') || _SETTINGS['catalog'],
        search = AppUtil.getParam('catalog-search') || _SETTINGS['catalog-search'],
        timezone = AppUtil.getParam('timezone') || _SETTINGS['timezone'],
        buttons = [
          _el.querySelector('#aftershocks ~ .details .' + aftershocks),
          _el.querySelector('#catalog-search ~ .details .' + search),
          document.getElementById(catalog),
          document.getElementById(timezone)
        ];

    buttons.forEach(button => {
      button.click(); // set selected button in UI
    });
  };

  /**
   * Set the initial switch positions.
   */
  _initSwitches = function () {
    var params = [
      'aftershocks',
      'catalog-search'
    ];

    params.forEach(param => {
      var details;

      if (AppUtil.getParam(param)) {
        details = _el.querySelector(`#${param} ~ .details`);

        if (details) {
          details.classList.remove('hide');
        }

        document.getElementById(param).checked = true;
      }
    });
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
      pane = _app.Pane.getSelPane(),
      prevCatalog = catalogs.find(item => item !== catalog),
      prevFeatures = _app.Features.getFeatures(prevCatalog),
      status = _app.Features.getStatus(catalog);

      mainshock.update(catalog);
      mainshock.disableDownload();
      _swapTimer();

      // Remove previous catalog's Features
      Object.keys(prevFeatures).forEach(id => {
        _app.Features.removeFeature(prevFeatures[id], false);
      });

      // Create (and add) or re-add selected catalog's Features
      if (status === 'ready') {
        _addFeatures(catalog);
      } else {
        _app.Features.createFeatures(catalog);
      }

      if (pane !== 'mapPane') {
        _app.Pane.setScrollPosition(pane);
      }
      if (pane !== 'plotsPane') {
        _app.PlotsPane.rendered = false; // flag to (re-)render plots
      }
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
   * Event handler that sets the auto-refresh option.
   *
   * @param e {Event}
   */
  _setRefresh = function (e) {
    var div = e.target.closest('.refresh'),
        input = div.querySelector('input'),
        featureId = _getFeatureId(input.id),
        name = input.id,
        selected = div.querySelector('.selected'),
        tagName = e.target.tagName.toLowerCase(),
        value = Array.from(selected.classList).find(className =>
          className !== 'selected'
        );

    if (input.checked) {
      AppUtil.setParam(name, value);

      if (tagName === 'li') { // interval changed
        _setTimeout(name);
      } else if (tagName !== 'ul') { // switch turned on
        _app.Features.refreshFeature(featureId);
        _this.setInterval(name);
      } else { // RadioBar border clicked
        return;
      }
    } else { // switch turned off
      AppUtil.deleteParam(name);
      clearInterval(_timers[name]);
    }
  };

  /**
   * Set a one-off (non-recurring) refresh timer for the Feature matching the
   * given name. Then start an auto-refresh interval timer when the timeout
   * finishes.
   *
   * @param name {String}
   *     URL parameter name
   */
  _setTimeout = function (name) {
    var elapsed,
        id = _getFeatureId(name),
        interval = _getInterval(name),
        delay = interval, // default
        feature = _app.Features.getFeature(id);

    // Set delay based on elapsed time in the current auto-refresh cycle
    if (_app.Features.isFeature(feature)) {
      delay = 0;
      elapsed = Date.now() - feature.updated;

      if (elapsed < interval) {
        delay = interval - elapsed;
      }
    }

    clearInterval(_timers[name]); // cancel existing interval timer first
    clearTimeout(_timers.oneOff); // ensure a single timer is set

    _timers.oneOff = setTimeout(function() {
      _app.Features.refreshFeature(id);
      _this.setInterval(name);
    }, delay);
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
   * Swap the Aftershocks auto-refresh timer, if it is set, to keep it in sync
   * with the selected catalog.
   */
  _swapTimer = function () {
    var param = AppUtil.getParam('aftershocks'); // auto-refresh setting

    if (param) {
      _setTimeout('aftershocks');
    }
  };

  /**
   * Event handler that refreshes a Feature and updates its URL parameter.
   */
  _update = function () {
    var feature,
        classList = Array.from(this.closest('div').classList),
        id = classList.find(className => !className.includes('dd-')),
        mainshock = document.body.classList.contains('mainshock');

    if (AppUtil.getParam('catalog') === 'dd') {
      id = classList.find(className => className.includes('dd-'));
    }

    feature = _app.Features.getFeature(id);

    AppUtil.updateParam(this.id); // <input> id

    if (mainshock && this.value !== '') {
      // Throttle stacked requests if user changes settings rapidly
      clearTimeout(_throttlers[id]); // ensure one timer per Feature
      _throttlers[id] = setTimeout(_app.Features.refreshFeature, 500, id);

      // Show loading status immediately (don't wait for throttlers)
      _app.StatusBar.addItem({
        id: id,
        name: feature.name
      });
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
    var inputs = _el.querySelectorAll('input[type=number]');

    inputs.forEach(input => {
      input.value = '';

      if (_title) { // set back to initial value if title attr changed
        input.title = _title;
      }
    });
    _focusedField = null;

    clearInterval(_timers.aftershocks);
    clearTimeout(_timers.oneOff);
  };

  /**
   * Reset the earthquake catalog setting to ComCat (default).
   */
  _this.resetCatalog = function () {
    var comcat = document.getElementById('comcat');

    _catalogBar.setOption.call(comcat);
    AppUtil.deleteParam('catalog');
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
   * Set an auto-refresh interval timer for the Feature matching the given name.
   *
   * @param name {String}
   *     URL parameter name
   */
  _this.setInterval = function (name) {
    var id = _getFeatureId(name),
        interval = _getInterval(name);

    clearInterval(_timers[name]); // ensure a single timer per Feature is set

    _timers[name] = setInterval(_app.Features.refreshFeature, interval, id);
  };

  /**
   * Set the status of the given Feature's configuration options.
   *
   * @param feature {Object}
   * @param status {String <disabled|enabled>} default is 'disabled'
   */
  _this.setStatus = function (feature, status = 'disabled') {
    var inputs, title,
        div = _el.querySelector('.' + feature.id);

    if (div) { // Feature has config options
      inputs = div.querySelectorAll('input[type=number]');
      title = _getTitle(feature);

      div.classList.remove('disabled', 'enabled');
      div.classList.add(status);

      inputs.forEach(input => {
        if (status === 'disabled') {
          input.setAttribute('disabled', 'disabled');
          input.setAttribute('title', title);
        } else {
          input.removeAttribute('disabled');
          input.removeAttribute('title');
        }
      });
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
  };

  /**
   * Update the given Feature's timestamp.
   *
   * @param feature {Object}
   */
  _this.updateTimeStamp = function (feature) {
    var datetime, el, id, tz, userTime;

    if (feature.id.includes('aftershocks') || feature.id === 'catalog-search') {
      datetime = Luxon.DateTime.fromMillis(feature.updated),
      id = feature.id.replace(/^dd-/, ''), // remove double-difference prefix
      el = document.getElementById(id).parentNode.querySelector('time'),
      tz = AppUtil.getTimeZone(),
      userTime = datetime.toFormat("ccc, LLL d, yyyy 'at' tt"); // eslint-disable-line

      el.innerHTML = `${userTime} (${tz})`;
      el.setAttribute('datetime', datetime.toISO());
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = SettingsBar;
