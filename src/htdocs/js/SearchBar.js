/* global L, flatpickr */
'use strict';


require('leaflet-editable');
require('leaflet.path.drag'); // add path dragging to Leaflet.Editable
require('util/leaflet/L.Control.Rectangle'); // map control to draw a rectangle

var AppUtil = require('util/AppUtil'),
    Luxon = require('luxon'),
    RadioBar = require('util/controls/RadioBar'),
    Slider = require('util/controls/Slider');


var _CANV,
    _DEFAULTS,
    _NOW;

_CANV = {
  maxlatitude: 42.1,
  maxlongitude: -114,
  minlatitude: 32.4,
  minlongitude: -124.6
};
_NOW = Luxon.DateTime.now();
_DEFAULTS = {
  endtime: _NOW.toUTC().toISO().slice(0, -5),
  maxlatitude: 90,
  maxlongitude: 180,
  minlatitude: -90,
  minlongitude: -180,
  minmagnitude: 3.5,
  period: 'month',
  region: 'worldwide',
  starttime: _NOW.minus({months: 1}).toUTC().toISO().slice(0, -5)
};


/**
 * Search the earthquake catalog and display the results on the map. Also set
 * the URL parameters (and the controls on initial load) to match the current
 * settings.
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *       el: {Element}
 *     }
 *
 * @return _this {Object}
 *     {
 *       getParams: {Function}
 *       render: {Function}
 *       setButton: {Function}
 *     }
 */
