'use strict';


var AppUtil = require('util/AppUtil'),
    Moment = require('moment'),
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
      _el,
      _featuresEl,
      _filterProps,
      _style,
      _tz,

      _addCount,
      _addListeners,
      _addTimestamp,
      _addTitleAttrs,
      _configTable,
      _filterList,
      _getSliderValue,
      _initTableSort,
      _openPopup,
      _setSliderStyles,
      _unselectRow,
      _updateTimestamp;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _el = options.el || document.createElement('div');
    _featuresEl = _el.querySelector('.features');
    _filterProps = {};
    _style = document.createElement('style');
    _tz = AppUtil.getTimeZone();

    // Add <style> tag for dynamic range input (slider) styles
    document.body.appendChild(_style);

    _addTimestamp();
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

    count = document.createElement('span');
    loader = div.querySelector('.breather');

    if (loader) {
      loader.classList.add('hide');
    }

    if (Object.prototype.hasOwnProperty.call(feature, 'count')) {
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
        trs;

    div = _el.querySelector('.' + id);
    input = div.querySelector('.slider input');
    tables = div.querySelectorAll('table.eqlist');

    // Filter earthquake list when user interacts with range slider
    if (input) {
      _filterProps[input.id] = {
        count: div.querySelector('h3 .count'),
        mag: div.querySelector('h3 .mag'),
        output: input.nextElementSibling,
        slider: input.parentNode,
        table: div.querySelector('div.filter + .eqlist')
      };

      input.addEventListener('input', _filterList);
    }

    // Show map and open popup when user clicks an earthquake in a list
    if (tables) {
      tables.forEach(table => {
        trs = table.querySelectorAll('tr');

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
   * Add a timestamp indicating the last update.
   */
  _addTimestamp = function () {
    var time = document.createElement('time');

    time.classList.add('updated');
    _el.insertBefore(time, _featuresEl);
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
    table = div.querySelector('table.eqlist');

    if (slider) {
      _setSliderStyles(slider, id); // set range slider to initial value
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
        threshold,
        scrollY;

    feature = _app.Features.getFeature(this.id);
    props = _filterProps[this.id];
    threshold = Number(this.value);
    scrollY = window.pageYOffset;

    props.count.innerHTML = feature.bins.mag[threshold];
    props.mag.innerHTML = threshold;
    props.output.value = threshold;

    props.slider.style.setProperty('--val', threshold);

    for (var i = threshold; i <= this.getAttribute('max'); i ++) {
      props.table.classList.add('m' + i); // show eqs at/above threshold
    }
    for (var j = threshold; j >= this.getAttribute('min'); j --) {
      props.table.classList.remove('m' + (j - 1)); // hide eqs below threshold
    }

    // Prevent page scrolling and update slider track
    window.scroll(0, scrollY);
    _setSliderStyles(this);
  };

  /**
   * Get the CSS value for the colored section of an <input> range slider.
   *
   * @param input {Element}
   *
   * @return value {String}
   */
  _getSliderValue = function (input) {
    var min,
        percentage,
        value;

    min = input.min || 0;
    percentage = input.value;
    if (input.max) {
      percentage = Math.floor(100 * (input.value - min) / (input.max - min));
    }
    value = percentage + '% 100%';

    return value;
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

    eqid = this.querySelector('.eventId').textContent;
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
   * Set dynamic, inline styles for colored section of input range sliders.
   *
   * @param input {Element}
   */
  _setSliderStyles = function (input) {
    var newRules,
        oldRules,
        value,
        vendorAttrs;

    newRules = '';
    oldRules = new RegExp('#' + input.id + '[^#]+', 'g');
    value = _getSliderValue(input);
    vendorAttrs = ['webkit-slider-runnable', 'moz-range'];

    vendorAttrs.forEach(attr => {
      newRules += '#' + input.id + '::-' + attr + '-track {background-size:' + value
        + ' !important}';
    });

    // Remove 'old' css rules first, then add new ones
    _style.textContent = _style.textContent.replace(oldRules, '');
    _style.appendChild(document.createTextNode(newRules));
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

    time = _el.querySelector('time');
    timestamp = Moment().format('ddd MMM D, YYYY [at] h:mm:ss A') +
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

      if (Object.prototype.hasOwnProperty.call(feature, 'beachball')) {
        feature.beachball.render(_el.querySelector('.' + feature.id + ' a'));
      }
      if (div.classList.contains('placeholder')) {
        div.classList.remove('hide'); // show content added to Mainshock
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
      div.innerHTML = '<h2>' + feature.name + '<div class="breather">' +
        '<div></div></div></h2>';

      div.classList.add('content', 'feature', feature.id);

      _featuresEl.appendChild(div);
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
    _featuresEl.innerHTML = '';
    _style.textContent = ''; // inline style for sliders
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = SummaryPane;
