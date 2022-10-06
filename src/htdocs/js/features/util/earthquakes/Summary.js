/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
    Luxon = require('luxon'),
    Tablesort = require('tablesort');


var _DEFAULTS = {
  maxNumEqs: 25
};


/**
 * Create the Summary HTML for the Aftershocks, Foreshocks, and Historical
 * Seismicity Features and handle its interactive components like filtering,
 * sorting, and clicking on an earthquake in a list.
 *
 * @param options {Object}
 *     {
 *       app: {Object}
 *       earthquakes: {Object}
 *       featureId: {String}
 *     }
 *
 * @return _this {Object}
 *     {
 *       addListeners: {Function}
 *       bins: {Object}
 *       destroy: {Function}
 *       getContent: {Function}
 *       removeListeners: {Function}
 *     }
 */
var Summary = function (options) {
  var _this,
      _initialize,

      _app,
      _data,
      _el,
      _featureId,
      _maxNumEqs,
      _params,
      _props,
      _slider,
      _tables,

      _addTitles,
      _addEqToBins,
      _configTable,
      _createBins,
      _filter,
      _getBinnedTable,
      _getListTable,
      _getSlider,
      _getTemplate,
      _getThreshold,
      _hideMenu,
      _initBins,
      _initSort,
      _openPopup,
      _removeSortIndicator,
      _renderEffects,
      _showMenu,
      _unselectRow;


  _this = {};

  _initialize = function (options = {}) {
    options = Object.assign({}, _DEFAULTS, options);

    _app = options.app;
    _data = options.earthquakes.data;
    _el = document.getElementById('summaryPane');
    _featureId = options.featureId;
    _maxNumEqs = options.maxNumEqs;
    _params = options.earthquakes.params;
    _props = {};

    _createBins(); // creates, populates _this.bins
  };

  /**
   * Add title attrs. to the given table's headers to reveal sort capability.
   *
   * @param table {Element}
   */
  _addTitles = function (table) {
    var ths = table.querySelectorAll('th');

    ths.forEach(th =>
      th.setAttribute('title', 'Sort by ' + th.textContent)
    );
  };

  /**
   * Add an earthquake to its respective bins.
   *
   * @param type {String <first|past|prior>}
   * @param days {Integer}
   * @param magInt {Integer}
   */
  _addEqToBins = function (type, days, magInt) {
    // Number of eqs by mag and time period, including totals (for tables)
    _initBins(magInt, type);

    // All earthquakes
    _this.bins[type]['m ' + magInt].total ++; // magnitude level
    _this.bins[type].total.total ++; // total

    // Earthquakes partitioned by time period
    if (days <= 365) {
      _this.bins[type]['m ' + magInt].year ++;
      _this.bins[type].total.year ++;

      if (days <= 30) {
        _this.bins[type]['m ' + magInt].month ++;
        _this.bins[type].total.month ++;

        if (days <= 7) {
          _this.bins[type]['m ' + magInt].week ++;
          _this.bins[type].total.week ++;

          if (days <= 1) {
            _this.bins[type]['m ' + magInt].day ++;
            _this.bins[type].total.day ++;
          }
        }
      }
    }

    // Total number of eqs by mag, inclusive (for range slider)
    if (type !== 'past') { // don't calculate totals 2x for Aftershocks
      for (var i = magInt; i >= 0; i --) {
        _this.bins.mag[i] ++;
      }
    }
  };

  /**
   * Additional steps (besides adding Event Listeners) necessary to configure an
   * earthquake list table's interactive components (filtering and sorting).
   *
   * @param table {Element}
   */
  _configTable = function (table) {
    var input = _el.querySelector(`.${_featureId} .slider input`);

    _addTitles(table);
    _initSort(table);
    _app.SummaryPane.swapSortIndicator([table]);

    if (input) {
      _app.setSliderStyles(input); // set range slider to initial value
    }
  };

  /**
   * Create the binned earthquake data.
   */
  _createBins = function () {
    var mainshock = _app.Features.getFeature('mainshock');

    _this.bins = {};

    _data.forEach(eq => {
      if (_featureId.includes('aftershocks')) {
        var days = Math.ceil(
          Luxon.Interval
            .fromDateTimes(mainshock.data.datetime, eq.datetime)
            .length('days')
        );

        _addEqToBins('first', days, eq.magInt);

        days = Math.ceil(
          Luxon.Interval
            .fromDateTimes(eq.datetime, _params.now)
            .length('days')
        );

        _addEqToBins('past', days, eq.magInt);
      } else if (
        _featureId.includes('historical') ||
        _featureId.includes('foreshocks')
      ) {
        days = Math.ceil(
          Luxon.Interval
            .fromDateTimes(eq.datetime, mainshock.data.datetime)
            .length('days')
        );

        _addEqToBins('prior', days, eq.magInt);
      }
    });
  };

  /**
   * Event handler that filters an earthquake list by magnitude and displays the
   * <input> range slider's current value.
   */
  _filter = function () {
    var i,
        feature = _app.Features.getFeature(this.id),
        value = Number(this.value),
        scrollY = window.pageYOffset;

    _props.count.innerHTML = feature.bins.mag[value];
    _props.mag.innerHTML = value;
    _props.output.value = value;
    _props.slider.style.setProperty('--val', value);

    for (i = value; i <= this.getAttribute('max'); i ++) {
      _props.table.classList.add('m' + i); // show eqs at/above threshold
    }
    for (i = value; i >= this.getAttribute('min'); i --) {
      _props.table.classList.remove('m' + (i - 1)); // hide eqs below threshold
    }

    // Prevent page scrolling and update slider track
    window.scroll(0, scrollY);
    _app.setSliderStyles(this);
  };

  /**
   * Get the HTML <table> for the given type of binned earthquake data.
   *
   * @param type {String <first|past|prior>}
   *
   * @return {String}
   */
  _getBinnedTable = function (type) {
    var data,
        days = Luxon.Duration.fromObject(_params.duration).as('days'),
        rows = '',
        tableClasses = ['bin'];

    if (days <= 7) {
      tableClasses.push('hide-month');
    }
    if (days <= 30) {
      tableClasses.push('hide-year');
    }

    // Table rows
    Object.keys(_this.bins[type]).sort().forEach(th => {
      rows += '<tr>';
      rows += `<th class="rowlabel">${th}</th>`;

      Object.keys(_this.bins[type][th]).forEach(period => {
        var td = _this.bins[type][th][period],
            tdClasses = [period];

        if (th === 'total') {
          tdClasses.push('total');
        }

        rows += `<td class="${tdClasses.join(' ')}">${td}</td>`;
      });

      rows += '</tr>';
    });

    data = {
      classNames: tableClasses.join(' '),
      rows: rows,
      type: type
    };

    return L.Util.template(
      '<table class="{classNames}">' +
        '<tr>' +
          '<th class="type">{type}:</th>' +
          '<th class="day">Day</th>' +
          '<th class="week">Week</th>' +
          '<th class="month">Month</th>' +
          '<th class="year">Year</th>' +
          '<th class="total">Total</th>' +
        '</tr>' +
        '{rows}' +
      '</table>',
      data
    );
  };

  /**
   * Get the HTML <table> for the given type of earthquake list.
   *
   * @param type {String <all|mostRecent>} default is 'all'
   *     'mostRecent' is for Aftershocks only
   *
   * @return {String}
   */
  _getListTable = function (type = 'all') {
    var data,
        eqs = _data, // default
        fields = [
          'depth',
          'distance',
          'eqid',
          'location',
          'mag',
          'userTime',
          'utcTime'
        ],
        magThreshold = _getThreshold(),
        rows = '',
        sortByField = 'utcTime', // default
        tableClasses = ['list'],
        thClasses = {};

    if (_featureId.includes('historical')) {
      sortByField = 'mag';
    }
    if (type === 'mostRecent') {
      eqs = [eqs[eqs.length - 1]];
      magThreshold = 0; // always show most recent eq
    }
    if (eqs.length > 1) {
      tableClasses.push('sortable');
    }

    // Table rows
    eqs.forEach(eq => {
      var magInt = eq.magInt;

      rows += L.Util.template(
        '<tr class="m{magInt}" title="View earthquake on map">' +
          '<td class="mag" data-sort="{mag}"><span>{magType} </span>{magDisplay}</td>' +
          '<td class="userTime" data-sort="{isoTime}">{userTimeDisplay}</td>' +
          '<td class="utcTime" data-sort="{isoTime}">{utcTimeDisplay}</td>' +
          '<td class="depth" data-sort="{depth}">{depthDisplay}</td>' +
          '<td class="location">{location}</td>' +
          '<td class="distance" data-sort="{distance}">{distanceDisplay}</td>' +
          '<td class="eqid">{id}</td>' +
        '</tr>',
        eq
      );

      if (
        magInt >= magThreshold &&
        tableClasses.indexOf('m' + magInt) === -1
      ) {
        tableClasses.push('m' + magInt); // display mag level by default
      }
    });

    data = {
      classNames: tableClasses.join(' '),
      rows: rows,
      utcOffset: _app.utcOffset
    };

    fields.forEach(field => {
      thClasses[field] = [field];

      if (field === sortByField) {
        thClasses[field].push('sort-default');
      }

      data[field] = thClasses[field].join(' ');
    });

    return L.Util.template(
      '<div class="wrapper">' +
        '<table class="{classNames}">' +
          '<thead>' +
            '<tr class="no-sort">' +
              '<th class="{mag}" data-sort-method="number" data-sort-order="desc">Mag</th>' +
              '<th class="{userTime}" data-sort-order="desc">Time <em>({utcOffset})</em></th>' +
              '<th class="{utcTime}" data-sort-order="desc">Time <em>(UTC)</em></th>' +
              '<th class="{depth}" data-sort-method="number">Depth</th>' +
              '<th class="{location}">Location</th>' +
              '<th class="{distance}" data-sort-method="number">' +
                '<abbr title="Distance and direction from mainshock">Distance</abbr>' +
              '</th>' +
              '<th class="{eqid}">Event ID</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' +
            '{rows}' +
          '</tbody>' +
        '</table>' +
      '</div>',
      data
    );
  };

  /**
   * Get the HTML content for the magnitude range slider (filter) and/or its
   * associated sub header.
   *
   * @return html {String}
   */
  _getSlider = function () {
    var magThreshold = _getThreshold(),
        data = {
          count: _this.bins.mag[magThreshold],
          id: _featureId,
          mag: magThreshold,
          max: _this.bins.mag.length - 1,
          min: Math.floor(_params.magnitude)
        },
        html = L.Util.template(
          '<h3>' +
            'M <span class="mag">{mag}</span>+ Earthquakes <span class="count">{count}</span>' +
          '</h3>',
          data
        ),
        singleMagBin = _this.bins.mag.every(
          (value, i, array) => array[0] === value // all values are the same
        );

    if (!singleMagBin) {
      html += L.Util.template(
        '<div class="filter">' +
          '<label for="{id}">Filter by magnitude</label>' +
          '<div class="slider-container">' +
            '<div class="min">{min}</div>' +
            '<div class="slider inverted" style="--min:{min}; --max:{max}; --val:{mag};">' +
              '<input id="{id}" type="range" min="{min}" max="{max}" value="{mag}"/>' +
              '<output for="{id}">{mag}</output>' +
            '</div>' +
            '<div class="max">{max}</div>' +
          '</div>' +
        '</div>',
        data
      );
    }

    return html;
  };

  /**
   * Get the template for storing binned earthquake data by time period.
   *
   * @return {Object}
   */
  _getTemplate = function () {
    return {
      day: 0,
      week: 0,
      month: 0,
      year: 0,
      total: 0
    };
  };

  /**
   * Get the magnitude threshold where no more than _maxNumEqs will be visible
   * by default.
   *
   * @return threshold {Number}
   */
  _getThreshold = function () {
    var magBins = _this.bins.mag,
        maxMag = magBins.length - 1, // 0-based Array
        threshold = maxMag; // default

    magBins.some((number, magInt) => {
      if (number <= _maxNumEqs) {
        threshold = magInt;

        return true;
      }
    });

    if (threshold < _params.magnitude) { // happens when there's no smaller eqs
      threshold = Math.floor(_params.magnitude);
    }

    return threshold;
  };

  /**
   * Event handler that hides (collapses) the sort menu. Applies to small
   * screens only.
   *
   * @param e {Event}
   */
  _hideMenu = function (e) {
    var table = this.closest('table'),
        tagName = e.target.tagName.toLowerCase(),
        wrapper = this.closest('.wrapper');

    if (tagName === 'tr') { // ignore Tablesort Events
      this.classList.remove('active');
      table.classList.remove('show-menu');

      wrapper.style.paddingTop = '0px';
    }
  };

  /**
   * Initialize the Object templates for storing binned earthquake data.
   *
   * @param magInt {Integer}
   * @param type {String}
   */
  _initBins = function (magInt, type) {
    // Tables (all rows, including total)
    if (!_this.bins[type]) {
      _this.bins[type] = {
        total: _getTemplate()
      };
    }
    if (!_this.bins[type]['m ' + magInt]) {
      _this.bins[type]['m ' + magInt] = _getTemplate();
    }

    // Range slider (filter)
    if (!_this.bins.mag) {
      _this.bins.mag = [];
    }
    for (var i = magInt; i >= 0; i --) {
      if (!_this.bins.mag[i]) {
        _this.bins.mag[i] = 0;
      }
    }
  };

  /**
   * Configure and instantiate the Tablesort plugin for the given table.
   *
   * @param table {Element}
   */
  _initSort = function (table) {
    var cleanNumber = function (i) {
          return i.replace(/[^\-?0-9.]/g, '');
        },
        compareNumber = function (a, b) {
          a = parseFloat(a);
          b = parseFloat(b);

          a = isNaN(a) ? 0 : a;
          b = isNaN(b) ? 0 : b;

          return a - b;
        };

    // Add Number sorting (https://gist.github.com/tristen/e79963856608bf54e046)
    Tablesort.extend('number', item => {
      item.match(/^-?(\d)*-?([,.]){0,1}-?(\d)+([E,e][-+][\d]+)?%?$/);
    }, (a, b) => {
      a = cleanNumber(a);
      b = cleanNumber(b);

      return compareNumber(b, a);
    });

    Tablesort(table);
  };

  /**
   * Event handler that opens an earthquake's map Popup.
   *
   * @param e {Event}
   */
  _openPopup = function (e) {
    var featureId,
        catalog = AppUtil.getParam('catalog') || 'comcat',
        eqid = this.querySelector('.eqid').textContent,
        features = _app.Features.getFeatures(catalog),
        parent = this.closest('.feature'),
        selection = window.getSelection(),
        isTextSelected = e.target.parentNode.contains(selection.anchorNode) &&
          selection.toString().length > 0;

    // Keep row highlighted after click
    this.classList.add('selected');

    // Determine which Feature was clicked
    Object.keys(features).forEach(id => {
      if (parent.classList.contains(id)) {
        featureId = id;
      }
    });

    // Suppress click event if user is selecting text
    if (!isTextSelected) {
      _app.MapPane.openPopup(eqid, featureId);
    }
  };

  /**
   * Event handler that removes the "extraneous" sort indicator left behind when
   * a table's sortby field is changed after switching between user/UTC time.
   *
   * @param e {Event}
   */
  _removeSortIndicator = function (e) {
    var table = e.target,
        ths = table.querySelectorAll('.sort-down, .sort-up');

    if (ths.length > 1) {
      ths.forEach(th => {
        if (
          th.classList.contains('userTime') ||
          th.classList.contains('utcTime')
        ) {
          th.classList.remove('sort-down', 'sort-up');
        }
      });
    }
  };

  /**
   * Event handler that renders the sort menu close button's mouse effects via
   * added CSS classes due to the vagaries of styling pseudo-elements.
   *
   * @param e {Event}
   */
  _renderEffects = function (e) {
    var tagName = e.target.tagName.toLowerCase();

    if (tagName === 'tr') {
      if (e.type === 'mousedown') {
        this.classList.add('active');
      } else if (e.type === 'mouseover') {
        this.classList.add('hover');
      } else if (e.type === 'mouseout') {
        this.classList.remove('hover');
      }
    }
  };

  /**
   * Event handler that shows (expands) the sort menu, which is collapsed by
   * default. Applies to small screens only.
   *
   * @param e {Event}
   */
  _showMenu = function (e) {
    var mq = window.matchMedia('(max-width: 735px)'),
        table = this.closest('table'),
        tr = this.closest('tr'),
        height = tr.offsetHeight + 'px',
        wrapper = this.closest('.wrapper');

    if (mq.matches && !table.classList.contains('show-menu')) {
      e.stopImmediatePropagation(); // don't sort table

      wrapper.style.paddingTop = height; // don't shift content
      table.classList.add('show-menu');

      tr.addEventListener('click', _hideMenu);
      tr.addEventListener('mousedown', _renderEffects);
      tr.addEventListener('mouseout', _renderEffects);
      tr.addEventListener('mouseover', _renderEffects);
    }
  };

  /**
   * Event handler that turns off the 'selected' (previously clicked) row.
   */
  _unselectRow = function () {
    var selected = _el.querySelector('tr.selected');

    if (selected) {
      selected.classList.remove('selected');
    }
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add event listeners.
   */
  _this.addListeners = function () {
    var container = _el.querySelector('.' + _featureId);

    _slider = container.querySelector('.slider input'),
    _tables = container.querySelectorAll('table.list');

    // Filter the earthquake list when the user interacts with the range slider
    if (_slider) {
      _props = {
        count: container.querySelector('h3 .count'),
        mag: container.querySelector('h3 .mag'),
        output: _slider.nextElementSibling,
        slider: _slider.parentNode,
        table: container.querySelector('div.filter + .wrapper .list')
      };

      _slider.addEventListener('input', _filter);
    }

    if (_tables) {
      _tables.forEach(table => {
        var ths = table.querySelectorAll('th'),
            trs = table.querySelectorAll('tr');

        if (table.classList.contains('sortable')) {
          // Remove extraneous sort indicator
          table.addEventListener('afterSort', _removeSortIndicator);

          // Show the sort menu on a responsive table
          ths.forEach(th =>
            th.addEventListener('click', _showMenu)
          );

          _configTable(table);
        }

        // Show the map and open a popup when the user clicks on an earthquake
        trs.forEach(tr => {
          if (!tr.classList.contains('no-sort')) { // skip header row
            tr.addEventListener('click', _openPopup);
            tr.addEventListener('mouseover', _unselectRow);
          }
        });
      });
    }
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;
    _data = null;
    _el = null;
    _featureId = null;
    _maxNumEqs = null;
    _params = null;
    _props = null;
    _slider = null;
    _tables = null;

    _addTitles = null;
    _addEqToBins = null;
    _configTable = null;
    _createBins = null;
    _filter = null;
    _getBinnedTable = null;
    _getListTable = null;
    _getSlider = null;
    _getTemplate = null;
    _getThreshold = null;
    _hideMenu = null;
    _initBins = null;
    _initSort = null;
    _openPopup = null;
    _removeSortIndicator = null;
    _renderEffects = null;
    _showMenu = null;
    _unselectRow = null;

    _this = null;
  };

  /**
   * Get the HTML content for the SummaryPane.
   *
   * @return html {String}
   */
  _this.getContent = function () {
    var duration, interval, mostRecentEq,
        count = _data.length,
        html = '';

    if (_featureId.includes('aftershocks')) {
      if (count > 0) {
        html += '<div class="bins">';
        html += _getBinnedTable('first');
        html += _getBinnedTable('past');
        html += '</div>';
      }

      html += '<div class="forecast content hide"></div>'; // placeholder

      if (count > 1) {
        mostRecentEq = _data[count - 1];
        interval = Luxon.Interval.fromDateTimes(
          mostRecentEq.datetime,
          Luxon.DateTime.utc()
        ).length('days');
        duration = AppUtil.round(interval, 1) + ' days';

        html += '<h3>Most Recent Aftershock</h3>';
        html += `<p>The most recent aftershock was <strong>${duration} ago</strong>.</p>`;
        html += _getListTable('mostRecent');
      }
    }

    if (count > 0) {
      if (
        _featureId.includes('foreshocks') ||
        _featureId.includes('historical')
      ) {
        html += _getBinnedTable('prior');
      }

      html += _getSlider();
      html += _getListTable();
    }

    return html;
  };

  /**
   * Remove event listeners.
   */
  _this.removeListeners = function () {
    if (_slider) {
      _slider.removeEventListener('input', _filter);
    }

    if (_tables) {
      _tables.forEach(table => {
        var ths = table.querySelectorAll('th'),
            trs = table.querySelectorAll('tr');

        if (table.classList.contains('sortable')) {
          table.removeEventListener('afterSort', _removeSortIndicator);

          ths.forEach(th =>
            th.removeEventListener('click', _showMenu)
          );
        }

        trs.forEach(tr => {
          if (!tr.classList.contains('no-sort')) { // skip header row
            tr.removeEventListener('click', _openPopup);
            tr.removeEventListener('mouseover', _unselectRow);
          }
        });
      });
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Summary;