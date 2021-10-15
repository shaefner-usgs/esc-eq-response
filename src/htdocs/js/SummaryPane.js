'use strict';


var AppUtil = require('util/AppUtil'),
    Luxon = require('luxon'),
    Tablesort = require('tablesort');


/**
 * Add/remove summaries for a Feature when they are created/updated from
 * external feed data. Set up and configure the interactive components like
 * table sorting and filter sliders.
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
        loader;

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
    var div,
        input,
        tables,
        ths,
        trs;

    div = _el.querySelector('.' + id);
    input = div.querySelector('.slider input');
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

        // Show the sort menu when the user clicks on the current sorted by option
        ths.forEach(th => {
          th.addEventListener('click', _showMenu);
        });

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

    ths.forEach(th => {
      th.setAttribute('title', 'Sort by ' + th.textContent);
    });
  };

  /**
   * Configure an earthquake list table's interactive elements (filters,
   * sorting, etc).
   *
   * @param id {String}
   *     Feature id
   */
  _configTable = function (id) {
    var div,
        slider,
        table;

    div = _el.querySelector('.' + id);
    slider = div.querySelector('.slider input');
    table = div.querySelector('table.list');

    if (slider) {
      _app.setSliderStyles(slider); // set range slider to initial value
    }
    if (table) {
      _addListeners(id);
      _initTableSort(id);
    }
  };

  /**
   * Filter an earthquake list and display the <input> range slider's current
   * value.
   */
  _filterList = function () {
    var feature,
        props,
        value,
        scrollY;

    feature = _app.Features.getFeature(this.id);
    props = _filterProps[this.id];
    value = Number(this.value);
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
    var table,
        tagName,
        wrapper;

    table = this.closest('table');
    tagName = e.target.tagName.toLowerCase();
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
    var cleanNumber,
        compareNumber,
        table;

    // Add number sorting plugin to Tablesort
    // https://gist.github.com/tristen/e79963856608bf54e046
    cleanNumber = function (i) {
      return i.replace(/[^\-?0-9.]/g, '');
    };
    compareNumber = function (a, b) {
      a = parseFloat(a);
      b = parseFloat(b);

      a = isNaN(a) ? 0 : a;
      b = isNaN(b) ? 0 : b;

      return a - b;
    };
    table = _el.querySelector('.' + id + ' .sortable');

    Tablesort.extend('number', item => {
      return item.match(/^-?[£\x24Û¢´€]?\d+\s*([,.]\d{0,2})/) || // Prefixed currency
        item.match(/^-?\d+\s*([,.]\d{0,2})?[£\x24Û¢´€]/) || // Suffixed currency
        item.match(/^-?(\d)*-?([,.]){0,1}-?(\d)+([E,e][-+][\d]+)?%?$/); // Number
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
    var eqid,
        featureId,
        features,
        isTextSelected,
        parent,
        selection;

    eqid = this.querySelector('.eqid').textContent;
    features = _app.Features.getFeatures();
    parent = this.closest('.feature');
    selection = window.getSelection();
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
    var height,
        mq,
        table,
        tr,
        wrapper;

    mq = window.matchMedia('(max-width: 735px)');
    table = this.closest('table');
    tr = this.closest('tr');
    height = tr.offsetHeight + 'px';
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
    var selected = _el.querySelector('.selected');

    if (selected) {
      selected.classList.remove('selected');
    }
  };

  /**
   * Update the timestamp.
   */
  _updateTimestamp = function () {
    var time,
        timestamp;

    time = document.getElementById('updated');
    timestamp = Luxon.DateTime.now().toFormat("ccc LLL d, yyyy 'at' tt") + // eslint-disable-line
      ' (' + _tz + ')';
    time.innerHTML = timestamp;
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

      // Render beachballs for FM, MT products
      if (Object.prototype.hasOwnProperty.call(feature, 'beachball')) {
        feature.beachball.render(_el.querySelector('.' + feature.id + ' a'));
        div.parentNode.classList.remove('hide'); // hidden if no ShakeMap, DYFI products
      }

      // Show content added to Mainshock section (i.e. not a "stand-alone" Feature)
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
        placeholder;

    // Some Features are rendered in an existing placeholder (in mainshock section)
    placeholder = _el.querySelector('.' + feature.id + '.placeholder');

    if (Object.prototype.hasOwnProperty.call(feature, 'summary') && !placeholder) {
      div = document.createElement('div');
      div.innerHTML = '<h2>' + feature.name + '<span class="breather">' +
        '<span></span></span></h2>';

      div.classList.add('feature', feature.id);

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


  _initialize(options);
  options = null;
  return _this;
};


module.exports = SummaryPane;
