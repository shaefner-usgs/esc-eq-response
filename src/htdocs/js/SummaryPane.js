'use strict';


var AppUtil = require('util/AppUtil'),
    Luxon = require('luxon'),
    Tablesort = require('tablesort');


/**
 * Add/remove a Feature's summary when it is created/updated using external
 * feed data. Set up and configure the interactive components such as table
 * sorting and filter sliders.
 *
 * @param options {Object}
 *   {
 *     app: {Object} Application
 *     el: {Element}
 *   }
 *
 * @return _this {Object}
 *   {
 *     addFeature: {Function}
 *     addLoader: {Function}
 *     removeFeature: {Function}
 *     reset: {Function}
 *     swapSortIndicator: {Function}
 *     updateMainshock: {Function}
 *   }
 */
var SummaryPane = function (options) {
  var _this,
      _initialize,

      _app,
      _contentEl,
      _el,
      _filterProps,
      _tz,

      _addCount,
      _addListeners,
      _addTitleAttrs,
      _configTable,
      _filterList,
      _hideMenu,
      _initTableSort,
      _openPopup,
      _removeSortIndicator,
      _renderEffects,
      _showMenu,
      _unselectRow,
      _updateTimestamp;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _el = options.el || document.createElement('section');
    _contentEl = _el.querySelector('.content');
    _filterProps = {};
    _tz = AppUtil.getTimeZone();
  };

  /**
   * Add the count value to the Feature's name and hide the 'loader'.
   *
   * @param feature {Object}
   * @param div {Element}
   */
  _addCount = function (feature, div) {
    var count,
        loader = div.querySelector('.breather');

    if (loader) {
      loader.classList.add('hide');
    }

    if (Object.prototype.hasOwnProperty.call(feature, 'count')) {
      count = document.createElement('span');

      count.classList.add('count', 'hide');
      count.textContent = feature.count;

      div.querySelector('h2').appendChild(count);

      // Trigger a reflow (to enable CSS transition), then unhide
      count.focus();
      count.classList.remove('hide');
    }
  };

  /**
   * Add event listeners.
   *
   * @param id {String}
   *     Feature id
   */
  _addListeners = function (id) {
    var ths, trs,
        div = _el.querySelector('.' + id),
        input = div.querySelector('.slider input'),
        tables = div.querySelectorAll('table.list');

    // Filter the earthquake list when the user interacts with the range slider
    if (input) {
      _filterProps[input.id] = {
        count: div.querySelector('h3 .count'),
        mag: div.querySelector('h3 .mag'),
        output: input.nextElementSibling,
        slider: input.parentNode,
        table: div.querySelector('div.filter + .wrapper .list')
      };

      input.addEventListener('input', _filterList);
    }

    if (tables) {
      tables.forEach(table => {
        ths = table.querySelectorAll('th');
        trs = table.querySelectorAll('tr');

        // Remove extraneous sort indicator
        table.addEventListener('afterSort', _removeSortIndicator);

        // Show the sort menu on a responsive table
        ths.forEach(th =>
          th.addEventListener('click', _showMenu)
        );

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
   * Add a title attr to <th>s to inform user of sort capability.
   *
   * @param table {Element}
   */
  _addTitleAttrs = function (table) {
    var ths = table.querySelectorAll('th');

    ths.forEach(th =>
      th.setAttribute('title', 'Sort by ' + th.textContent)
    );
  };

  /**
   * Configure an earthquake list table's interactive elements (filters,
   * sorting, etc).
   *
   * @param id {String}
   *     Feature id
   */
  _configTable = function (id) {
    var div = _el.querySelector('.' + id),
        slider = div.querySelector('.slider input'),
        table = div.querySelectorAll('table.list.sortable');

    if (slider) {
      _app.setSliderStyles(slider); // set range slider to initial value
    }

    if (table) {
      _addListeners(id);
      _initTableSort(id);
      _this.swapSortIndicator(table);
    }
  };

  /**
   * Filter an earthquake list by magnitude threshold and display the <input>
   * range slider's current value.
   */
  _filterList = function () {
    var feature = _app.Features.getFeature(this.id),
        props = _filterProps[this.id],
        value = Number(this.value),
        scrollY = window.pageYOffset;

    props.count.innerHTML = feature.bins.mag[value];
    props.mag.innerHTML = value;
    props.output.value = value;

    props.slider.style.setProperty('--val', value);

    for (var i = value; i <= this.getAttribute('max'); i ++) {
      props.table.classList.add('m' + i); // show eqs at/above threshold
    }
    for (var j = value; j >= this.getAttribute('min'); j --) {
      props.table.classList.remove('m' + (j - 1)); // hide eqs below threshold
    }

    // Prevent page scrolling and update slider track
    window.scroll(0, scrollY);
    _app.setSliderStyles(this);
  };

  /**
   * Hide (collapse) the sort menu. Applies to small screens only.
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
   * Configure and instantiate the Tablesort plugin.
   *
   * @param id {String}
   *     Feature id
   */
  _initTableSort = function (id) {
    var cleanNumber = function (i) {
          return i.replace(/[^\-?0-9.]/g, '');
        },
        compareNumber = function (a, b) {
          a = parseFloat(a);
          b = parseFloat(b);

          a = isNaN(a) ? 0 : a;
          b = isNaN(b) ? 0 : b;

          return a - b;
        },
        table = _el.querySelector('.' + id + ' .sortable');

    // Add Number sorting (https://gist.github.com/tristen/e79963856608bf54e046)
    Tablesort.extend('number', item => {
      item.match(/^-?(\d)*-?([,.]){0,1}-?(\d)+([E,e][-+][\d]+)?%?$/);
    }, (a, b) => {
      a = cleanNumber(a);
      b = cleanNumber(b);

      return compareNumber(b, a);
    });

    if (table) {
      Tablesort(table);
      _addTitleAttrs(table);
    }
  };

  /**
   * Open a map popup when the user clicks on an earthquake in a list.
   *
   * @param e {Event}
   */
  _openPopup = function (e) {
    var featureId,
        eqid = this.querySelector('.eqid').textContent,
        features = _app.Features.getFeatures(),
        parent = this.closest('.feature'),
        selection = window.getSelection(),
        isTextSelected = e.target.parentNode.contains(selection.anchorNode) &&
          selection.toString().length > 0;

    // Keep row highlighted after click
    this.classList.add('selected');

    // Determine which Feature was clicked
    Object.keys(features).forEach(key => {
      if (parent.classList.contains(key)) {
        featureId = key;
      }
    });

    if (!isTextSelected) { // suppress click event if user is selecting text
      _app.MapPane.openPopup(eqid, featureId);
    }
  };

  /**
   * Remove the "extraneous" sort indicator that gets left behind when a table's
   * sortby field is changed after switching between user/utc time.
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
   * Render the sort menu close button's mouse effects via added CSS classes due
   * to the vagaries of styling pseudo-elements.
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
   * Show (expand) the sort menu, which is collapsed by default. Applies to
   * small screens only.
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
   * Turn off 'selected' (previously clicked) row when user hovers over a table.
   */
  _unselectRow = function () {
    var selected = _el.querySelector('tr.selected');

    if (selected) {
      selected.classList.remove('selected');
    }
  };

  /**
   * Update the timestamp.
   */
  _updateTimestamp = function () {
    var el = document.getElementById('updated'),
        userTime = Luxon.DateTime.now().toFormat("ccc, LLL d, yyyy 'at' tt"); // eslint-disable-line

    el.innerHTML = `${userTime} (${_tz})`;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add a Feature.
   *
   * @param feature {Object}
   */
  _this.addFeature = function (feature) {
    var div;

    if (feature.summary) {
      div = _el.querySelector('div.' + feature.id);

      // Inserting node this way preserves CSS transitions
      div.insertAdjacentHTML('beforeend', feature.summary);

      // If this is a "sub-Feature" of the Mainshock, toggle the visibility
      if (div.classList.contains('placeholder')) {
        div.classList.remove('hide');
      }

      _addCount(feature, div);
      _configTable(feature.id);
      _updateTimestamp();
    }
  };

  /**
   * Add a Feature's container, name and 'loader'.
   *
   * @param feature {Object}
   */
  _this.addLoader = function (feature) {
    var div,
        placeholder = _el.querySelector('.' + feature.id + '.placeholder');

    // Note: some Features are rendered into an existing placeholder (under Mainshock)
    if (Object.prototype.hasOwnProperty.call(feature, 'summary') && !placeholder) {
      div = document.createElement('div');
      div.innerHTML = '<h2>' + feature.name + '<span class="breather">' +
        '<span></span></span></h2>';

      div.classList.add(feature.id, 'feature');

      _contentEl.appendChild(div);
    }
  };

  /**
   * Remove a Feature (but leave placeholders intact).
   *
   * @param feature {Object}
   */
  _this.removeFeature = function (feature) {
    var el = _el.querySelector('.' + feature.id);

    if (el) {
      if (!el.classList.contains('placeholder')) {
        el.parentNode.removeChild(el);
      }
    }
  };

  /**
   * Reset to default state.
   */
  _this.reset = function () {
    var time = _el.querySelector('time');

    time.innerHTML = '';
    _contentEl.innerHTML = '';
  };

  /**
   * Swap the given tables' sort indicators between time fields to the field
   * that is currently visible. Called when the time zone option is changed and
   * when a table is added/updated.
   *
   * @param tables {NodeList|Array}
   */
  _this.swapSortIndicator = function (tables) {
    var indicator, sortDown, sortUp, thHidden, thVisible,
        fields = ['userTime', 'utcTime'],
        visibleField = document.querySelector('ul.timezone .selected').id + 'Time';

    tables.forEach(table => {
      fields.forEach(field => {
        if (field !== visibleField) {
          thHidden = table.querySelector('th.' + field);
          thVisible = table.querySelector('th.' + visibleField);
          sortDown = thHidden.classList.contains('sort-down');
          sortUp = thHidden.classList.contains('sort-up');

          if (sortDown || sortUp) {
            indicator = (sortDown ? 'sort-down' : 'sort-up');

            thHidden.classList.remove(indicator);
            thVisible.classList.add(indicator);
          }
        }
      });
    });
  };

  /**
   * Update the Mainshock's catalog-specific details.
   */
  _this.updateMainshock = function() {
    var depth = _el.querySelector('.details .depth span'),
        location = _el.querySelector('.details .location span'),
        mag = _el.querySelector('.details .mag span'),
        mainshock = _app.Features.getFeature('mainshock');

    depth.textContent = mainshock.data.depthDisplay;
    location.textContent = mainshock.data.location;
    mag.textContent = mainshock.data.magDisplay;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = SummaryPane;
