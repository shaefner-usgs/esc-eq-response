'use strict';


var Tablesort = require('tablesort');


/**
 * Creates, adds, and removes summary info from summary pane
 *
 * @param options {Object}
 *   {
 *     app: {Object}, // application props / methods
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
      _clickRow,
      _getTimeZone,
      _getValue,
      _hoverRow,
      _initTableSort,
      _setStyleRules,
      _updateTimestamp;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _el = options.el || document.createElement('div');
    _features = _el.querySelector('.features');
    _style = document.createElement('style');
    _tz = _getTimeZone();

    // Dynamic range input styles are set inside this <style> tag
    document.body.appendChild(_style);

    _addTimestamp();
  };

  /**
   * Add event listeners to earthquake lists / input range sliders
   *
   * @param el {Element}
   *     div el that contains list table(s), slider
   * @param cumulativeEqs {Array}
   *     Array of cumulative eqs by mag
   */
  _addListeners = function (el, cumulativeEqs) {
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
        num.innerHTML = cumulativeEqs[magValue];
        output.value = magValue;
        slider.style.setProperty('--val', magValue);
        for (i = magValue; i <= input.getAttribute('max'); i ++) {
          table.classList.add('m' + i);
        }
        for (j = magValue; j >= input.getAttribute('min'); j --) {
          table.classList.remove('m' + (j - 1));
        }

        window.scroll(0, scrollY); // prevent page scrolling
        _setStyleRules(this, feature); // update slider track
      }, false);
    }

    tables = el.querySelectorAll('table.eqlist');
    if (tables) {
      for (i = 0; i < tables.length; i ++) {
        rows = tables[i].rows;
        for (j = 1; j < rows.length; j ++) {
          rows[j].addEventListener('click', _clickRow);
          rows[j].addEventListener('mouseover', _hoverRow);
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
   * Click handler for lists of earthquakes
   *
   * @param e {Event}
   */
  _clickRow = function(e) {
    var eqid,
        feature,
        features,
        isTextSelected,
        parent,
        selection,
        tr;

    // Keep row highlighted after user clicks
    this.classList.add('selected');

    eqid = this.querySelector('.eqid').textContent;

    // Determine which feature was clicked
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

    selection = window.getSelection();
    tr = e.target.parentNode;
    isTextSelected = tr.contains(selection.anchorNode) &&
      selection.toString().length > 0;

    if(!isTextSelected) { // suppress event if user is trying to select text
      _app.MapPane.openPopup(feature, eqid);
    }
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
   * Get CSS value (percentage) for colored section of input range slider
   *
   * @param el {Element}
   * @param p {Number}
   *
   * @return value {String}
   */
  _getValue = function (el, p) {
    var min,
        perc,
        value;

    min = el.min || 0;
    perc = p;
    if (el.max) {
      perc = Math.floor(100 * (p - min) / (el.max - min));
    }
    value = perc + '% 100%';

    return value;
  };

  /**
   * Turn off selected row when user hovers over any row
   */
  _hoverRow = function () {
    var selected;

    selected = _el.querySelector('.selected');
    if (selected) {
      selected.classList.remove('selected');
    }
  };

  /**
   * Make table sortable
   *
   * @param className {String}
   *     className value of container elem
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
   * Set dynamic styles (inline) for colored section of input range sliders
   *
   * @param el {Element}
   *     input element
   * @param feature {String}
   *     feature id
   */
  _setStyleRules = function (el, feature) {
    var newRules,
        oldRules,
        value,
        vendorEls;

    newRules = '';
    oldRules = new RegExp('#' + feature + '[^#]+', 'g');
    value = _getValue(el, el.value);
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
   * Add feature to summary pane
   *
   * @param feature {Object}
   */
  _this.add = function (feature) {
    var className,
        div,
        input,
        table;

    className = feature.id;

    // Add feature to summary
    if (feature.summary) {
      div = document.createElement('div');
      div.classList.add('content', 'lighter', 'feature', className);
      div.innerHTML = '<h2>' + feature.name + '</h2>' + feature.summary;
      _features.appendChild(div);

      table = div.querySelector('table.eqlist');
      if (table) {
        input = div.querySelector('input');
        _addListeners(div, feature.sliderData);
        _initTableSort(className);
        // Set initial colored section of range slider
        if (input) {
          _setStyleRules(input, className);
        }
      }

      _updateTimestamp();
    }
  };

  /**
   * Remove feature from summary pane
   *
   * @param el {Element}
   *     Element to remove
   */
  _this.remove = function (el) {
    if (_el.contains(el)) {
      el.parentNode.removeChild(el);
    }
  };

  /**
   * Reset pane to initial state
   */
  _this.reset = function () {
    var time;

    time = _el.querySelector('time');
    time.innerHTML = '';

    _features.innerHTML = '';
    _style.textContent = '';
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = SummaryPane;
