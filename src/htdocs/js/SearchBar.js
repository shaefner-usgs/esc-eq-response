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
    _SETTINGS;

_CANV = {
  maxlatitude: 42.1,
  maxlongitude: -114,
  minlatitude: 32.4,
  minlongitude: -124.6
};
_SETTINGS = { // defaults
  endtime: Luxon.DateTime.now().toUTC().toISO().slice(0, -5),
  maxlatitude: 90,
  maxlongitude: 180,
  minlatitude: -90,
  minlongitude: -180,
  minmagnitude: 3.5,
  period: 'month',
  region: 'worldwide',
  starttime: Luxon.DateTime.now().minus({months: 1}).toUTC().toISO().slice(0, -5)
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
      _el,
      _endtime,
      _map,
      _minmagnitude,
      _nowButton,
      _period,
      _periodBar,
      _pickers,
      _region,
      _regionBar,
      _regionLayer,
      _rendered,
      _searchButton,
      _starttime,

      _addButton,
      _addControl,
      _addListeners,
      _cancelRegion,
      _initMap,
      _initPickers,
      _isValid,
      _onDateChange,
      _onDateClose,
      _onEndOpen,
      _onStartOpen,
      _searchCatalog,
      _setControls,
      _setMinutes,
      _setNow,
      _setParams,
      _setRegion,
      _setUtcDay,
      _setUtcMonth,
      _setValidity,
      _setView;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;
    _el = options.el;
    _endtime = document.getElementById('endtime');
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

    _initPickers();
    _setControls();
    _addListeners();
    _initMap();
  };

  /**
   * Add a 'Now' button to the 'endtime' Flatpickr calendar.
   *
   * @return {Element}
   */
  _addButton = function () {
    var button = document.createElement('a'),
        container = _pickers.endtime.calendarContainer,
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

    // Set the minutes value
    arrows.forEach(arrow =>
      arrow.addEventListener('click', _setMinutes)
    );

    // Open the date picker
    labels.forEach(label =>
      label.addEventListener('click', () => {
        var id = label.getAttribute('for');

        _pickers[id].open();
      })
    );

    // Keep search button status in sync and set custom region options
    opts.forEach(button => button.addEventListener('click', _this.setButton));
    regionOpts.forEach(button => button.addEventListener('click', _setRegion));

    slider.addEventListener('input', _this.setButton);

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
   * Cancel the new custom region Leaflet control if it's active.
   */
  _cancelRegion = function () {
    var control = _el.querySelector('.leaflet-control-edit a');

    if (control.classList.contains('selected')) {
      control.click(); // exit new custom region mode
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
   * Create the Flatpickr (date picker) begin and end time calendar instances.
   */
  _initPickers = function () {
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
        _setUtcDay(this.days);
      },
      onYearChange: function() {
        _setUtcDay(this.days);
      },
      static: true,
      time_24hr: true
    };

    _pickers = {
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
   * Event handler for changing the date of a Flatpickr calendar.
   *
   * @param selDates {Array}
   * @param dateStr {String}
   */
  _onDateChange = function (selDates, dateStr) {
    var datePicked = selDates.length > 0 && dateStr;

    _setUtcDay(this.days);
    _setValidity(this.input);

    // Unset 'Now' when a date is picked by user, but not when reverting in _onDateClose()
    if (this.input.id === 'endtime' && datePicked) {
      _nowButton.classList.remove('selected');
    }
  };

  /**
   * Event handler for closing a Flatpickr calendar.
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
   * Event handler for opening an 'endtime' Flatpickr calendar.
   */
  _onEndOpen = function () {
    var now = new Date(),
        maxDate = new Date(now.getTime() + now.getTimezoneOffset() * 60 * 1000),
        minDate = _pickers.starttime.selectedDates[0];

    this.set('maxDate', maxDate);
    this.set('minDate', minDate);
    _setUtcDay(this.days);
    _setUtcMonth(this);

    // Flatpickr lib strips 'Now' from <input>; put it back
    if (_nowButton.classList.contains('selected')) {
      _setNow();
    }
  };

  /**
   * Event handler for opening a 'starttime' Flatpickr calendar.
   */
  _onStartOpen = function () {
    var maxDate, now,
        endDate = _pickers.endtime.selectedDates[0];

    if (endDate) {
      maxDate = endDate;
    } else {
      now = new Date();
      maxDate = new Date(now.getTime() + now.getTimezoneOffset() * 60 * 1000);
    }

    this.set('maxDate', maxDate);
    _setUtcDay(this.days);
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

      _setParams();

      if (!document.body.classList.contains('mainshock')) {
        _app.MapPane.initBounds();
        _app.MapPane.setView();
      }
    }
  };

  /**
   * Set the UI controls to match the URL parameters (or to its default value if
   * a parameter is not set).
   *
   * Note: The selected RadioBar options are set via _this.postInit().
   */
  _setControls = function () {
    var endtime,
        settings = {
          minmagnitude: AppUtil.getParam('minmagnitude') || _SETTINGS.minmagnitude,
          period: AppUtil.getParam('period') || _SETTINGS.period,
          region: AppUtil.getParam('region') || _SETTINGS.region
        },
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
      endtime = AppUtil.getParam('endtime');

      if (endtime === 'now') {
        _setNow();
      } else {
        _pickers.endtime.setDate(endtime);
      }

      _pickers.starttime.setDate(AppUtil.getParam('starttime'));
    }

    // Set custom region polygon
    if (_region.id === 'customRegion') {
      _regionLayer = L.rectangle([
        [
          AppUtil.getParam('maxlatitude'),
          AppUtil.getParam('maxlongitude')
        ],
        [
          AppUtil.getParam('minlatitude'),
          AppUtil.getParam('minlongitude')
        ]
      ]);
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
   * Set the endtime to 'Now' on the endtime calendar and its <input> fields.
   */
  _setNow = function () {
    var picker = _pickers.endtime,
        container = picker.calendarContainer,
        hour = container.querySelector('.flatpickr-hour'),
        minute = container.querySelector('.flatpickr-minute');

    picker.clear();

    picker.altInput.value = 'Now';
    hour.value = '00';
    minute.value = '00';
    _endtime.value = 'now';

    _nowButton.classList.add('selected');
    _setUtcMonth(picker);
    _setValidity(_endtime);
  };

  /**
   * Set the URL parameters to match the UI controls. Don't set a parameter if
   * its control is set to its default value; delete unneeded time parameters.
   */
  _setParams = function () {
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
   * Event handler that sets a selected region's custom options.
   */
  _setRegion = function () {
    if (this.id === 'customRegion') {
      _this.render();
    } else if (this.id === 'worldwide' || this.id === 'ca-nv') {
      _cancelRegion();
    }
  };

  /**
   * Set the highlighted calendar day to the current UTC day (which might be the
   * previous/following day).
   *
   * @param days {Element}
   *     div container with the calendar days of the selected month
   */
  _setUtcDay = function (days) {
    var tomorrow, yesterday,
        today = days.querySelector('.today');

    if (today) { // selected calendar is the current month
      tomorrow = today.nextElementSibling;
      yesterday = today.previousElementSibling;
      today.style.transitionProperty = 'none'; // disable transitions

      if (tomorrow && !tomorrow.classList.contains('flatpickr-disabled')) {
        today.classList.remove('today');
        tomorrow.classList.add('today');
      } else if (today.classList.contains('flatpickr-disabled')) {
        today.classList.remove('today');
        yesterday.classList.add('today');
      }

      setTimeout(() => // restore transitions
        today.style.transitionProperty = 'background, color', 500
      );
    }
  };

  /**
   * Set the given Flatpickr calendar to the current UTC month (which might be
   * the previous/following month on the first/last day of the month).
   *
   * @param picker {Object}
   */
  _setUtcMonth = function (picker) {
    var container = picker.calendarContainer,
        selected = container.querySelector('.flatpickr-day.selected'),
        today = container.querySelector('.today');

    if (!selected && today.classList.contains('prevMonthDay')) {
      picker.changeMonth(-1);
    } else if (!selected && today.classList.contains('nextMonthDay')) {
      picker.changeMonth(1);
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
        params = {
          minmagnitude: Number(_minmagnitude.value),
          period: _el.querySelector('#period .selected').id,
          region: _el.querySelector('#region .selected').id
        };

    // Begin, end times
    if (params.period.match(/day|week|month/)) {
      minus[params.period + 's'] = 1;

      Object.assign(params, {
        endtime: Luxon.DateTime.now().toUTC().toISO().slice(0, -5),
        starttime: Luxon.DateTime.now().minus(minus).toUTC().toISO().slice(0, -5)
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
      _cancelRegion(); // can't get params while active

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

    _setRegion.call(_region);
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
        params = {
          controls: _this.getParams(),
          search: _app.Features.getFeature('catalog-search').params
        },
        skip = [];

    // Times may differ slightly (by seconds), but it's irrelevant
    if (params.controls.period.match(/day|week|month/)) {
      skip = ['endtime', 'starttime'];
    }

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
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = SearchBar;
