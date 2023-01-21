/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
    Luxon = require('luxon'),
    Slider = require('util/controls/Slider'),
    Tablesort = require('tablesort');


var _DEFAULTS = {
  magThreshold: null,
  maxNumEqs: 25,
  sortField: 'utcTime',
  sortOrder: 'desc'
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
 *       magThreshold: {Integer} optional
 *       sortField: {String} optional
 *       sortOrder: {String} optional
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
      _el,
      _eqs,
      _featureId,
      _magThreshold,
      _maxNumEqs,
      _params,
      _reverseSort,
      _slider,
      _sortField,
      _sortOrder,
      _tables,

      _addTitles,
      _addEqToBins,
      _configTable,
      _createBins,
      _filter,
      _getBinnedTable,
      _getData,
      _getListTable,
      _getRows,
      _getSlider,
      _getSubHeader,
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
    _eqs = options.earthquakes.data;
    _featureId = options.featureId;
    _magThreshold = options.magThreshold; // default
    _maxNumEqs = options.maxNumEqs;
    _params = options.earthquakes.params;
    _reverseSort = false;
    _sortField = options.sortField;
    _sortOrder = options.sortOrder;

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

    // Total number of eqs by mag, inclusive (for range Slider)
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
    _addTitles(table);
    _initSort(table);
    _app.SummaryPane.swapSortIndicator([table]);

    if (_slider) { // eq list filter
      _slider.els = {
        count: _el.querySelector('h3 .count'),
        mag: _el.querySelector('h3 .mag'),
        table: _el.querySelector('.filter + .wrapper table')
      };

      _slider.setValue(); // set the range Slider to its initial value
    }
  };

  /**
   * Create the binned earthquake data.
   */
  _createBins = function () {
    var mainshock = _app.Features.getFeature('mainshock');

    _this.bins = {};

    _eqs.forEach(eq => {
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
   * Filter an earthquake list by magnitude and display the range Slider's
   * current value and count in the header.
   */
  _filter = function () {
    var i,
        els = _slider.els,
        feature = _app.Features.getFeature(_featureId),
        value = Number(this.value);

    els.count.innerHTML = feature.bins.mag[value];
    els.mag.innerHTML = value;

    for (i = value; i <= this.getAttribute('max'); i ++) {
      els.table.classList.add('m' + i); // show eqs at/above threshold
    }
    for (i = value; i >= this.getAttribute('min'); i --) {
      els.table.classList.remove('m' + (i - 1)); // hide eqs below threshold
    }
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
   * Get the data for an earthquake list table.
   *
   * @param fields {Object}
   * @param type {String}
   *
   * @return data {Object}
   */
  _getData = function (fields, type) {
    var thClasses,
        tableClasses = ['list'],
        data = {
          rows: _getRows(tableClasses, type), // must be before classNames prop
          classNames: tableClasses.join(' '),
          utcOffset: _app.utcOffset
        };

    // Get the classLists for the <th>s
    Object.keys(fields).forEach(field => {
      thClasses = [field];

      if (field === _sortField) {
        thClasses.push('sort-default');
      }

      data[field] = thClasses.join(' ');
    });

    return data;
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
    var fields = { // default sort orders
      depth: 'asc',
      distance: 'asc',
      eqid: 'asc',
      location: 'asc',
      mag: 'desc',
      userTime: 'desc',
      utcTime: 'desc'
    };

    if (fields[_sortField] !== _sortOrder) {
      _reverseSort = true;
    }

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
      _getData(fields, type)
    );
  };

  /**
   * Get the HTML <tr>s for an earthquake list and add the default classNames to
   * the tableClasses Array.
   *
   * @param tableClasses {Array}
   * @param type {String}
   *
   * @return rows {String}
   */
  _getRows = function (tableClasses, type) {
    var eqs = _eqs,
        magThreshold = _magThreshold,
        rows = '';

    if (type === 'mostRecent') {
      eqs = [eqs[eqs.length - 1]];
      magThreshold = 0; // always show most recent eq
    }
    if (eqs.length > 1) {
      tableClasses.push('sortable');
    }

    eqs.forEach(eq => {
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
        eq.magInt >= magThreshold &&
        tableClasses.indexOf('m' + eq.magInt) === -1
      ) {
        tableClasses.push('m' + eq.magInt); // show mag level by default
      }
    });

    return rows;
  };

  /**
   * Get the HTML content for the magnitude range Slider (filter).
   *
   * @return html {String}
   */
  _getSlider = function () {
    var html = '',
        singleMagBin = _this.bins.mag.every(
          (value, i, array) => array[0] === value // all values are the same
        );

    if (!singleMagBin) {
      _slider = Slider({
        filter: _filter,
        id: _featureId + '-mag',
        label: 'Filter by magnitude',
        max: _this.bins.mag.length - 1,
        min: Math.floor(_params.magnitude),
        val: _magThreshold
      });
      html += _slider.getHtml();
    }

    return html;
  };

  /**
   * Get the HTML for the Earthquakes list sub-header.
   *
   * @return {String}
   */
  _getSubHeader = function () {
    var data = {
      count: _this.bins.mag[_magThreshold],
      mag: _magThreshold,
    };

    return L.Util.template(
      '<h3>' +
        'M <span class="mag">{mag}</span>+ Earthquakes <span class="count">{count}</span>' +
      '</h3>',
      data
    );
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
   * by default, or return _magThreshold if it is set and <= maxMag.
   *
   * @return threshold {Integer}
   */
  _getThreshold = function () {
    var magBins = _this.bins.mag,
        maxMag = magBins.length - 1, // 0-based Array
        threshold = maxMag; // default

    if (Number.isInteger(_magThreshold) &&_magThreshold <= maxMag) {
      threshold = _magThreshold;
    } else {
      magBins.some((number, magInt) => {
        if (number <= _maxNumEqs) {
          threshold = magInt;

          return true;
        }
      });
    }

    if (threshold < _params.magnitude) { // no/few smaller-mag eqs
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
    var th,
        cleanNumber = function (i) {
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

    if (_reverseSort) { // set initial sort direction to opposite of default
      th = table.querySelector('th.' + _sortField);
      th.click();
    }
  };

  /**
   * Event handler that opens an earthquake's map Popup.
   *
   * @param e {Event}
   */
  _openPopup = function (e) {
    var featureId,
        catalog = AppUtil.getParam('catalog') || 'comcat',
        tr = e.target.closest('tr'),
        div = tr.closest('.feature'),
        eqid = tr.querySelector('.eqid').textContent,
        features = _app.Features.getFeatures(catalog),
        selection = window.getSelection(),
        isTextSelected = tr.contains(selection.anchorNode) &&
          selection.toString().length > 0;

    if (!tr.classList.contains('no-sort')) { // ignore header rows
      // Keep row highlighted after click
      tr.classList.add('selected');

      // Determine which Feature was clicked
      Object.keys(features).forEach(id => {
        if (div.classList.contains(id)) {
          featureId = id;
        }
      });

      // Suppress click event if user is selecting text
      if (!isTextSelected) {
        location.href = '#mapPane';

        _app.MapPane.openPopup(eqid, featureId);
      }
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
   * Event handler that turns off the 'selected' (previously clicked) row in any
   * Feature's table.
   */
  _unselectRow = function () {
    var container = _el.closest('.container'),
        selected = container.querySelector('tr.selected');

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
    _el = document.querySelector('#summaryPane .' + _featureId);
    _tables = _el.querySelectorAll('table.list');

    if (_slider) {
      _slider.addListeners(document.getElementById(_featureId + '-mag'));
    }

    if (_tables) {
      _tables.forEach(table => {
        var ths = table.querySelectorAll('th');

        if (table.classList.contains('sortable')) {
          // Remove extraneous sort indicator
          table.addEventListener('afterSort', _removeSortIndicator);

          // Show the sort menu on a responsive table
          ths.forEach(th => th.addEventListener('click', _showMenu));

          _configTable(table);
        }

        // Show the map and open a popup
        table.addEventListener('click', _openPopup);
        table.addEventListener('mouseover', _unselectRow);
      });
    }
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    if (_slider) {
      _slider.destroy(); // also removes its listeners
    }

    _initialize = null;

    _app = null;
    _el = null;
    _eqs = null;
    _featureId = null;
    _magThreshold = null;
    _maxNumEqs = null;
    _params = null;
    _reverseSort = null;
    _slider = null;
    _sortField = null;
    _sortOrder = null;
    _tables = null;

    _addTitles = null;
    _addEqToBins = null;
    _configTable = null;
    _createBins = null;
    _filter = null;
    _getBinnedTable = null;
    _getData = null;
    _getListTable = null;
    _getRows = null;
    _getSlider = null;
    _getSubHeader = null;
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
        count = _eqs.length,
        html = '';

    if (_featureId.includes('aftershocks')) {
      if (count > 0) {
        html += '<div class="bins">';
        html += _getBinnedTable('first');
        html += _getBinnedTable('past');
        html += '</div>';
      }

      html += '<div class="forecast feature content hide"></div>'; // placeholder

      if (count > 1) {
        mostRecentEq = _eqs[count - 1];
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
      _magThreshold = _getThreshold();

      if (
        _featureId.includes('foreshocks') ||
        _featureId.includes('historical')
      ) {
        html += _getBinnedTable('prior');
      }

      html += _getSubHeader();
      html += _getSlider();
      html += _getListTable();
    }

    return html;
  };

  /**
   * Remove event listeners.
   */
  _this.removeListeners = function () {
    if (_tables) {
      _tables.forEach(table => {
        var ths = table.querySelectorAll('th');

        if (table.classList.contains('sortable')) {
          table.removeEventListener('afterSort', _removeSortIndicator);

          ths.forEach(th =>
            th.removeEventListener('click', _showMenu)
          );
        }

        table.removeEventListener('click', _openPopup);
        table.removeEventListener('mouseover', _unselectRow);
      });
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Summary;
