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
 *     setSearchStatus: {Function}
 *   }
 */
var SearchBar = function (options) {
  var _this,
      _initialize,

      _app,
      _el,
      _flatpickrs,
      _map,
      _period,
      _region,
      _regionLayer,
      _searchLayer,

      _addControl,
      _addListeners,
      _cancelEdit,
      _getControlParams,
      _initFlatpickr,
      _initMap,
      _isValid,
      _loadFeed,
      _setControls,
      _setMinutes,
      _setOption,
      _setToday,
      _setUrlParams,
      _setValidity,
      _updateSlider;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _el = options.el || document.createElement('section');
    _regionLayer = L.rectangle([ // default - Conterminous U.S.
      [49.5, -66],
      [24.5, -125]
    ]);
    _searchLayer = SearchLayer({
      app: _app
    });

    _initFlatpickr();
    _setControls();
    _initMap();
    _addListeners();
  };

  /**
   * Add a control to the map for creating a custom region Rectangle.
   */
  _addControl = function () {
    var control = L.control.editable({
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
      button.addEventListener('click', function () {
        _setOption.call(this);
        _this.setSearchStatus();
      })
    );

    // Open the associated date picker when the user clicks a label
    labels.forEach(label =>
      label.addEventListener('click', () => {
        var id = label.getAttribute('for');

        _flatpickrs[id].open();
      })
    );

    // Search the catalog when the user clicks the 'Search' button
    search.addEventListener('click', () => {
      location.href = '#mapPane';

      _this.searchCatalog();
    });

    // Update the range slider
    slider.addEventListener('input', _updateSlider);
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
  _getControlParams = function () {
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
        endtime: document.getElementById('endtime').value,
        starttime: document.getElementById('starttime').value
      });
    }

    if (region === 'customRegion') {
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
      onChange: function() {
        _this.setSearchStatus();
        _setToday(this.days);
        _setValidity(this.input);
      },
      onClose: function () {
        _setValidity(this.input);
      },
      onMonthChange: function() {
        _setToday(this.days);
      },
      onYearChange: function() {
        _setToday(this.days);
      },
      static: true
    };

    _flatpickrs = {
      endtime: flatpickr('#endtime',
        Object.assign({}, opts, {
          altInputClass: 'endtime-alt',
          onOpen: function() {
            var maxDate,
                minDate,
                now;

            now = new Date();
            maxDate = new Date(now.getTime() + now.getTimezoneOffset() * 60 * 1000);
            minDate = _flatpickrs.starttime.selectedDates[0];

            this.set('maxDate', maxDate);
            this.set('minDate', minDate);
            _setToday(this.days);
          },
          position: 'auto right'
        })
      ),
      starttime: flatpickr('#starttime',
        Object.assign({}, opts, {
          altInputClass: 'starttime-alt',
          onOpen: function() {
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
            _setToday(this.days);
          },
          position: 'auto left'
        })
      )
    };
  };

  /**
   * Create the Leaflet map instance.
   */
  _initMap = function () {
    var zoomControl;

    _map = L.map(_el.querySelector('.customRegion'), {
      center: [38, -96],
      editable: true,
      layers: [
        L.greyscaleLayer(),
        _regionLayer
      ],
      scrollWheelZoom: false,
      zoom: 2
    });

    _regionLayer.enableEdit();
    _addControl();

    // Hide the zoom control on mobile (in favor of pinch-to-zoom)
    if (L.Browser.mobile) {
      zoomControl = _el.querySelector('.leaflet-control-zoom');

      zoomControl.style.display = 'none';
    }
  };

  /**
   * Check if begin/end dates are both valid (i.e. not empty) or not.
   *
   * @return isValid {Boolean}
   */
  _isValid = function () {
    var endtime,
        isValid,
        starttime;

    endtime = document.getElementById('endtime');
    starttime = document.getElementById('starttime');
    isValid = _setValidity(starttime) && _setValidity(endtime);

    if (!isValid) {
      _setValidity(endtime); // be certain that invalid endtime is also flagged
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
   * Set the UI controls to match the values of the URL params (or to the
   * default value if a param is not set). The selected 'radio-bar' options are
   * set in _this.postInit.
   */
  _setControls = function () {
    var minmagnitude,
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

    _period = document.getElementById(vals.period);
    _region = document.getElementById(vals.region);

    minmagnitude.value = vals.minmagnitude;
    output.value = vals.minmagnitude;
    slider.style.setProperty('--val', vals.minmagnitude);

    _app.setSliderStyles(minmagnitude);

    if (_period.id === 'customPeriod') {
      _flatpickrs.endtime.setDate(AppUtil.getParam('endtime'));
      _flatpickrs.starttime.setDate(AppUtil.getParam('starttime'));
    }

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
   * Wrapper method to set the selected 'radio bar' option and also render the
   * map/cancel the edit depending on the current state.
   */
  _setOption = function() {
    _app.SideBar.setOption.call(this);

    if (this.id === 'customRegion') {
      _this.renderMap();
    } else if (this.id === 'worldwide') {
      _cancelEdit();
    }
  };

  /**
   * Set the highlighted calendar day to the current UTC day (the local day is
   * highlighted by default).
   *
   * @param days {Element}
   *     div container with the calendar days of the selected month
   */
  _setToday = function (days) {
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
   * Set the URL params to match the UI controls. Only set a param if the
   * control is not set to its default value and also delete custom search
   * params if their corresponding 'custom' option is not selected.
   *
   * @param params {Object}
   *    current UI control settings
   */
  _setUrlParams = function (params) {
    var customParams = [
      'endtime',
      'maxlatitude',
      'maxlongitude',
      'minlatitude',
      'minlongitude',
      'starttime'
    ];

    Object.keys(params).forEach(name => {
      var value = params[name];

      if (value === _DEFAULTS[name]) {
        AppUtil.deleteParam(name);
      } else {
        AppUtil.setParam(name, value);
      }
    });

    // Delete unneeded custom params (control is not set to 'custom')
    customParams.forEach(name => {
      if (!Object.prototype.hasOwnProperty.call(params, name)) {
        AppUtil.deleteParam(name);
      }
    });
  };

  /**
   * Flag a date field as invalid when no date is set.
   *
   * @param input {Element}
   *
   * @return {Boolean}
   *     whether or not the input is marked as valid
   */
  _setValidity = function (input) {
    var div = input.closest('.flatpickr-wrapper');

    if (input.value) {
      div.classList.remove('invalid');

      return true;
    } else {
      div.classList.add('invalid');

      return false;
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
    _this.setSearchStatus();
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Initialization that depends on other Classes being ready before running.
   */
  _this.postInit = function () {
    _setOption.call(_period);
    _setOption.call(_region);
    _this.searchCatalog();
  };

  /**
   * Render the Region map so it displays correctly.
   */
  _this.renderMap = function () {
    _map.invalidateSize();
  };

  /**
   * Search the earthquake catalog.
   */
  _this.searchCatalog = function () {
    var params,
        period,
        search;

    params = _getControlParams();
    period = _el.querySelector('ul.period .selected').id;
    search = document.getElementById('search');

    // Check that custom dates are valid if applicable
    if (period !== 'customPeriod' || _isValid()) {
      _setUrlParams(params);
      _app.MapPane.removeFeature(_searchLayer);
      _searchLayer.reset();
      _searchLayer.setFeedUrl(params);
      _loadFeed();
    }

    search.classList.add('dim');
  };

  /**
   * Dim the 'Search' button when all controls match the current search params.
   */
  _this.setSearchStatus = function () {
    var currentParams,
        newParams,
        paramNames,
        search;

    currentParams = {};
    newParams = _getControlParams();
    paramNames = [
      'endtime',
      'maxlatitude',
      'maxlongitude',
      'minlatitude',
      'minlongitude',
      'minmagnitude',
      'period',
      'region',
      'starttime'
    ];
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
      search.classList.add('dim');
    } else {
      search.classList.remove('dim');
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = SearchBar;
