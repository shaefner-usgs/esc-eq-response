/* global L, flatpickr */
'use strict';


require('leaflet-editable');
require('leaflet.path.drag'); // add path dragging to Leaflet.Editable
require('leaflet/L.Control.Rectangle'); // map control to draw a rectangle

var AppUtil = require('util/AppUtil'),
    Luxon = require('luxon'),
    RadioBar = require('util/controls/RadioBar'),
    Slider = require('util/controls/Slider');


var _CANV,
    _NOW,
    _SETTINGS;

_CANV = {
  maxlatitude: 42.1,
  maxlongitude: -114,
  minlatitude: 32.4,
  minlongitude: -124.6
};
_NOW = Luxon.DateTime.now();
_SETTINGS = { // defaults
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
 * Search the earthquake catalog and initialize/handle the search UI, including
 * the date pickers and Leaflet map instance.
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
 *       postInit: {Function}
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
      _period,
      _periodBar,
      _region,
      _regionBar,
      _regionLayer,
      _rendered,
      _searchButton,
      _starttime,

      _addButton,
      _addControl,
      _addListeners,
      _getOrdinalDay,
      _getUrlParams,
      _highlightDay,
      _initCalendars,
      _initControls,
      _initMap,
      _isValid,
      _onDateChange,
      _onDateClose,
      _onEndOpen,
      _onStartOpen,
      _searchCatalog,
      _setMinutes,
      _setNow,
      _setOption,
      _setRegion,
      _setUrlParams,
      _setUtcDay,
      _setUtcMonth,
      _setValidity,
      _setView;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;
    _el = options.el;
    _endtime = document.getElementById('endtime');
    _now = Luxon.DateTime.now();
    _periodBar = RadioBar({
      el: document.getElementById('period')
    });
    _regionBar = RadioBar({
      el: document.getElementById('region')
    });
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
   * Add a control to the map for creating a custom region rectangle.
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
    var arrows = _el.querySelectorAll('.flatpickr-minute ~ span'),
        labels = _el.querySelectorAll('label'),
        opts = _el.querySelectorAll('#period li, #region li'),
        regionOpts = _el.querySelectorAll('#region li'),
        slider = _el.querySelector('.slider input');

    // Set date picker's minutes value
    arrows.forEach(arrow =>
      arrow.addEventListener('click', _setMinutes)
    );

    // Open date picker
    labels.forEach(label =>
      label.addEventListener('click', () => {
        var id = label.getAttribute('for');

        _calendars[id].open();
      })
    );

    // Keep search button status in sync
    opts.forEach(button =>
      button.addEventListener('click', _this.setButton)
    );
    slider.addEventListener('input', _this.setButton);

    // Set custom region options
    regionOpts.forEach(button =>
      button.addEventListener('click', _setOption)
    );

    // Set the end time to 'now'
    _nowButton.addEventListener('click', e => {
      e.preventDefault();
      _setNow();
    });

    // Search the catalog
    _searchButton.addEventListener('click', () => {
      location.href = '#mapPane';

      _searchCatalog();
    });
  };

  /**
   * Get the current local and UTC day of the year.
   *
   * @return doy {Object}
   */
  _getOrdinalDay = function () {
    var doy = {
          local: Number(_now.toFormat('o')),
          utc: Number(_now.toUTC().toFormat('o'))
        },
        offset = Number(_now.toFormat('Z'));

    // Normalize days spanning two calendar years
    if (doy.local !== doy.utc) {
      if (offset > 1 && doy.local === 1) {
        doy.local = 366;
      } else if (offset < 1 && doy.utc === 1) {
        doy.utc = 366;
      }
    }

    return doy;
  };

  /**
   * Get the URL parameter key-value pairs from the current URL.
   *
   * @return params {Object}
   */
  _getUrlParams = function () {
    var params = {};

    Object.keys(_SETTINGS).forEach(name => {
      var value = AppUtil.getParam(name);

      if (value) {
        params[name] = value;
      }
    });

    return params;
  };

  /**
   * Highlight the current UTC day. This is a bit of a hack, because _setUtcDay
   * already handles this, but it fails when it falls on the first day of the
   * month.
   *
   * @param calendar {Object}
   * @param today {Element} optional; default is null
   */
  _highlightDay = function (calendar, today = null) {
    var days, el,
        date = _now.toUTC().toLocaleString(Luxon.DateTime.DATE_FULL);

    today = today || calendar.days.querySelector(`[aria-label="${date}"]`);

    if (today && !today.classList.contains('nextMonthDay')) {
      days = calendar.days.querySelectorAll('.flatpickr-day');
      el = Array.from(days).find(el => el.textContent === today.textContent);

      el.classList.add('today');
    }
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
        _setUtcDay(this);
        _highlightDay(this);
      },
      onYearChange: function() {
        _setUtcDay(this);
        _highlightDay(this);
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
   * Initialize the UI controls and set them to match the URL parameter values
   * (or the default value if a parameter is not set).
   *
   * Note: The selected RadioBar options are set via _this.postInit().
   */
  _initControls = function () {
    var params = _getUrlParams(),
        settings = Object.assign({}, _SETTINGS, params),
        slider = Slider({
          el: document.getElementById('minmagnitude')
        });

    _minmagnitude = document.getElementById('minmagnitude');
    _period = document.getElementById(settings.period);
    _region = document.getElementById(settings.region);

    // Set magnitude
    _minmagnitude.value = settings.minmagnitude;
    slider.setValue();

    // Set custom dates
    if (_period.id === 'customPeriod') {
      if (settings.endtime === 'now') {
        _setNow();
      } else {
        _calendars.endtime.setDate(settings.endtime);
      }

      _calendars.starttime.setDate(settings.starttime);
    }

    // Set custom region polygon
    if (_region.id === 'customRegion') {
      _regionLayer = L.rectangle([
        [settings.maxlatitude, settings.maxlongitude],
        [settings.minlatitude, settings.minlongitude]
      ]);
    }
  };

  /**
   * Create the Leaflet map instance.
   */
  _initMap = function () {
    var zoomControl;

    _map = L.map('region-map', {
      editable: true,
      layers: [
        L.greyscaleLayer(),
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
   * Check if both the starttime and endtime values are valid or not.
   *
   * @return isValid {Boolean}
   */
  _isValid = function () {
    var isValid = true, // default
        period = _el.querySelector('#period .selected').id;

    if (period === 'customPeriod') {
      isValid = _setValidity(_starttime) && _setValidity(_endtime);

      if (!isValid) {
        _setValidity(_endtime); // be certain to flag invalid endtime as well
      }
    }

    return isValid;
  };

  /**
   * Event handler for changing a calendar's date.
   *
   * @param selDates {Array}
   * @param dateStr {String}
   */
  _onDateChange = function (selDates, dateStr) {
    var datePicked = selDates.length > 0 && dateStr;

    _setUtcDay(this);
    _setValidity(this.input);

    // Unset 'Now' when a date is picked by user, but not when reverting in _onDateClose()
    if (this.input.id === 'endtime' && datePicked) {
      _nowButton.classList.remove('selected');
    }
  };

  /**
   * Event handler for closing a calendar.
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
   * Event handler for opening the 'endtime' calendar.
   */
  _onEndOpen = function () {
    var minDate = _calendars.starttime.selectedDates[0];

    _now = Luxon.DateTime.now(); // cache new value

    this.set('maxDate', _now.toUTC().toISO().slice(0, -5));
    this.set('minDate', minDate);
    _setUtcDay(this);
    _setUtcMonth(this);

    // Flatpickr lib strips 'Now' from <input>; put it back
    if (_nowButton.classList.contains('selected')) {
      _setNow();
    }
  };

  /**
   * Event handler for opening the 'starttime' calendar.
   */
  _onStartOpen = function () {
    var endDate = _calendars.endtime.selectedDates[0],
        maxDate = endDate; // default

    _now = Luxon.DateTime.now(); // cache new value

    if (!maxDate) {
      maxDate = _now.toUTC().toISO().slice(0, -5);
    }

    this.set('maxDate', maxDate);
    _setUtcDay(this);
    _setUtcMonth(this);
  };

  /**
   * Event handler that searches the earthquake catalog and displays the results.
   */
  _searchCatalog = function () {
    var search = _app.Features.getFeature('catalog-search');

    if (_isValid()) { // checks custom dates
      if (_app.Features.isFeature(search)) {
        _app.Features.refreshFeature('catalog-search');
      } else {
        _app.Features.reloadFeature('catalog-search', 'base');
      }

      _setUrlParams();

      if (!document.body.classList.contains('mainshock')) {
        _app.MapPane.initBounds();
        _app.MapPane.setView();
      }
    }
  };

  /**
   * Event handler that sets the minutes value to a multiple of 5. It gets out
   * of sync when the max time allowed is not a multiple of 5.
   */
  _setMinutes = function () {
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
   * Set the end time to 'Now' on the 'endtime' calendar and its <input> field.
   */
  _setNow = function () {
    var calendar = _calendars.endtime;

    calendar.clear();

    calendar.altInput.value = 'Now';
    _endtime.value = 'now';

    _nowButton.classList.add('selected');
    _setUtcMonth(calendar);
    _setValidity(_endtime);
  };

  /**
   * Set the options for the selected region.
   */
  _setOption = function () {
    if (this.id === 'customRegion') {
      _this.render();
    } else if (this.id === 'worldwide' || this.id === 'ca-nv') {
      _setRegion();
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
   * Set the URL parameters to match the UI controls.
   *
   * Don't set a parameter if its control is set to its default value and also
   * delete unneeded parameters.
   */
  _setUrlParams = function () {
    var params = _this.getParams();

    Object.keys(params).forEach(name => {
      var value = params[name];

      if (value === _SETTINGS[name]) {
        AppUtil.deleteParam(name);
      } else {
        AppUtil.setParam(name, value);
      }
    });

    if (params.period !== 'customPeriod') {
      AppUtil.deleteParam('endtime');
      AppUtil.deleteParam('starttime');
    }
  };

  /**
   * Set the given calendar's highlighted day to the current UTC day (which
   * might be the previous/following day).
   *
   * @param calendar {Object}
   */
  _setUtcDay = function (calendar) {
    var doy, pass, tomorrow, yesterday,
        today = calendar.days.querySelector('.today');

    if (today) { // current month is selected
      doy = _getOrdinalDay();
      pass = (today.textContent === _now.toFormat('d')); // only change once
      tomorrow = today.nextElementSibling;
      yesterday = today.previousElementSibling;

      if (doy.local !== doy.utc && pass) {
        today.style.transitionProperty = 'none'; // disable janky transition
        today.classList.remove('today');

        if (doy.utc > doy.local && tomorrow) {
          tomorrow.classList.add('today');
        } else if (yesterday) {
          yesterday.classList.add('today');
        }

        setTimeout(() => // restore transition
          today.style.transitionProperty = 'background, color', 500
        );
      }
    }
  };

  /**
   * Set the given calendar to the current UTC month (which might be the
   * previous/following month).
   *
   * @param calendar {Object}
   */
  _setUtcMonth = function (calendar) {
    var offset,
        container = calendar.calendarContainer,
        selected = container.querySelector('.flatpickr-day.selected'),
        today = container.querySelector('.today');

    if (selected) return; // show default (selected date's) month instead

    if (today) {
      if (today.classList.contains('prevMonthDay')) {
        calendar.changeMonth(-1);
      } else if (today.classList.contains('nextMonthDay')) {
        calendar.changeMonth(1);
        _highlightDay(calendar, today);
      }
    } else { // 'Now' button selected
      offset = _now.toFormat('Z');

      if (offset > 1) { // UTC day is last Saturday of prev month
        calendar.changeMonth(-1);
      }
    }
  };

  /**
   * Flag a date field when no date is set or the date is invalid.
   *
   * @param input {Element}
   *
   * @return {Boolean}
   *     whether or not the <input> is marked as valid
   */
  _setValidity = function (input) {
    var div = input.closest('.flatpickr-wrapper'),
        isValid = /(now|\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/.test(input.value);

    if (isValid) {
      div.classList.remove('invalid');

      return true;
    } else {
      div.classList.add('invalid');

      return false;
    }
  };

  /**
   * Set the initial view of the custom region map to contain the custom search
   * region's (or default) bounds.
   */
  _setView = function () {
    var map = _el.querySelector('.customRegion'),
        sidebar = AppUtil.getParam('sidebar');

    if (map.classList.contains('hide')) return; // map not visible

    if (sidebar === 'searchBar' && !_rendered) {
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
   * Get the search parameters from the UI controls and _SETTINGS.
   *
   * @return {Object}
   */
  _this.getParams = function () {
    var bounds,
        minus = {},
        now = Luxon.DateTime.now(),
        params = {
          minmagnitude: Number(_minmagnitude.value),
          period: _el.querySelector('#period .selected').id,
          region: _el.querySelector('#region .selected').id
        };

    // Begin, end times
    if (params.period.match(/day|week|month/)) {
      minus[params.period + 's'] = 1;

      Object.assign(params, {
        endtime: now.toUTC().toISO().slice(0, -5),
        starttime: now.minus(minus).toUTC().toISO().slice(0, -5)
      });
    } else if (params.period === 'customPeriod') {
      Object.assign(params, {
        endtime: _endtime.value,
        starttime: _starttime.value
      });
    }

    // Bounds
    if (params.region === 'ca-nv') {
      Object.assign(params, _CANV);
    } else if (params.region === 'customRegion') {
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

    return Object.assign({}, _SETTINGS, params);
  };

  /**
   * Initialization that depends on other Classes being ready before running.
   */
  _this.postInit = function () {
    _periodBar.setOption.call(_period);
    _regionBar.setOption.call(_region);

    _setOption.call(_region);
  };

  /**
   * Render the region map so it displays correctly.
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
    var customPeriod = document.getElementById('customPeriod')
          .classList.contains('selected'),
        inputs = [_endtime, _starttime],
        search = _app.Features.getFeature('catalog-search'),
        params = {
          controls: _this.getParams(),
          search: search.params
        },
        skip = [];

    // Skip preset intervals' times, which will be different but aren't relevant
    if (params.controls.period.match(/day|week|month/)) {
      skip = ['endtime', 'starttime'];
    }

    if (_app.Features.isFeature(search)) {
      if (AppUtil.shallowEqual(params.controls, params.search, skip)) {
        _searchButton.textContent = 'Refresh';
      } else {
        _searchButton.textContent = 'Search';
      }

      _searchButton.removeAttribute('disabled');
      _searchButton.removeAttribute('title');

      if (customPeriod) {
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
