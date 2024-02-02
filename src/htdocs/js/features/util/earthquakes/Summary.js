/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
    Luxon = require('luxon'),
    Slider = require('util/controls/Slider'),
    Tablesort = require('tablesort');


var _DEFAULTS,
    _FIELDS;

_DEFAULTS = {
  field: 'utcTime',
  max: 25,
  order: 'desc'
};
_FIELDS = { // default sort order
  depth: 'asc',
  distance: 'asc',
  eqid: 'asc',
  location: 'asc',
  mag: 'desc',
  userTime: 'desc',
  utcTime: 'desc'
};


/**
 * Create the Summary HTML for the Aftershocks, Foreshocks, and Historical
 * Seismicity Features and handle the interactive components like filtering,
 * sorting, and clicking on an earthquake in a list.
 *
 * @param options {Object}
 *     {
 *       app: {Object}
 *       feature: {Object}
 *       field: {String} optional
 *       max: {Integer} optional
 *       order: {String} optional
 *     }
 *
 * @return _this {Object}
 *     {
 *       addListeners: {Function}
 *       bins: {Object}
 *       destroy: {Function}
 *       getContent: {Function}
 *       removeListeners: {Function}
 *       threshold: {Integer}
 *     }
 */
var Summary = function (options) {
  var _this,
      _initialize,

      _app,
      _el,
      _eqs,
      _feature,
      _field,
      _max,
      _order,
      _reverseSort,
      _slider,
      _tables,
      _tableClasses,

      _addEqToBins,
      _configure,
      _createBins,
      _filter,
      _getAge,
      _getBinnedRows,
      _getBinnedTable,
      _getClassLists,
      _getDuration,
      _getListRows,
      _getListTable,
      _getSlider,
      _getSubHeader,
      _getTemplate,
      _getThreshold,
      _hideMenu,
      _initBins,
      _initSort,
      _openPopup,
      _removeIndicator,
      _renderEffects,
      _showMenu,
      _storeOptions,
      _unselectRow;


  _this = {};

  _initialize = function (options = {}) {
    options = Object.assign({}, _DEFAULTS, options);

    _app = options.app;
    _eqs = options.feature.data.eqs;
    _feature = options.feature;
    _field = options.field; // default
    _max = options.max;
    _order = options.order; // default
    _reverseSort = false; // default

    _this.bins = {};
    _this.threshold = 0;

    _createBins(); // populates _this.bins
  };

  /**
   * Add an earthquake to its respective bins.
   *
   * @param type {String <first|past|prior>}
   * @param days {Integer}
   * @param magInt {Integer}
   */
  _addEqToBins = function (type, days, magInt) {
    _initBins(type, magInt);

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
   * Configure the given table's sorting and filtering capabilities.
   *
   * @param table {Element}
   */
  _configure = function (table) {
    var field = table.querySelector('th.' + _field),
        ths = table.querySelectorAll('th');

    _initSort(table);

    ths.forEach(th =>
      th.setAttribute('title', 'Sort by ' + th.textContent)
    );

    _app.SummaryPane.swapSort([table]); // swap sort indicator (user/utc time)

    if (_reverseSort) {
      field.click(); // swap sort order
    }

    _slider?.setValue();
  };

  /**
   * Create the binned earthquake data.
   */
  _createBins = function () {
    var mainshock = _app.Features.getMainshock();

    _eqs.forEach(eq => {
      if (_feature.type === 'aftershocks') {
        var days = Math.ceil(
          Luxon.Interval
            .fromDateTimes(mainshock.data.eq.datetime, eq.datetime)
            .length('days')
        );

        _addEqToBins('first', days, eq.magInt);

        days = Math.ceil(
          Luxon.Interval
            .fromDateTimes(eq.datetime, _feature.params.now)
            .length('days')
        );

        _addEqToBins('past', days, eq.magInt);
      } else if (
        _feature.type === 'historical' ||
        _feature.type === 'foreshocks'
      ) {
        days = Math.ceil(
          Luxon.Interval
            .fromDateTimes(eq.datetime, mainshock.data.eq.datetime)
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
        els = {
          count: _el.querySelector('h3 .count'),
          mag: _el.querySelector('h3 .mag'),
          table: _el.querySelector('.filter + .wrapper table')
        },
        value = Number(this.value);

    els.count.innerHTML = AppUtil.addCommas(_feature.summary.bins.mag[value]);
    els.mag.innerHTML = value;

    for (i = value; i <= this.getAttribute('max'); i ++) {
      els.table.classList.add('m' + i); // show eqs at/above threshold
    }
    for (i = value; i >= this.getAttribute('min'); i --) {
      els.table.classList.remove('m' + (i - 1)); // hide eqs below threshold
    }
  };

  /**
   * Get the age of the given earthquake (in decimal days).
   *
   * @param eq {Object}
   *
   * @return {String}
   */
  _getAge = function (eq) {
    var interval = Luxon.Interval.fromDateTimes(
      eq.datetime,
      _feature.params.now
    ).length('days');

    return AppUtil.round(interval, 1);
  };

  /**
   * Get the HTML rows for the given type of binned earthquake data.
   *
   * @param type {String <first|past|prior>}
   *
   * @return html {String}
   */
  _getBinnedRows = function (type) {
    var html = '';

    Object.keys(_this.bins[type]).sort().forEach(th => {
      html += '<tr>';
      html += `<th class="rowlabel">${th}</th>`;

      Object.keys(_this.bins[type][th]).forEach(period => {
        var td = _this.bins[type][th][period],
            tdClasses = [period];

        if (th === 'total') {
          tdClasses.push('total');
        }

        html += `<td class="${tdClasses.join(' ')}">${td}</td>`;
      });

      html += '</tr>';
    });

    return html;
  };

  /**
   * Get the HTML table for the given type of binned earthquake data.
   *
   * @param type {String <first|past|prior>}
   *
   * @return {String}
   */
  _getBinnedTable = function (type) {
    var data,
        duration = _getDuration(),
        days = Luxon.Duration.fromObject(duration).as('days'),
        tableClasses = ['bin'];

    if (days <= 7) {
      tableClasses.push('hide-month');
    }
    if (days <= 30) {
      tableClasses.push('hide-year');
    }

    data = {
      classList: tableClasses.join(' '),
      type: type
    };

    return L.Util.template(
      '<table class="{classList}">' +
        '<tr>' +
          '<th class="type">{type}:</th>' +
          '<th class="day">Day</th>' +
          '<th class="week">Week</th>' +
          '<th class="month">Month</th>' +
          '<th class="year">Year</th>' +
          '<th class="total">Total</th>' +
        '</tr>' +
        _getBinnedRows(type) +
      '</table>',
      data
    );
  };

  /**
   * Get the CSS classList values for an earthquake list table and its headers.
   *
   * @return classLists {Object}
   */
  _getClassLists = function () {
    var classLists = {
      table: _tableClasses.join(' ')
    };

    Object.keys(_FIELDS).forEach(field => {
      var thClasses = [field];

      if (field === _field) {
        thClasses.push('sort-default');
      }

      classLists[field] = thClasses.join(' ');
    });

    return classLists;
  };

  /**
   * Get the duration of the earthquake sequence.
   *
   * @return duration {Object}
   */
  _getDuration = function () {
    var duration = {};

    if (_feature.type === 'aftershocks') {
      duration.days = _feature.params.duration;
    } else if (_feature.type === 'foreshocks') {
      duration.days = _feature.params.days;
    } else { // historical
      duration.years = _feature.params.years;
    }

    return duration;
  };

  /**
   * Get the HTML rows for the given type of earthquake list and add the
   * relevant classNames to the _tableClasses Array.
   *
   * @param type {String <complete|mostRecent>}
   *
   * @return html {String}
   */
  _getListRows = function (type) {
    var eqs = _eqs,
        html = '',
        threshold = _this.threshold; // default

    if (type === 'mostRecent') {
      eqs = [eqs[eqs.length - 1]];
      threshold = -1; // always show most recent eq
    }

    eqs.forEach(eq => {
      html += L.Util.template(
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
        eq.magInt >= threshold &&
        _tableClasses.indexOf('m' + eq.magInt) === -1 // only add 1x
      ) {
        _tableClasses.push('m' + eq.magInt); // show mag level in default view
      }
    });

    if (eqs.length > 1) {
      _tableClasses.push('sortable');
    }

    return html;
  };

  /**
   * Get the HTML table for the given type of earthquake list.
   *
   * @param type {String <complete|mostRecent>} optional; default is 'complete'
   *
   * @return {String}
   */
  _getListTable = function (type = 'complete') {
    _tableClasses = ['list']; // additional classes are added by _getListRows()

    if (_FIELDS[_field] !== _order) {
      _reverseSort = true;
    }

    return L.Util.template(
      '<div class="wrapper">' +
        '<table class="{table}">' +
          '<thead>' +
            '<tr class="no-sort">' +
              '<th class="{mag}" data-sort-method="number" data-sort-order="desc">Mag</th>' +
              '<th class="{userTime}" data-sort-order="desc">Time <em>(User)</em></th>' +
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
            _getListRows(type) +
          '</tbody>' +
        '</table>' +
      '</div>',
      _getClassLists()
    );
  };

  /**
   * Get the HTML content for the magnitude range Slider (filter).
   *
   * @return html {String}
   */
  _getSlider = function () {
    var html = '',
        singleMagBin = _this.bins.mag.every(
          (val, i, arr) => arr[0] === val // all values are the same
        );

    if (!singleMagBin) {
      _slider = Slider({
        filter: _filter,
        id: _feature.type + '-mag',
        label: 'Filter by magnitude',
        max: _this.bins.mag.length - 1,
        min: Math.floor(_feature.params.magnitude),
        val: _this.threshold
      });
      html += _slider.getContent();
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
      count: _this.bins.mag[_this.threshold],
      mag: _this.threshold,
    };

    return L.Util.template(
      '<h3>' +
        'M <span class="mag">{mag}</span>+ Earthquakes <span class="count">{count}</span>' +
      '</h3>',
      data
    );
  };

  /**
   * Get the Object template for storing binned earthquake data by time period.
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
   * Get the magnitude threshold where no more than _max eqs will be visible
   * by default, or use the existing value (i.e. set by user) if it's in range.
   *
   * @return threshold {Integer}
   */
  _getThreshold = function () {
    var magBins = _this.bins.mag,
        magnitude = _feature.params.magnitude,
        maxMag = magBins.length - 1, // 0-based Array
        threshold = maxMag, // default
        userThreshold = parseInt(sessionStorage.getItem(_feature.type + '-mag'));

    if (Number.isInteger(userThreshold)) {
      threshold = userThreshold; // keep user set value (on refresh/reload)
    } else {
      magBins.some((number, magInt) => {
        if (number <= _max) {
          threshold = magInt;

          return true;
        }
      });
    }

    // Ensure threshold is in range
    if (threshold < magnitude) {
      threshold = Math.floor(magnitude);
    } else if (threshold > maxMag) {
      threshold = maxMag;
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
   * Initialize the Array/Object templates for storing the given type of binned
   * earthquake data.
   *
   * @param type {String <first|past|prior>}
   * @param magInt {Integer}
   */
  _initBins = function (type, magInt) {
    // Tables
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
   * Initialize the given table's sorting capability using the TableSort plugin.
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
    var feature,
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
          feature = _app.Features.getFeature(id);
        }
      });

      // Suppress click event if user is selecting text
      if (!isTextSelected) {
        location.href = '#map';

        // Ensure location.href setting is applied first
        setTimeout(() => _app.MapPane.openPopup(feature, eqid));
      }
    }
  };

  /**
   * Event handler that removes the "extraneous" sort indicator left behind when
   * a table's sorted-by field is changed after switching between user/UTC time.
   *
   * @param e {Event}
   */
  _removeIndicator = function (e) {
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
   * Event handler that stores the table's sorted-by options.
   *
   * @param e {Event}
   */
  _storeOptions = function (e) {
    var table = e.target,
        div = table.closest('.feature'),
        id = Array.from(div.classList).find(item => item !== 'feature'),
        selected = table.querySelector('.sort-down, .sort-up'),
        sortField = '', // default
        sortOrder = 'desc', // default
        type = _app.Features.getFeature(id).type;

    Object.keys(_FIELDS).forEach(field => {
      if (selected.classList.contains(field)) {
        sortField = field;
      }
    });

    if (selected.classList.contains('sort-down')) {
      sortOrder = 'asc';
    }

    sessionStorage.setItem(type + '-field', sortField);
    sessionStorage.setItem(type + '-order', sortOrder);
  };

  /**
   * Event handler that turns off the "selected" (previously clicked) row in any
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
    _el = document.querySelector('#summary-pane .' + _feature.id);
    _tables = _el.querySelectorAll('table.list');

    _slider?.addListeners(document.getElementById(_feature.type + '-mag'));

    _tables.forEach(table => {
      var ths = table.querySelectorAll('th');

      if (table.classList.contains('sortable')) {
        table.addEventListener('afterSort', _removeIndicator); // must be first
        table.addEventListener('afterSort', _storeOptions);

        // Show the sort menu on a responsive table
        ths.forEach(th => th.addEventListener('click', _showMenu));

        _configure(table); // also set up table
      }

      // Show the map and open a popup
      table.addEventListener('click', _openPopup);
      table.addEventListener('mouseover', _unselectRow);
    });
  };

  /**
   * Destroy this Class.
   */
  _this.destroy = function () {
    _slider?.destroy();

    _initialize = null;

    _app = null;
    _el = null;
    _eqs = null;
    _feature = null;
    _field = null;
    _max = null;
    _order = null;
    _reverseSort = null;
    _slider = null;
    _tables = null;
    _tableClasses = null;

    _addEqToBins = null;
    _configure = null;
    _createBins = null;
    _filter = null;
    _getAge = null;
    _getBinnedRows = null;
    _getBinnedTable = null;
    _getClassLists = null;
    _getDuration = null;
    _getListRows = null;
    _getListTable = null;
    _getSlider = null;
    _getSubHeader = null;
    _getTemplate = null;
    _getThreshold = null;
    _hideMenu = null;
    _initBins = null;
    _initSort = null;
    _openPopup = null;
    _removeIndicator = null;
    _renderEffects = null;
    _showMenu = null;
    _storeOptions = null;
    _unselectRow = null;

    _this = null;
  };

  /**
   * Get the HTML content for the SummaryPane.
   *
   * @return html {String}
   */
  _this.getContent = function () {
    var age,
        count = _eqs.length,
        html = '',
        timestamp = _app.Features.getTimeStamp(_feature.data);

    if (_feature.type === 'aftershocks') {
      if (count > 0) {
        html += '<div class="bins">';
        html += _getBinnedTable('first');
        html += _getBinnedTable('past');
        html += '</div>';
      }
      if (count > 1) {
        age = _getAge(_eqs[count - 1]);
        html += '<h3>Most Recent Aftershock</h3>';
        html += `<p>The most recent aftershock was <strong>${age} days ago</strong>.</p>`;
        html += _getListTable('mostRecent');
      }
    }

    if (count > 0) {
      _field = sessionStorage[_feature.type + '-field'] || _field;
      _order = sessionStorage[_feature.type + '-order'] || _order;
      _this.threshold = _getThreshold();

      if (
        _feature.type === 'foreshocks' ||
        _feature.type === 'historical'
      ) {
        html += _getBinnedTable('prior');
      }

      html += _getSubHeader();
      html += _getSlider();
      html += _getListTable();
    }

    html += `<dl class="props timestamp">${timestamp}</dl>`;

    return html;
  };

  /**
   * Remove event listeners.
   */
  _this.removeListeners = function () {
    _slider?.removeListeners();

    if (_tables) {
      _tables.forEach(table => {
        var ths = table.querySelectorAll('th');

        if (table.classList.contains('sortable')) {
          table.removeEventListener('afterSort', _removeIndicator);
          table.removeEventListener('afterSort', _storeOptions);

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
