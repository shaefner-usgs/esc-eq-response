'use strict';


var AppUtil = require('util/AppUtil'),
    RadioBar = require('util/controls/RadioBar'),
    Switch = require('util/controls/Switch');


var _DEFAULTS = {
  'as-distance': null,
  'as-magnitude': 0,
  'as-refresh': 'm15',
  catalog: 'comcat',
  'cs-refresh': 'm15',
  'fs-days': 30,
  'fs-distance': null,
  'fs-magnitude': 1,
  'hs-distance': null,
  'hs-magnitude': null,
  'hs-years': 10,
  timezone: 'utc'
};


/**
 * Refresh Features and swap between catalogs and timezones when the settings
 * are changed. Also set the URL parameters (and the controls on initial load)
 * to match the current settings and set default values based on the selected
 * Mainshock.
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *       el: {Element}
 *     }
 *
 * @return _this {Object}
 *     {
 *       render: {Function}
 *       reset: {Function}
 *       resetCatalog: {Function}
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
      _field,
      _inputs,
      _intervals,
      _throttlers,
      _timeouts,
      _timezone,
      _timezoneBar,
      _title,

      _addFeatures,
      _addListeners,
      _addOffset,
      _getDefaults,
      _getFeatureId,
      _getInterval,
      _getParams,
      _getTitle,
      _hasChanged,
      _initControls,
      _removeCounts,
      _removeFeatures,
      _setCatalog,
      _setField,
      _setParam,
      _setRefresh,
      _setTimeout,
      _setTimeZone,
      _swapFeatures,
      _swapTimer,
      _updateFeature;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;
    _el = options.el;
    _inputs = _el.querySelectorAll('input[type=number]');
    _intervals = {};
    _throttlers = {};
    _timeouts = {};
    _timezone = document.getElementById('timezone');
    _title = _inputs[0].title; // first input (all title attrs are identical)

    _initControls();
    _addListeners();
    _addOffset();
  };

  /**
   * Add the given catalog's Features (when swapping catalogs).
   *
   * @param catalog {String <comcat|dd>}
   */
  _addFeatures = function (catalog) {
    var features = _app.Features.getFeatures(catalog);

    Object.keys(features).forEach(id => {
      var feature = features[id];

      feature.isSwapping = true;

      feature.add();
      feature.render();
      feature.mapLayer.addCount(); // count values are added by L.GeoJSON.Async

      if (_hasChanged(feature)) {
        _app.Features.reloadFeature(id);
      }
    });
  };

  /**
   * Add event listeners.
   */
  _addListeners = function () {
    var catalogs = _el.querySelectorAll('#catalog li'),
        selectors = [
          'input[type=checkbox] + label',
          '#aftershocks',
          '#catalog-search'
        ].join(','),
        targets = _el.querySelectorAll(selectors), // auto-refresh settings
        timezones = _el.querySelectorAll('#timezone li');

    // Set the catalog, refresh and timezone options
    catalogs.forEach(catalog =>
      catalog.addEventListener('click', _setCatalog)
    );
    targets.forEach(target =>
      target.addEventListener('click', _setRefresh)
    );
    timezones.forEach(timezone =>
      timezone.addEventListener('click', _setTimeZone)
    );

    // Track changes to input fields
    _inputs.forEach(input => {
      input.addEventListener('focus', _setField);
      input.addEventListener('input', _updateFeature);
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
    var mag = _app.Features.getMainshock().data.eq.mag,
        ruptureArea = Math.pow(10, mag - 4),
        ruptureLength = Math.pow(ruptureArea, 0.7);

    return Object.assign({}, _DEFAULTS, {
      'as-distance': Math.max(5, 10 * Math.round(0.1 * ruptureLength)),
      'fs-distance': Math.max(5, 10 * Math.round(0.1 * ruptureLength)),
      'hs-distance': Math.max(20, 15 * Math.round(0.1 * ruptureLength)),
      'hs-magnitude': Math.round(Math.max(4, mag - 2)),
    });
  };

  /**
   * Get the Feature id from the given URL parameter.
   *
   * @param name {String}
   *     URL parameter name
   *
   * @return id {String}
   */
  _getFeatureId = function (name) {
    var ids = {
          'as-refresh': 'aftershocks',
          'cs-refresh': 'catalog-search'
        },
        id = ids[name] || '';

    if (id === 'aftershocks' && AppUtil.getParam('catalog') === 'dd') {
      id = 'dd-' + id;
    }

    return id;
  };

  /**
   * Get the refresh interval (in milliseconds) from the given URL parameter.
   *
   * @param name {String}
   *     URL parameter name
   *
   * @return {Integer}
   */
  _getInterval = function (name) {
    var value = AppUtil.getParam(name) || '';

    value = value.replace(/\D/g, ''); // strip 'm'

    return (parseInt(value, 10) || 1) * 60 * 1000;
  };

  /**
   * Get the relevant URL parameters from the current URL.
   *
   * @return params {Object}
   */
  _getParams = function () {
    var params = {};

    Object.keys(_DEFAULTS).forEach(name => {
      var value = AppUtil.getParam(name);

      if (value) {
        params[name] = value;
      }
    });

    return params;
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
    var title = _title; // default

    if (document.body.classList.contains('mainshock')) {
      title = `Disabled because ${feature.name} is loading`;
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
        settings = _el.querySelector('.' + feature.type);

    if (settings) {
      inputs = settings.querySelectorAll('input[type=number]');

      inputs.forEach(input => {
        var key = input.id.replace(/[a|f|h]s-/, '');

        if (Number(input.value) !== feature.params[key]) {
          changed = true;
        }
      });
    }

    return changed;
  };

  /**
   * Create the custom UI controls and set them to match the URL parameter
   * values (or the default value if a parameter is not set).
   */
  _initControls = function () {
    var params = _getParams(),
        settings = Object.assign({}, _DEFAULTS, params),
        aftershocks = _el.querySelector('#aftershocks .' + settings['as-refresh']),
        catalog = document.getElementById(settings.catalog),
        search = _el.querySelector('#catalog-search .' + settings['cs-refresh']),
        timezone = document.getElementById(settings.timezone);

    _catalogBar = RadioBar({
      el: document.getElementById('catalog')
    }).setOption(catalog);

    _timezoneBar = RadioBar({
      el: _timezone
    }).setOption(timezone);

    RadioBar({
      el: document.getElementById('aftershocks')
    }).setOption(aftershocks);

    RadioBar({
      el: document.getElementById('catalog-search')
    }).setOption(search);

    Switch({
      el: document.getElementById('as-refresh')
    }).setValue(Boolean(params['as-refresh']));

    Switch({
      el: document.getElementById('cs-refresh')
    }).setValue(Boolean(params['cs-refresh']));

    document.body.classList.add(settings.timezone);
  };

  /**
   * Remove the Features' count values/loaders, if applicable.
   */
  _removeCounts = function () {
    var features = _el.querySelectorAll('div.disabled');

    features.forEach(feature => {
      var count = feature.querySelector('.count'),
          header = feature.querySelector('h3');

      if (count) {
        header.removeChild(count);
      }
    });
  };

  /**
   * Remove the given catalog's Features.
   *
   * @param catalog {String <comcat|dd>}
   */
  _removeFeatures = function (catalog) {
    var features = _app.Features.getFeatures(catalog);

    Object.keys(features).forEach(
      id => features[id].remove()
    );
  };

  /**
   * Event handler that sets the earthquake catalog option.
   */
  _setCatalog = function () {
    var pane,
        catalog = this.id;

    _setParam('catalog', catalog);

    if (document.body.classList.contains('mainshock')) {
      pane = _app.Pane.getSelected();

      _swapFeatures(catalog);
      _swapTimer();

      if (pane !== 'map') {
        _app.Pane.setScrollPosition(pane);
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

    _field = input.id;

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
    var defaults = _DEFAULTS;

    if (document.body.classList.contains('mainshock')) {
      defaults = _getDefaults();
    }

    if (value === defaults[name]) {
      AppUtil.deleteParam(name, value);
    } else {
      AppUtil.setParam(name, value);
    }
  };

  /**
   * Event handler that sets/unsets the auto-refresh option.
   *
   * @param e {Event}
   */
  _setRefresh = function (e) {
    var div = e.target.closest('.refresh'),
        input = div.querySelector('input'),
        id = _getFeatureId(input.id),
        name = input.id,
        selected = div.querySelector('.selected'),
        tagName = e.target.tagName.toLowerCase(),
        value = Array.from(selected.classList).find(
          item => item !== 'selected'
        );

    if (input.checked) {
      AppUtil.setParam(name, value);

      if (tagName === 'li') { // interval changed
        _setTimeout(name);
      } else if (tagName !== 'ul') { // switch turned on
        _app.Features.reloadFeature(id);
        _this.setInterval(name);
      } else { // RadioBar's border clicked
        return;
      }
    } else { // switch turned off
      AppUtil.deleteParam(name);
      clearInterval(_intervals[name]);
      clearTimeout(_timeouts[name]);
    }
  };

  /**
   * Set a one-off auto-refresh timer (i.e. the initial delay) for the Feature
   * matching the given name. Then start a recurring timer when it expires.
   *
   * @param name {String}
   *     URL parameter name
   */
  _setTimeout = function (name) {
    var delay, elapsed, interval,
        id = _getFeatureId(name),
        feature = _app.Features.getFeature(id);

    clearInterval(_intervals[name]); // cancel existing interval timer
    clearTimeout(_timeouts[name]); // ensure a single timer is set

    if (_app.Features.isFeature(feature)) {
      elapsed = Date.now() - feature.updated;
      interval = _getInterval(name);
      delay = interval - elapsed;

      if (elapsed > interval) {
        delay = 0; // refresh immediately
      }

      _timeouts[name] = setTimeout(() => {
        _app.Features.reloadFeature(id);
        _this.setInterval(name);
      }, delay);
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

    document.body.classList.add(timezone); // CSS trigger that toggles timezone
    _setParam('timezone', timezone);

    if (document.body.classList.contains('mainshock')) {
      tables = document.querySelectorAll('#summary-pane table.list.sortable');

      _app.PlotsPane.update();
      _app.SummaryPane.swapSort(tables);
    }
  };

  /**
   * Swap Features to keep them in sync with the selected catalog.
   *
   * @param catalog {String <comcat|dd>}
   */
  _swapFeatures = function (catalog) {
    var catalogs = _catalogBar.getIds(),
        mainshock = _app.Features.getMainshock(),
        prevCatalog = catalogs.find(item => item !== catalog),
        status = _app.Features.getStatus(catalog);

    _removeFeatures(prevCatalog);

    if (status === 'ready') {
      _addFeatures(catalog);
      mainshock.enableDownload();
    } else {
      _app.Features.createFeatures(catalog);
    }
  };

  /**
   * Swap the Aftershocks auto-refresh timer, if it is set, to keep it in sync
   * with the selected catalog.
   */
  _swapTimer = function () {
    var param = AppUtil.getParam('as-refresh');

    if (param) {
      _setTimeout('as-refresh');
    }
  };

  /**
   * Event handler that updates a Feature and its URL parameter.
   *
   * @param e {Event}
   */
  _updateFeature = function (e) {
    var feature, name,
        div = this.closest('div'),
        id = Array.from(div.classList).find(item => item !== 'enabled'), // default
        mode = 'comcat'; // default

    if (e.data && !Number.isInteger(Number(e.data))) return;

    if (AppUtil.getParam('catalog') === 'dd') {
      id = 'dd-' + id;
      mode = 'dd';
    }

    _setParam(this.id, Number(this.value));

    if (this.value !== '') {
      feature = _app.Features.getFeature(id);

      if (_app.Features.isFeature(feature)) {
        name = feature.name;
      } else {
        name = div.querySelector('h3').textContent;
      }

      // Throttle stacked requests if user changes settings rapidly
      clearTimeout(_throttlers[id]); // ensure one timer per Feature
      _throttlers[id] = setTimeout(_app.Features.reloadFeature, 500, id, mode);

      // Show loading status immediately (don't wait for throttlers)
      _app.StatusBar.addItem({
        id: id,
        name: name
      });
    }
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Render the currently selected field.
   */
  _this.render = function () {
    if (_field) {
      document.getElementById(_field).focus();
    }
  };

  /**
   * Reset to default state (except for catalog, timezone and refresh settings).
   */
  _this.reset = function () {
    var timestamp = _el.querySelector('#aftershocks + .timestamp');

    timestamp.innerHTML = '';
    _field = null;

    _inputs.forEach(input => {
      input.title = _title; // set to initial, cached value
      input.value = '';
    });

    _removeCounts();

    clearInterval(_intervals['as-refresh']);
    clearTimeout(_timeouts['as-refresh']);
  };

  /**
   * Reset the earthquake catalog setting to ComCat (default).
   */
  _this.resetCatalog = function () {
    var comcat = document.getElementById('comcat');

    _catalogBar.setOption(comcat);
    AppUtil.deleteParam('catalog');
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

    clearInterval(_intervals[name]); // ensure a single timer per Feature is set

    _intervals[name] = setInterval(_app.Features.reloadFeature, interval, id);
  };

  /**
   * Set the status of the given Feature's settings.
   *
   * @param feature {Object}
   * @param status {String <enabled|disabled>} optional; default is ''
   */
  _this.setStatus = function (feature, status = '') {
    var inputs,
        settings = _el.querySelector('.' + feature.type);

    if (settings) {
      inputs = settings.querySelectorAll('input[type=number]');

      settings.classList.remove('disabled', 'enabled');
      settings.classList.add(status);

      inputs.forEach(input => {
        if (status === 'enabled') {
          input.removeAttribute('disabled');
          input.removeAttribute('title');
        } else {
          input.setAttribute('disabled', 'disabled');
          input.setAttribute('title', _getTitle(feature));
        }
      });
    }
  };

  /**
   * Set the input field values to the selected Mainshock's defaults. URL
   * parameter values (if present) override the defaults.
   */
  _this.setValues = function () {
    var settings = Object.assign({}, _getDefaults(), _getParams());

    Object.keys(settings).forEach(name => {
      var input = document.getElementById(name);

      if (input) {
        input.value = settings[name];
      }
    });
  };

  /**
   * Update the given Feature's refresh timestamp.
   *
   * @param feature {Object}
   */
  _this.updateTimeStamp = function (feature) {
    var id = feature.type || feature.id, // catalog agnostic
        el = _el.querySelector(`#${id} + .timestamp`);

    if (el) {
      el.innerHTML = _app.Features.getTimeStamp(feature.data);
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = SettingsBar;
