/* global L, flatpickr */
'use strict';


var AppUtil = require('util/AppUtil'),
    SearchLayer = require('leaflet/SearchLayer');


// NOTE: the Leaflet.Editable plugin is included in MapPane.js
require('leaflet/EditableRectangle'); // custom map control for Leaflet.Editable


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
 *   }
 */
var SearchBar = function (options) {
  var _this,
      _initialize,

      _app,
      _el,
      _flatpickrs,
      _map,
      _region,
      _search,

      _addControl,
      _addListeners,
      _cancelEdit,
      _getSearchParams,
      _initFlatpickr,
      _initMap,
      _isValid,
      _loadFeed,
      _setMinutes,
      _setToday,
      _setValidity,
      _showSelected,
      _updateSlider;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _el = options.el || document.createElement('section');
    _region = L.rectangle([ // default - Conterminous U.S.
      [49.5, -66],
      [24.5, -125]
    ]);
    _search = SearchLayer({
      app: _app
    });

    // Set the initial value of the range slider
    _app.setSliderStyles(_el.querySelector('.slider input'));

    _initFlatpickr();
    _initMap();
    _addListeners();
  };

  /**
   * Add a control to the map for creating a custom region Rectangle.
   */
  _addControl = function () {
    var control = L.control.editable({
      region: _region
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

    // Show the selected option when the user clicks a 'nav-strip' button
    buttons.forEach(button =>
      button.addEventListener('click', _showSelected)
    );

    // Open the associated date picker when the user clicks a label
    labels.forEach(label => {
      label.addEventListener('click', () => {
        var id = label.getAttribute('for');

        _flatpickrs[id].open();
      });
    });

    // Search the catalog when the user clicks the 'Search' button
    search.addEventListener('click', () => {
      var period = _el.querySelector('ul.period .selected').id;

      // Check that dates are valid if applicable
      if (period !== 'customPeriod' || _isValid()) {
        location.href = '#mapPane';

        _cancelEdit();
        _this.searchCatalog();
      }
    });

    // Update the range slider
    slider.addEventListener('input', _updateSlider);
  };

  /**
   * Cancel edit mode for custom region Leaflet control if it's active.
   */
  _cancelEdit = function () {
    var control = _el.querySelector('.leaflet-control-edit a');

    if (control.classList.contains('selected')) {
      control.click(); // exit custom region edit mode
    }
  };

  /**
   * Get the parameters for a catalog search.
   *
   * @return params {Object}
   */
  _getSearchParams = function () {
    var bounds,
        params,
        period,
        region;

    period = _el.querySelector('ul.period .selected').id;
    params = {
      minmagnitude: document.getElementById('catalog').value,
      period: period,
    };
    region = _el.querySelector('ul.region .selected').id;

    if (period === 'customPeriod') {
      params = Object.assign(params, {
        endtime: document.getElementById('end').value,
        starttime: document.getElementById('begin').value
      });
    }

    if (region === 'customRegion') {
      _map.eachLayer(layer => {
        if (layer.getBounds) { // only the region layer has bounds
          bounds = layer.getBounds();
        }
      });

      params = Object.assign(params, {
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
      begin: flatpickr('#begin',
        Object.assign({}, opts, {
          altInputClass: 'begin-alt',
          onOpen: function() {
            var endDate,
                maxDate,
                now;

            endDate = _flatpickrs.end.selectedDates[0];

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
      ),
      end: flatpickr('#end',
        Object.assign({}, opts, {
          altInputClass: 'end-alt',
          onOpen: function() {
            var maxDate,
                minDate,
                now;

            now = new Date();
            maxDate = new Date(now.getTime() + now.getTimezoneOffset() * 60 * 1000);
            minDate = _flatpickrs.begin.selectedDates[0];

            this.set('maxDate', maxDate);
            this.set('minDate', minDate);
            _setToday(this.days);
          },
          position: 'auto right'
        })
      )
    };
  };

  /**
   * Create the Leaflet map instance.
   */
  _initMap = function () {
    var zoomControl;

    _map = L.map(_el.querySelector('div.region'), {
      center: [38, -96],
      editable: true,
      layers: [
        L.greyscaleLayer(),
        _region
      ],
      scrollWheelZoom: false,
      zoom: 2
    });

    _region.enableEdit();
    _addControl();

    // Hide the zoom control on mobile (in favor of pinch-to-zoom)
    if (L.Browser.mobile) {
      zoomControl = _el.querySelector('.leaflet-control-zoom');

      zoomControl.style.display = 'none';
    }
  };

  /**
   * Check if begin/end dates are both valid or not.
   *
   * @return isValid {Boolean}
   */
  _isValid = function () {
    var begin,
        end,
        isValid;

    begin = document.getElementById('begin');
    end = document.getElementById('end');
    isValid = _setValidity(begin) && _setValidity(end);

    if (!isValid) {
      _setValidity(end); // be certain that invalid end field is also flagged
    }

    return isValid;
  };

  /**
   * Fetch the earthquakes and display them on the map.
   */
  _loadFeed = function () {
    _app.MapPane.addLoader(_search);
    _app.JsonFeed.fetch(_search).then(json => {
      if (json) {
        _search.create(json);
        _app.MapPane.addLayer(_search);
        _app.TitleBar.setTitle({
          title: _search.title,
          type: 'search'
        });
      } else {
        _app.MapPane.removeFeature(_search);
      }
    }).catch(error => {
      _app.StatusBar.addError({
        id: _search.id,
        message: `<h4>Error Adding ${_search.name}</h4><ul><li>${error}</li></ul>`
      });

      console.error(error);
    });
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
   * Show the selected option for the 'nav-strips'.
   */
  _showSelected = function () {
    var className,
        customDiv,
        parent,
        regex,
        sibling;

    parent = this.parentNode;
    className = parent.className.replace(/\s?options\s?/, '');
    customDiv = _el.querySelector('div.' + className);
    regex = /^custom/;
    sibling = parent.firstElementChild;

    // Select the appropriate nav button and unselect all others
    this.classList.add('selected');

    while (sibling) {
      if (sibling !== this) {
        sibling.classList.remove('selected');
      }

      sibling = sibling.nextElementSibling;
    }

    if (this.id === 'worldwide') {
      _cancelEdit();
    }

    // Show/hide the custom options
    if (regex.test(this.id)) {
      customDiv.classList.remove('hide');

      if (this.id === 'customRegion') {
        _this.renderMap();
      }
    } else {
      customDiv.classList.add('hide');
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
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Initialization that depends on other Classes being ready before running.
   */
  _this.postInit = function () {
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
    var params = _getSearchParams();

    _app.MapPane.removeFeature(_search);
    _search.reset();
    _search.setFeedUrl(params);
    _loadFeed();
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = SearchBar;