var SearchBar = function (options) {
  var _this,
      _initialize,

      _app,
      _calendars,
      _el,
      _endtime,
      _map,
      _minmagnitude,
      _now,
      _nowButton,
      _regionLayer,
      _rendered,
      _searchButton,
      _starttime,

      _addBounds,
      _addButton,
      _addControl,
      _addListeners,
      _disableTransition,
      _getParams,
      _initCalendars,
      _initControls,
      _initMap,
      _onDateChange,
      _onDateClose,
      _onEndOpen,
      _onMinuteChange,
      _onStartOpen,
      _onTimeChange,
      _searchCatalog,
      _setControls,
      _setNow,
      _setOption,
      _setParams,
      _setRegion,
      _setUtcDay,
      _setValidity,
      _setView;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;
    _el = options.el;
    _endtime = document.getElementById('endtime');
    _minmagnitude = document.getElementById('minmagnitude');
    _now = _NOW;
    _regionLayer = L.rectangle([ // default - contiguous U.S.
      [49.5, -66],
      [24.5, -125]
    ]);
    _rendered = false;
    _searchButton = document.getElementById('search');
    _starttime = document.getElementById('starttime');

    _initCalendars();
    _initControls();
    _initMap();
    _addListeners();
  };

  /**
   * Add the region's map bounds to the search parameters, if applicable.
   *
   * @param params {Object}
   */
  _addBounds = function (params) {
    var bounds;

    if (params.region === 'ca-nv') {
      Object.assign(params, _CANV);
    } else if (params.region === 'custom-region') {
      _setRegion(); // ensure custom region control is not active

      _map.eachLayer(layer => {
        if (layer.getBounds) { // only the region layer has bounds
          bounds = layer.getBounds();
        }
      });

      Object.assign(params, {
        maxlatitude: Number(AppUtil.round(bounds.getNorth(), 2)),
        maxlongitude: Number(AppUtil.round(bounds.getEast(), 2)),
        minlatitude: Number(AppUtil.round(bounds.getSouth(), 2)),
        minlongitude: Number(AppUtil.round(bounds.getWest(), 2))
      });
    }
  };

  /**
   * Add a 'Now' button to the 'endtime' calendar.
   *
   * @return {Element}
   */
  _addButton = function () {
    var button = document.createElement('a'),
        container = _calendars.endtime.calendarContainer,
        parent = container.querySelector('.flatpickr-months');

    button.classList.add('button', 'flatpickr-now');
    button.textContent = 'Now';
    parent.appendChild(button);

    return _el.querySelector('.flatpickr-now');
  };

  /**
   * Add a map control that creates a custom region rectangle.
   */
  _addControl = function () {
    var control = L.control.rectangle({
      app: _app,
      region: _regionLayer
    });

    _map.addControl(control);
  };

  /**
   * Add event listeners.
   */
  _addListeners = function () {
    var arrows = _el.querySelectorAll('.flatpickr-time .numInputWrapper span'),
        labels = _el.querySelectorAll('label'),
        options = _el.querySelectorAll('#period li, #region li'),
        regions = _el.querySelectorAll('#region li'),
        slider = _el.querySelector('.slider input');

    // Set date picker's time handlers
    arrows.forEach(arrow => {
      arrow.addEventListener('click', _onTimeChange);

      if (arrow.parentNode.querySelector('.flatpickr-minute')) {
        arrow.addEventListener('click', _onMinuteChange);
      }
    });

    // Open date picker from <label>s too
    labels.forEach(label =>
      label.addEventListener('click', () => {
        var id = label.getAttribute('for');

        _calendars[id].open();
      })
    );

    // Keep search button status in sync
    options.forEach(option =>
      option.addEventListener('click', _this.setButton)
    );
    slider.addEventListener('input', _this.setButton);

    // Set custom region option
    regions.forEach(region =>
      region.addEventListener('click', _setOption)
    );

    // Set the end time input to 'now'
    _nowButton.addEventListener('click', e => {
      e.preventDefault();
      _setNow();
    });

    // Search the catalog
    _searchButton.addEventListener('click', _searchCatalog);
  };

  /**
   * Temporarily disable the janky transition caused by Flatpickr resetting the
   * current day to local time (and then immediately overriding to set it back
   * to UTC time).
   *
   * @param el {Element}
   */
  _disableTransition = function (el) {
    el.style.transitionProperty = 'none';

    setTimeout(() =>
      el.style.transitionProperty = 'background, color', 500
    );
  };

  /**
   * Get the current search parameters from the URL.
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
   * Create the Flatpickr calendar instances.
   */
  _initCalendars = function () {
    var options = {
      altFormat: 'M j, Y H:i',
      altInput: true,
      dateFormat: 'Y-m-d\\TH:i:S',
      defaultHour: 0,
      enableTime: true,
      monthSelectorType: 'static',
      onChange: _onDateChange,
      onClose: _onDateClose,
      onMonthChange: function() {
        _setUtcDay(this, false);
      },
      onYearChange: function() {
        _setUtcDay(this, false);
      },
      nextArrow: '<i class="icon-next"></i>',
      prevArrow: '<i class="icon-prev"></i>',
      static: true,
      time_24hr: true
    };

    _calendars = {
      endtime: flatpickr('#endtime',
        Object.assign({}, options, {
          altInputClass: 'endtime-alt',
          onOpen: _onEndOpen,
          position: 'auto right'
        })
      ),
      starttime: flatpickr('#starttime',
        Object.assign({}, options, {
          altInputClass: 'starttime-alt',
          onOpen: _onStartOpen,
          position: 'auto left'
        })
      )
    };
    _nowButton = _addButton();
  };

  /**
   * Create the custom UI controls.
   */
  _initControls = function () {
    var settings = Object.assign({}, _DEFAULTS, _getParams()),
        period = document.getElementById(settings.period),
        region = document.getElementById(settings.region);

    _setControls(period, region, settings);

    RadioBar({
      el: document.getElementById('period')
    }).setOption(period);

    RadioBar({
      el: document.getElementById('region')
    }).setOption(region);

    Slider({
      el: _minmagnitude
    }).setValue();
  };

  /**
   * Create the Leaflet map instance.
   */
  _initMap = function () {
    var zoomControl;

    _map = L.map('region-map', {
      attributionControl: false,
      editable: true,
      layers: [
        L.terrainLayer(),
        _regionLayer
      ],
      minZoom: 1,
      scrollWheelZoom: false
    });

    _map.setView([0, 0], 1); // set an arbitrary view for now
    _regionLayer.enableEdit();
    _addControl();

    // Hide the zoom control on mobile (in favor of pinch-to-zoom)
    if (L.Browser.mobile) {
      zoomControl = _el.querySelector('.leaflet-control-zoom');

      zoomControl.style.display = 'none';
    }
  };

  /**
   * Event handler that changes a calendar's date or time.
   *
   * @param selDates {Array}
   * @param dateStr {String}
   */
  _onDateChange = function (selDates, dateStr) {
    var datePicked = selDates.length > 0 && dateStr;

    _setUtcDay(this);
    _setValidity(this.input);

    // Unset 'Now' when user picks a date, but not when reverting in _onDateClose()
    if (this.input.id === 'endtime' && datePicked) {
      _nowButton.classList.remove('selected');
    }
  };

  /**
   * Event handler that closes a calendar.
   */
  _onDateClose = function () {
    _setValidity(this.input);

    // Flatpickr lib overrides 'Now' with today's date; revert back to 'Now'
    if (_nowButton.classList.contains('selected')) {
      _setNow();
    }

    _this.setButton();
  };

  /**
   * Event handler that opens the 'endtime' calendar.
   */
  _onEndOpen = function () {
    var minDate = _calendars.starttime.selectedDates[0];

    _now = Luxon.DateTime.now(); // cache new value

    this.set('maxDate', _now.toUTC().toISO().slice(0, -5));
    this.set('minDate', minDate);
    _setUtcDay(this);

    // Flatpickr lib strips 'Now' from <input>; put it back
    if (_nowButton.classList.contains('selected')) {
      _setNow();
    }
  };

  /**
   * Event handler that sets the minutes value to a multiple of 5. It gets out
   * of sync when the max time allowed is not a multiple of 5.
   */
  _onMinuteChange = function () {
    var minutes,
        input = this.closest('.numInputWrapper').querySelector('input'),
        value = Number(input.value),
        remainder = value % 5;

    if (remainder) {
      if (this.className === 'arrowUp') {
        minutes = String(value - remainder);
      } else { // down arrow clicked
        minutes = String(value + 5 - remainder);
      }

      if (minutes.length === 1) {
        minutes = '0' + minutes;
      }

      input.value = minutes;
    }
  };

  /**
   * Event handler that opens the 'starttime' calendar.
   */
  _onStartOpen = function () {
    var maxDate = _calendars.endtime.selectedDates[0]; // default

    _now = Luxon.DateTime.now(); // cache new value

    if (!maxDate) {
      maxDate = _now.toUTC().toISO().slice(0, -5);
    }

    this.set('maxDate', maxDate);
    _setUtcDay(this);
  };

  /**
   * Event handler that changes a calendar's time.
   *
   * @param e {Event}
   */
  _onTimeChange = function (e) {
    var maxDateStr, selDate, time, utcDateStr,
        el = e.target.closest('.flatpickr-wrapper'),
        id = el.querySelector('.flatpickr-input').id,
        calendar = _calendars[id],
        selected = el.querySelector('.flatpickr-days .selected');

    // Select current UTC date when user changes time before picking a date
    setTimeout(() => { // ensure Flatpickr Events fire first
      selDate = calendar.selectedDates[0]; // js Date Object

      if (selDate && !selected) {
        maxDateStr = _now.toUTC().toISO().slice(0, -5);
        time = selDate.toTimeString().substring(0, 8);
        utcDateStr = _now.toUTC().toISODate() + 'T' + time;

        if (utcDateStr > maxDateStr) {
          utcDateStr = maxDateStr; // maxDate: now
        }

        calendar.setDate(utcDateStr, true);
      }
    });
  };

  /**
   * Event handler that searches the earthquake catalog and displays the results.
   */
  _searchCatalog = function () {
    location.href = '#map';

    _app.Features.reloadFeature('catalog-search', 'base');
    _searchButton.setAttribute('disabled', 'disabled');
    _setParams();

    if (!document.body.classList.contains('mainshock')) {
      _app.MapPane.initBounds();
      _app.MapPane.fitBounds();
    }
  };

  /**
   * Set the controls/options to match the URL parameter values (or the default
   * value if a parameter is not set).
   *
   * @param period {Object}
   * @param region {Object}
   * @param settings {Object}
   */
  _setControls = function (period, region, settings) {
    _minmagnitude.value = settings.minmagnitude;

    // Custom dates
    if (period.id === 'custom-period') {
      if (settings.endtime === 'now') {
        _setNow();
      } else {
        _calendars.endtime.setDate(settings.endtime);
      }

      _calendars.starttime.setDate(settings.starttime);
    }

    // Custom region polygon
    if (region.id === 'custom-region') {
      _regionLayer = L.rectangle([
        [settings.maxlatitude, settings.maxlongitude],
        [settings.minlatitude, settings.minlongitude]
      ]);
    }
  };

  /**
   * Set the time to 'Now' on the 'endtime' calendar and its <input> field.
   */
  _setNow = function () {
    var calendar = _calendars.endtime;

    calendar.clear();

    calendar.altInput.value = 'Now';
    _endtime.value = 'now';

    _nowButton.classList.add('selected');
    _setUtcDay(calendar);
    _setValidity(_endtime);
  };

  /**
   * Event handler that sets the options for the selected region.
   */
  _setOption = function () {
    if (this.id === 'custom-region') {
      _this.render();
    } else if (this.id === 'worldwide' || this.id === 'ca-nv') {
      _setRegion();
    }
  };

  /**
   * Set the URL parameter values to match the controls.
   *
   * Don't set a parameter if its control is set to its default value; delete
   * unneeded parameters.
   */
  _setParams = function () {
    var params = _this.getParams();

    Object.keys(params).forEach(name => {
      var value = params[name];

      if (value === _DEFAULTS[name]) {
        AppUtil.deleteParam(name);
      } else {
        AppUtil.setParam(name, value);
      }
    });

    AppUtil.deleteParam('now');

    if (params.period !== 'custom-period') {
      AppUtil.deleteParam('endtime');
      AppUtil.deleteParam('starttime');
    }
  };

  /**
   * Set the custom region to its cached value if its Leaflet control is active.
   */
  _setRegion = function () {
    var controls = _el.querySelectorAll('.leaflet-control-region a');

    controls.forEach(control => {
      if (control.classList.contains('selected')) {
        control.click(); // exit custom region edit mode
      }
    });
  };

  /**
   * Set the given calendar's default day (i.e. today) to the current UTC day.
   *
   * @param calendar {Object}
   * @param jumpToDate {Boolean} optional; default is true
   *     used as an override when user changes calendar's month or year
   */
  _setUtcDay = function (calendar, jumpToDate = true) {
    var date = _now.toUTC().toLocaleString(Luxon.DateTime.DATE_FULL),
        days = calendar.days,
        selected = days.querySelector('.selected'),
        today = days.querySelector('.today'),
        todayUtc = days.querySelector(`[aria-label="${date}"]`);

    // Set the calendar month and year to the current UTC day, if applicable
    if (jumpToDate && !selected && (today || todayUtc)) {
      calendar.jumpToDate(_now.toUTC().toISO().slice(0, -5));

      // Must set again after changing the calendar view
      days = calendar.days;
      today = days.querySelector('.today');
      todayUtc = days.querySelector(`[aria-label="${date}"]`);
    }

    if (todayUtc && !todayUtc.classList.contains('today')) { // only set once
      todayUtc.classList.add('today');

      if (today) {
        _disableTransition(today);
        today.classList.remove('today');
      }
    }
  };

  /**
   * Flag a date field when no date is set or the date is invalid.
   *
   * @param input {Element}
   */
  _setValidity = function (input) {
    var div = input.closest('.flatpickr-wrapper'),
        isValid = /(now|\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/.test(input.value);

    if (isValid) {
      div.classList.remove('invalid');
    } else {
      div.classList.add('invalid');
    }
  };

  /**
   * Set the initial view of the custom region map to contain the custom search
   * region's (or default) bounds.
   */
  _setView = function () {
    var map = _el.querySelector('.custom-region');

    if (!map.classList.contains('hide') && !_rendered) {
      _map.fitBounds(_regionLayer.getBounds(), {
        animate: false,
        padding: [32, 0]
      });

      _rendered = true;
    }
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Get the new search parameters from the UI controls and _DEFAULTS.
   *
   * @return {Object}
   */
  _this.getParams = function () {
    var minus = {},
        now = Luxon.DateTime.now(),
        params = {
          minmagnitude: Number(_minmagnitude.value),
          now: now,
          period: _el.querySelector('#period .selected').id,
          region: _el.querySelector('#region .selected').id
        };

    // Add begin, end times
    if (params.period.match(/day|week|month/)) {
      minus[params.period + 's'] = 1;

      Object.assign(params, {
        endtime: now.toUTC().toISO().slice(0, -5),
        starttime: now.minus(minus).toUTC().toISO().slice(0, -5)
      });
    } else if (params.period === 'custom-period') {
      Object.assign(params, {
        endtime: _endtime.value,
        starttime: _starttime.value
      });
    }

    _addBounds(params); // search region

    return Object.assign({}, _DEFAULTS, params);
  };

  /**
   * Render the map.
   */
  _this.render = function () {
    _map.invalidateSize();
    _setView();
  };

  /**
   * Set the 'Search' button to 'Refresh' when all UI controls match the
   * current Catalog Search parameters; set it to disabled if any controls
   * are invalid.
   */
  _this.setButton = function () {
    var customPeriod = document.getElementById('custom-period'),
        inputs = [_endtime, _starttime],
        search = _app.Features.getFeature('catalog-search'),
        params = {
          controls: _this.getParams(),
          search: search.params
        },
        skip = ['now']; // not applicable

    // Skip preset intervals' times, which will be different but aren't relevant
    if (params.controls.period.match(/day|week|month/)) {
      skip.push('endtime', 'starttime');
    }

    _searchButton.removeAttribute('disabled');
    _searchButton.removeAttribute('title');

    if (_app.Features.isFeature(search)) {
      if (AppUtil.shallowEqual(params.controls, params.search, skip)) {
        _searchButton.textContent = 'Refresh';
      } else {
        _searchButton.textContent = 'Search';
      }

      if (customPeriod.classList.contains('selected')) {
        inputs.forEach(input => {
          var div = input.closest('div'),
              invalid = div.classList.contains('invalid') || input.value === '';

          if (invalid) {
            _searchButton.setAttribute('disabled', 'disabled');
            _searchButton.setAttribute('title', 'Disabled because custom dates are invalid');
          }
        });
      }
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = SearchBar;
