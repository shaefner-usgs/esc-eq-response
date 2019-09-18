'use strict';


var Tablesort = require('tablesort');


/**
 * Add and remove Features from summary pane and set up javascript interactions
 *
 * @param options {Object}
 *   {
 *     app: {Object}, // Application
 *     el: {Element}
 *   }
 */
var SummaryPane = function (options) {
  var _this,
      _initialize,

      _app,
      _el,
      _features,
      _style,
      _tz,

      _addListeners,
      _addTimestamp,
      _getSliderValue,
      _getTimeZone,
      _initTableSort,
      _onMouseClick,
      _onMouseOver,
      _setSliderStyles,
      _updateTimestamp;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _el = options.el || document.createElement('div');
    _features = _el.querySelector('.features');
    _style = document.createElement('style');
    _tz = _getTimeZone();

    // Add <style> tag for dynamic range input (slider) styles
    document.body.appendChild(_style);

    _addTimestamp();
  };

  /**
   * Add event listeners to earthquake lists / input range sliders
   *
   * @param el {Element}
   *     div el that contains list table(s), slider
   * @param sliderData {Array}
   *     Array of cumulative eqs by mag
   */
  _addListeners = function (el, sliderData) {
    var feature,
        i,
        input,
        j,
        mag,
        magValue,
        num,
        output,
        rows,
        scrollY,
        slider,
        table,
        tables;

    input = el.querySelector('.slider input');
    if (input) {
      feature = input.id;
      mag = el.querySelector('h3 .mag');
      num = el.querySelector('h3 .num');
      output = input.nextElementSibling;
      slider = input.parentNode;
      table = el.querySelector('div.filter + .eqlist');

      input.addEventListener('input', function() {
        magValue = Number(input.value);
        scrollY = window.pageYOffset;

        mag.innerHTML = magValue;
        num.innerHTML = sliderData[magValue];
        output.value = magValue;
        slider.style.setProperty('--val', magValue);
        for (i = magValue; i <= input.getAttribute('max'); i ++) {
          table.classList.add('m' + i);
        }
        for (j = magValue; j >= input.getAttribute('min'); j --) {
          table.classList.remove('m' + (j - 1));
        }

        window.scroll(0, scrollY); // prevent page scrolling
        _setSliderStyles(this, feature); // update slider track
      }, false);
    }

    tables = el.querySelectorAll('table.eqlist');
    if (tables) {
      for (i = 0; i < tables.length; i ++) {
        rows = tables[i].rows;
        for (j = 1; j < rows.length; j ++) {
          rows[j].addEventListener('click', _onMouseClick);
          rows[j].addEventListener('mouseover', _onMouseOver);
        }
      }
    }
  };

  /**
   * Add timestamp to summary pane
   */
  _addTimestamp = function () {
    var time;

    time = document.createElement('time');
    time.classList.add('updated');
    _el.insertBefore(time, _features);
  };

  /**
   * Get CSS value (percentage) for colored section of input range slider
   *
   * @param el {Element}
   *     input (range slider) element
   *
   * @return value {String}
   */
  _getSliderValue = function (el) {
    var min,
        percentage,
        value;

    min = el.min || 0;
    percentage = el.value;
    if (el.max) {
      percentage = Math.floor(100 * (el.value - min) / (el.max - min));
    }
    value = percentage + '% 100%';

    return value;
  };

  /**
   * Get timezone of user's device
   * http://stackoverflow.com/questions/2897478/get-client-timezone-not-gmt-
   *  offset-amount-in-js/12496442#12496442
   *
   * @return tz {String}
   *     PST, CST, etc
   */
  _getTimeZone = function () {
    var now,
        tz;

    now = new Date().toString();
    try {
      if (now.indexOf('(') > -1) {
        tz = now.match(/\([^\)]+\)/)[0].match(/[A-Z]/g).join('');
      } else {
        tz = now.match(/[A-Z]{3,4}/)[0];
      }

      if (tz === 'GMT' && /(GMT\W*\d{4})/.test(now)) {
        tz = RegExp.$1;
      }
    }
    catch (error) {
      console.error(error);
    }

    return tz;
  };

  /**
   * Make table sortable by clicking header values
   *
   * @param className {String}
   *     className of container elem (Feature id)
   */
  _initTableSort = function (className) {
    var table,
        cleanNumber,
        compareNumber;

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
    Tablesort.extend('number', function(item) {
      return item.match(/^-?[£\x24Û¢´€]?\d+\s*([,\.]\d{0,2})/) || // Prefixed currency
        item.match(/^-?\d+\s*([,\.]\d{0,2})?[£\x24Û¢´€]/) || // Suffixed currency
        item.match(/^-?(\d)*-?([,\.]){0,1}-?(\d)+([E,e][\-+][\d]+)?%?$/); // Number
      }, function(a, b) {
        a = cleanNumber(a);
        b = cleanNumber(b);
        return compareNumber(b, a);
    });

    table = _el.querySelector('.' + className + ' .sortable');
    if (table) {
      new Tablesort(table);
    }
  };

  /**
   * Click handler for lists of earthquakes
   *
   * @param e {Event}
   */
  _onMouseClick = function (e) {
    var eqid,
        feature,
        features,
        isTextSelected,
        parent,
        selection,
        tr;

    eqid = this.querySelector('.eqid').textContent;

    // Keep row highlighted after user clicks
    this.classList.add('selected');

    // Determine which Feature was clicked
    features = [
      'aftershocks',
      'foreshocks',
      'historical',
      'mainshock'
    ];
    parent = this.closest('.feature');
    features.forEach(function(f) {
      if (parent.classList.contains(f)) {
        feature = f;
      }
    });

    // Suppress event if user is trying to select text
    selection = window.getSelection();
    tr = e.target.parentNode;
    isTextSelected = tr.contains(selection.anchorNode) &&
      selection.toString().length > 0;

    if (!isTextSelected) {
      _app.MapPane.openPopup(feature, eqid);
    }
  };

  /**
   * Turn off 'selected' row when user hovers over any row
   */
  _onMouseOver = function () {
    var selected;

    selected = _el.querySelector('.selected');
    if (selected) {
      selected.classList.remove('selected');
    }
  };

  /**
   * Set dynamic styles (inline) for colored section of input range sliders
   *
   * @param el {Element}
   *     input (range slider) element
   * @param feature {Object}
   */
  _setSliderStyles = function (el, feature) {
    var newRules,
        oldRules,
        value,
        vendorEls;

    newRules = '';
    oldRules = new RegExp('#' + feature + '[^#]+', 'g');
    value = _getSliderValue(el);
    vendorEls = ['webkit-slider-runnable', 'moz-range'];

    for (var i = 0; i < vendorEls.length; i ++) {
      newRules += '#' + feature + '::-' + vendorEls[i] +
        '-track { background-size:' + value + ' !important}';
    }

    // Remove 'old' css rules first, then add new ones
    _style.textContent = _style.textContent.replace(oldRules, '');
    _style.appendChild(document.createTextNode(newRules));
  };

  /**
   * Update timestamp
   */
  _updateTimestamp = function () {
    var time,
        timestamp;

    time = _el.querySelector('time');
    timestamp = _app.AppUtil.Moment().format('ddd MMM D, YYYY [at] h:mm:ss A') +
      ' (' + _tz + ')';

    time.innerHTML = timestamp;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add a Feature to summary pane
   *
   * @param feature {Object}
   */
  _this.add = function (feature) {
    var canvas,
        div,
        placeholder,
        slider,
        table,
        title;

    if (feature.summary) {
      canvas = _el.querySelector('canvas.' + feature.id);
      placeholder = _el.querySelector('div.' + feature.id);

      if (placeholder) { // add summary to placeholder
        placeholder.innerHTML = feature.summary;
        placeholder.classList.remove('hide');
        if (canvas) { // move beachball into place
          placeholder.querySelector('a').appendChild(canvas);
        }
      } else { // create parent element and add title / summary
        title = feature.title || feature.name;

        div = document.createElement('div');
        div.classList.add('content', 'feature', feature.id);
        div.innerHTML = '<h2>' + title + '</h2>' + feature.summary;

        _features.appendChild(div);

        // Configure dynamic elements (sliders, table sorting) if present
        slider = div.querySelector('.slider input');
        table = div.querySelector('table.eqlist');
        if (slider) {
          _setSliderStyles(slider, feature.id); // set initial colored section of range slider
        }
        if (table) {
          _addListeners(div, feature.sliderData);
          _initTableSort(feature.id);
        }
      }

      _updateTimestamp();
    }
  };

  /**
   * Remove a Feature from summary pane
   *
   * @param feature {Object}
   */
  _this.remove = function (feature) {
    var el;

    el  = _el.querySelector('.' + feature.id);

    if (el) {
      el.parentNode.removeChild(el);
    }
  };

  /**
   * Reset summary pane to initial state
   */
  _this.reset = function () {
    var time;

    time = _el.querySelector('time');
    time.innerHTML = '';

    _features.innerHTML = '';
    _style.textContent = ''; // inline style for sliders
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = SummaryPane;
