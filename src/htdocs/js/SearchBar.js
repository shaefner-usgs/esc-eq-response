/* global L, flatpickr */
'use strict';


var AppUtil = require('util/AppUtil'),
    SearchLayer = require('leaflet/SearchLayer');

// NOTE: the Leaflet.Editable plugin is included in MapPane.js
require('leaflet/EditableRectangle'); // custom map control for Leaflet.Editable


var _DEFAULTS = {
  minmagnitude: '3.5', // URL params are Strings
  period: 'month',
  region: 'worldwide'
};


/**
 * Search the earthquake catalog and display the results on the map.
 *
 * @param options {Object}
 *   {
 *     app: {Object} Application
 *     el: {Element}
 *   }
 *
 * @return _this {Object}
 *   {
 *     postInit: {Function}
 *     renderMap: {Function}
 *     searchCatalog: {Function}
 *     setStatus: {Function}
 *   }
 */
var SearchBar = function (options) {
  var _this,
      _initialize,

      _app,
      _customParams,
      _el,
      _endtime,
      _flatpickrs,
      _initialView,
      _map,
      _nowButton,
      _regionLayer,
      _searchLayer,
      _selPeriod,
      _selRegion,
      _starttime,

      _addControl,
      _addListeners,
      _addNowButton,
      _cancelEdit,
      _getParams,
      _initFlatpickr,
      _initMap,
      _isValid,
      _loadFeed,
      _onDateChange,
      _onDateClose,
      _onEndOpen,
      _onStartOpen,
      _setControls,
      _setMinutes,
      _setNow,
      _setOption,
      _setParams,
      _setUtcDay,
      _setValidity,
      _setView,
      _updateSlider;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _customParams = [
      'endtime',
      'maxlatitude',
      'maxlongitude',
      'minlatitude',
      'minlongitude',
      'starttime'
    ];
    _el = options.el || document.createElement('section');
    _endtime = document.getElementById('endtime');
    _initialView = true;
    _regionLayer = L.rectangle([ // default - contiguous U.S.
      [49.5, -66],
      [24.5, -125]
    ]);
    _searchLayer = SearchLayer({
      app: _app
    });
    _starttime = document.getElementById('starttime');

    _initFlatpickr();
    _setControls();
    _initMap();
    _addListeners();
  };

  /**
   * Add a control to the map for creating a custom region Rectangle.
   */
  _addControl = function () {
    var control = L.control.editableRectangle({
      app: _app,
      region: _regionLayer
    });

    _map.addControl(control);
  };

  /**
   * Add event listeners.
   */
  _addListeners = function () {
    var arrows,
        buttons,
        labels,
        search,
        slider;

    arrows = _el.querySelectorAll('.flatpickr-minute ~ span');
    buttons = _el.querySelectorAll('.period li, .region li');
    labels = _el.querySelectorAll('label');
    search = document.getElementById('search');
    slider = _el.querySelector('.slider input');

    // Set the minutes value when the user clicks an arrow button
    arrows.forEach(arrow =>
      arrow.addEventListener('click', _setMinutes)
    );

    // Set the selected option on a 'radio-bar'
    buttons.forEach(button =>
      button.addEventListener('click', function() {
        _setOption.call(this);
        _this.setStatus();
      })
    );

    // Open the associated date picker when the user clicks a label
    labels.forEach(label =>
      label.addEventListener('click', () => {
        var id = label.getAttribute('for');

        _flatpickrs[id].open();
      })
    );

    // Set the end time to 'Now' when the user clicks the 'Now' button
    _nowButton.addEventListener('click', (e) => {
      e.preventDefault();
      _setNow();
    });

    // Search the catalog when the user clicks the 'Search' button
    search.addEventListener('click', () => {
      location.href = '#mapPane';

      _this.searchCatalog();
    });

    // Update the range slider
    slider.addEventListener('input', _updateSlider);
  };

  /**
   * Add a 'Now' button to the endtime Flatpickr calendar.
   *
   * @param flatpickr {Object}
   */
  _addNowButton = function (flatpickr) {
    var button,
        div;

    button = document.createElement('a');
    div = flatpickr.calendarContainer.querySelector('.flatpickr-months');

    button.classList.add('button', 'flatpickr-now');
    button.textContent = 'Now';
    div.appendChild(button);

    _nowButton = _el.querySelector('.flatpickr-now');
  };

  /**
   * Cancel edit mode for the custom region Leaflet control if it's active.
   */
  _cancelEdit = function () {
    var control = _el.querySelector('.leaflet-control-edit a');

    if (control.classList.contains('selected')) {
      control.click(); // exit custom region edit mode
    }
  };

  /**
   * Get the parameters for a catalog search from the UI controls.
   *
   * @return params {Object}
   */
  _getParams = function () {
    var bounds,
        params,
        period,
        region;

    period = _el.querySelector('ul.period .selected').id;
    region = _el.querySelector('ul.region .selected').id;
    params = {
      minmagnitude: document.getElementById('minmagnitude').value,
      period: period,
      region: region
    };

    if (period === 'customPeriod') {
      Object.assign(params, {
        endtime: _endtime.value,
        starttime: _starttime.value
      });
    }

    if (region === 'ca-nv') {
      Object.assign(params, {
        maxlatitude: 42.10,
        maxlongitude: -114.00,
        minlatitude: 32.40,
        minlongitude: -124.60
      });
    } else if (region === 'customRegion') {
      _cancelEdit();

      _map.eachLayer(layer => {
        if (layer.getBounds) { // only the region layer has bounds
          bounds = layer.getBounds();
        }
      });

      Object.assign(params, {
        maxlatitude: AppUtil.round(bounds.getNorth(), 2),
        maxlongitude: AppUtil.round(bounds.getEast(), 2),
        minlatitude: AppUtil.round(bounds.getSouth(), 2),
        minlongitude: AppUtil.round(bounds.getWest(), 2)
      });
    }

    return params;
  };

  /**
   * Create the Flatpickr (date picker) calendar instances.
   */
  _initFlatpickr = function () {
    var opts = { // shared options for begin/end date pickers
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

    _flatpickrs = {
      endtime: flatpickr('#endtime',
        Object.assign({}, opts, {
          altInputClass: 'endtime-alt',
          onOpen: _onEndOpen,
          position: 'auto right'
        })
      ),
      starttime: flatpickr('#starttime',
        Object.assign({}, opts, {
          altInputClass: 'starttime-alt',
          onOpen: _onStartOpen,
          position: 'auto left'
        })
      )
    };

    _addNowButton(_flatpickrs.endtime);
  };

  /**
   * Create the Leaflet map instance.
   */
  _initMap = function () {
    var zoomControl;

    _map = L.map(_el.querySelector('.customRegion'), {
      editable: true,
      layers: [
        L.greyscaleLayer(),
        _regionLayer
      ],
      scrollWheelZoom: false
    });

    _map.setView([0, 0], 1); // set arbitrary view for now
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
    var isValid,
        period;

    isValid = true; // default
    period = _el.querySelector('ul.period .selected').id;

    if (period === 'customPeriod') {
      isValid = _setValidity(_starttime) && _setValidity(_endtime);

      if (!isValid) {
        _setValidity(_endtime); // be certain that invalid endtime is also flagged
      }
    }

    return isValid;
  };

  /**
   * Fetch the earthquakes and display them on the map.
   */
  _loadFeed = function () {
    _app.MapPane.addLoader(_searchLayer);
    _app.JsonFeed.fetch(_searchLayer).then(json => {
      if (json) {
        _searchLayer.create(json);
        _app.MapPane.addLayer(_searchLayer);
        _app.TitleBar.setTitle({
          title: _searchLayer.title,
          type: 'search'
        });
      } else {
        _app.MapPane.removeFeature(_searchLayer);
      }
    }).catch(error => {
      _app.StatusBar.addError({
        id: _searchLayer.id,
        message: `<h4>Error Adding ${_searchLayer.name}</h4><ul><li>${error}</li></ul>`
      });

      console.error(error);
    });
  };

  /**
   * Handler that is called when a Flatpickr calendar's date is changed.
   */
  _onDateChange = function (dates, dateStr) {
    var datePicked = dates.length > 0 && dateStr;

    _setUtcDay(this.days);
    _setValidity(this.input);

    // Unset 'Now' when a date is picked by user, but not when reverting in _onDateClose()
    if (this.input.id === 'endtime' && datePicked) {
      _nowButton.classList.remove('selected');
    }
  };

  /**
   * Handler that is called when a Flatpickr calendar is closed.
   */
  _onDateClose = function () {
    _setValidity(this.input);

    // Flatpickr lib overrides 'Now' with today's date; revert back to 'Now'
    if (_nowButton.classList.contains('selected')) {
      _setNow();
    }

    _this.setStatus();
  };

  /**
   * Handler that is called when the endtime Flatpickr calendar is opened.
   */
  _onEndOpen = function () {
    var maxDate,
        minDate,
        now;

    now = new Date();
    maxDate = new Date(now.getTime() + now.getTimezoneOffset() * 60 * 1000);
    minDate = _flatpickrs.starttime.selectedDates[0];

    this.set('maxDate', maxDate);
    this.set('minDate', minDate);
    _setUtcDay(this.days);

    // Flatpickr lib strips 'Now' from <input>; put it back
    if (_nowButton.classList.contains('selected')) {
      _setNow();
    }
  };

  /**
   * Handler that is called when the starttime Flatpickr calendar is opened.
   */
  _onStartOpen = function () {
    var endDate,
        maxDate,
        now;

    endDate = _flatpickrs.endtime.selectedDates[0];

    if (endDate) {
      maxDate = endDate;
    } else {
      now = new Date();
      maxDate = new Date(now.getTime() + now.getTimezoneOffset() * 60 * 1000);
    }

    this.set('maxDate', maxDate);
    _setUtcDay(this.days);
  };

  /**
   * Set the UI controls to match the values of the URL params (or to the
   * default value if a param is not set). The selected 'radio-bar' options are
   * set in _this.postInit.
   */
  _setControls = function () {
    var endtime,
        minmagnitude,
        output,
        slider,
        vals;

    minmagnitude = document.getElementById('minmagnitude');
    output = minmagnitude.nextElementSibling,
    slider = minmagnitude.parentNode;
    vals = {
      minmagnitude: AppUtil.getParam('minmagnitude') || _DEFAULTS.minmagnitude,
      period: AppUtil.getParam('period') || _DEFAULTS.period,
      region: AppUtil.getParam('region') || _DEFAULTS.region
    };

    _selPeriod = document.getElementById(vals.period);
    _selRegion = document.getElementById(vals.region);

    minmagnitude.value = vals.minmagnitude;
    output.value = vals.minmagnitude;
    slider.style.setProperty('--val', vals.minmagnitude);

    _app.setSliderStyles(minmagnitude);

    if (_selPeriod.id === 'customPeriod') {
      endtime = AppUtil.getParam('endtime');

      if (endtime === 'now') {
        _setNow();
      } else {
        _flatpickrs.endtime.setDate(endtime);
      }

      _flatpickrs.starttime.setDate(AppUtil.getParam('starttime'));
    }

    if (_selRegion.id === 'customRegion') {
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
   * Ensure minutes value is a multiple of 5. It gets out of sync when the max
   * time allowed is not a multiple of 5.
   */
  _setMinutes = function () {
    var input,
        minutes,
        remainder,
        value;

    input = this.closest('.numInputWrapper').querySelector('input');
    value = Number(input.value);
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
   * Set the endtime to 'Now' on the Flatpickr calendar and its <input> fields.
   */
  _setNow = function () {
    var container,
        flatpickr,
        hour,
        minute;

    flatpickr = _flatpickrs.endtime;
    container = flatpickr.calendarContainer;
    hour = container.querySelector('.flatpickr-hour');
    minute = container.querySelector('.flatpickr-minute');

    flatpickr.clear();

    flatpickr.altInput.value = 'Now';
    hour.value = '00';
    minute.value = '00';
    _endtime.value = 'now';

    _nowButton.classList.add('selected');
    _setValidity(_endtime);
  };

  /**
   * Wrapper method to set the selected 'radio-bar' option and also render the
   * map/cancel the edit depending on the current state.
   */
  _setOption = function () {
    _app.setOption.call(this);

    if (this.id === 'customRegion') {
      _this.renderMap();
    } else if (this.id === 'worldwide') {
      _cancelEdit();
    }
  };

  /**
   * Set the URL params to match the UI controls. Only set a param if the
   * control is not set to its default value and also delete custom search
   * params if their corresponding 'custom' option is not selected.
   *
   * @param params {Object}
   *    current UI control settings
   */
  _setParams = function (params) {
    Object.keys(params).forEach(name => {
      var value = params[name];

      if (value === _DEFAULTS[name]) {
        AppUtil.deleteParam(name);
      } else {
        AppUtil.setParam(name, value);
      }
    });

    // Delete unneeded custom params (when control is not set to 'custom')
    _customParams.forEach(name => {
      if (!Object.prototype.hasOwnProperty.call(params, name)) {
        AppUtil.deleteParam(name);
      }
    });
  };

  /**
   * Set the highlighted calendar day to the current UTC day (the local day is
   * highlighted by default).
   *
   * @param days {Element}
   *     div container with the calendar days of the selected month
   */
  _setUtcDay = function (days) {
    var today,
        tomorrow;

    today = days.querySelector('.today');

    if (today) { // selected calendar is the current month
      tomorrow = today.nextElementSibling;

      if (tomorrow && !tomorrow.classList.contains('flatpickr-disabled')) {
        today.style.transitionProperty = 'none'; // disable transitions

        today.classList.remove('today');
        tomorrow.classList.add('today');

        setTimeout(() =>  // restore transitions
          today.style.transitionProperty = 'background, color', 500
        );
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
    var div,
        isValid;

    div = input.closest('.flatpickr-wrapper');
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
   * Set the initial view of the custom region map to contain the search
   * region's bounds.
   */
  _setView = function () {
    var map,
        sidebar;

    map = _el.querySelector('.customRegion');
    sidebar = AppUtil.getParam('sidebar');

    if (map.classList.contains('hide')) return; // map not visible

    if (sidebar === 'searchBar' && _initialView) {
      _map.fitBounds(_regionLayer.getBounds(), {
        animate: false,
        padding: [32, 0]
      });

      _initialView = false;
    }
  };

  /**
   * Display the <input> range slider's current value.
   */
  _updateSlider = function () {
    var output,
        slider,
        value;

    output = this.nextElementSibling,
    slider = this.parentNode;
    value = Number(this.value);

    output.value = value;
    slider.style.setProperty('--val', value);

    _app.setSliderStyles(this);
    _this.setStatus();
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Initialization that depends on other Classes being ready before running.
   */
  _this.postInit = function () {
    _setOption.call(_selPeriod);
    _setOption.call(_selRegion);
    _this.searchCatalog();
  };

  /**
   * Render the region map so it displays correctly.
   */
  _this.renderMap = function () {
    _map.invalidateSize();
    _setView();
  };

  /**
   * Search the earthquake catalog.
   */
  _this.searchCatalog = function () {
    var params = _getParams();

    // Check that custom dates are valid if applicable
    if (_isValid()) {
      _setParams(params);
      _app.MapPane.removeFeature(_searchLayer);
      _searchLayer.reset();
      _searchLayer.setFeedUrl(params);
      _loadFeed();
    }

    _this.setStatus();
  };

  /**
   * Dim the 'Search' button when all controls match the current search params.
   */
  _this.setStatus = function () {
    var currentParams,
        newParams,
        paramNames,
        search;

    currentParams = {};
    newParams = _getParams();
    paramNames = _customParams.concat(Object.keys(_DEFAULTS));
    search = document.getElementById('search');

    paramNames.forEach(name => {
      var value = AppUtil.getParam(name);

      if (value) {
        currentParams[name] = value;
      } else if (Object.prototype.hasOwnProperty.call(_DEFAULTS, name)) {
        currentParams[name] = _DEFAULTS[name];
      }
    });

    if (AppUtil.shallowEqual(currentParams, newParams)) {
      search.textContent = 'Refresh';
    } else {
      search.textContent = 'Search';
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = SearchBar;
