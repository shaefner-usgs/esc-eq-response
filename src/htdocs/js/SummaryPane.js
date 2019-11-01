'use strict';


var Tablesort = require('tablesort'),
    Xhr = require('util/Xhr');


/**
 * Set up and configure summary pane; also adds / removes summaries
 *
 * @param options {Object}
 *   {
 *     app: {Object}, // Application
 *     el: {Element}
 *   }
 *
 * @return _this {Object}
 *   {
 *     add: {Function},
 *     remove: {Function},
 *     reset: {Function}
 *   }
 */
var SummaryPane = function (options) {
  var _this,
      _initialize,

      _app,
      _el,
      _featuresEl,
      _style,
      _tz,

      _addListeners,
      _addSummaryButton,
      _addTimestamp,
      _getPostData,
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
    _featuresEl = _el.querySelector('.features');
    _style = document.createElement('style');
    _tz = _getTimeZone();

    // Add <style> tag for dynamic range input (slider) styles
    document.body.appendChild(_style);

    _addTimestamp();
  };

  /**
   * Add event listeners to input range sliders / earthquake lists
   *
   * @param el {Element}
   *     div el that contains list table(s), slider
   * @param magInclusive {Array}
   *     Array of eqs by magnitude (inclusive)
   */
  _addListeners = function (el, magInclusive) {
    var i,
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
      mag = el.querySelector('h3 .mag');
      num = el.querySelector('h3 .num');
      output = input.nextElementSibling;
      slider = input.parentNode;
      table = el.querySelector('div.filter + .eqlist');

      input.addEventListener('input', function () {
        magValue = Number(input.value);
        scrollY = window.pageYOffset;

        // Show / hide eqs in list and display slider's numeric value
        mag.innerHTML = magValue;
        num.innerHTML = magInclusive[magValue];
        output.value = magValue;
        slider.style.setProperty('--val', magValue);
        for (i = magValue; i <= input.getAttribute('max'); i ++) {
          table.classList.add('m' + i); // show eqs of mag i
        }
        for (j = magValue; j >= input.getAttribute('min'); j --) {
          table.classList.remove('m' + (j - 1)); // hide eqs of mag j-1
        }

        // Prevent page scrolling and update slider track
        window.scroll(0, scrollY);
        _setSliderStyles(this, input.id);
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
   * Add button to download Event Summary .rtf file
   *
   * @param div {Element}
   *     mainshock container
   */
  _addSummaryButton = function (div) {
    var button;

    button = document.createElement('button');
    button.classList.add('event-summary');
    button.innerText = 'Event Summary';
    button.type = 'button';

    button.addEventListener('click', function() {
      Xhr.ajax({
        data: _getPostData(),
        error: function(e, xhr) {
          console.error(xhr.statusText + xhr.responseText);
        },
        method: 'POST',
        success: function(data) {
          window.location = 'php/event-summary/download.php?file=' + data.file;
        },
        url: 'php/event-summary/rtf.php'
      });
    });

    div.appendChild(button);
  };

  /**
   * Add timestamp to summary pane
   */
  _addTimestamp = function () {
    var time;

    time = document.createElement('time');
    time.classList.add('updated');
    _el.insertBefore(time, _featuresEl);
  };

  /**
   * Get POST data key-value pairs used to create Event Summary RTF file
   *
   * @return data {Object}
   */
  _getPostData = function () {
    var data,
        dyfi,
        economic,
        fatalities,
        mainshock,
        pager,
        products,
        props,
        shakemap,
        summary;

    mainshock = _app.Features.getFeature('mainshock');
    products = mainshock.json.properties.products;
    props = mainshock.json.properties;

    if (products['general-text']) {
      summary = products['general-text'][0].contents[''].bytes;
    }
    if (products.losspager) {
      economic = products.losspager.contents['alertecon_smaller.png'].url;
      fatalities = products.losspager.contents['alertfatal_smaller.png'].url;
      pager = {
        alert: products.losspager.properties.alertlevel,
        economic: economic,
        fatalities: fatalities
      };
    }
    if (products.dyfi) {
      dyfi = products.dyfi[0].contents[products.dyfi[0].code + '_ciim_geo.jpg'].url;
    }
    if (products.shakemap) {
      if (products.shakemap[0].contents['download/tvmap.jpg']) {
        shakemap = products.shakemap[0].contents['download/tvmap.jpg'].url;
      } else if (products.shakemap[0].contents['download/intensity.jpg'].url) {
        shakemap = products.shakemap[0].contents['download/intensity.jpg'].url;
      }
    }

    // Must send empty string rather than javascript 'undefined' property
    data = {
      appUrl: window.location.href,
      depth: mainshock.json.geometry.coordinates[2],
      dyfi: dyfi || '',
      eqid: mainshock.json.id,
      eventPageUrl: mainshock.url,
      localTime: mainshock.localTime,
      mag: props.mag,
      magType: props.magType,
      pager: pager || '',
      place: props.place,
      shakemap: shakemap || '',
      summary: summary || '',
      title: props.title,
      utcTime: mainshock.utcTime
    };

    return data;
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
   * https://stackoverflow.com/questions/2897478/get-client-timezone-not-gmt-
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
   * Make table sortable via clickable headers
   *
   * @param id {String}
   *     Feature id
   */
  _initTableSort = function (id) {
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

    table = _el.querySelector('.' + id + ' .sortable');
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
        featureId,
        features,
        isTextSelected,
        parent,
        selection,
        tr;

    eqid = this.querySelector('.eqid').textContent;
    features = _app.Features.getFeatures();
    parent = this.closest('.feature');
    selection = window.getSelection();
    tr = e.target.parentNode;

    // Keep row highlighted (via css) after user clicks
    this.classList.add('selected');

    // Determine which Feature was clicked
    Object.keys(features).forEach(function(key) {
      if (parent.classList.contains(key)) {
        featureId = key;
      }
    });

    // Suppress click event if user is trying to select text
    isTextSelected = tr.contains(selection.anchorNode) &&
      selection.toString().length > 0;
    if (!isTextSelected) {
      _app.MapPane.openPopup(featureId, eqid);
    }
  };

  /**
   * Turn off 'selected' (previously clicked) row when user hovers over table
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
   * @param id {String}
   *     Feature id
   */
  _setSliderStyles = function (el, id) {
    var newRules,
        oldRules,
        value,
        vendorEls;

    newRules = '';
    oldRules = new RegExp('#' + id + '[^#]+', 'g');
    value = _getSliderValue(el);
    vendorEls = ['webkit-slider-runnable', 'moz-range'];

    for (var i = 0; i < vendorEls.length; i ++) {
      newRules += '#' + id + '::-' + vendorEls[i] +
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
      placeholder = _el.querySelector('div.' + feature.id);

      if (placeholder) { // add summary to existing placeholder if it exists
        placeholder.innerHTML = feature.summary;
        placeholder.classList.remove('hide');

        // Canvas elements (beachballs) are rendered before summary is added
        canvas = _el.querySelector('canvas.' + feature.id);
        if (canvas) { // move beachball into place (FM, MT features)
          placeholder.querySelector('a').appendChild(canvas);
        }
      } else { // or create new element and add title / summary
        title = feature.title || feature.name;

        div = document.createElement('div');
        div.classList.add('content', 'feature', feature.id);
        div.innerHTML = '<h2>' + title + '</h2>' + feature.summary;

        _featuresEl.appendChild(div);

        // Configure dynamic elements (sliders, table sorting) if present
        slider = div.querySelector('.slider input');
        table = div.querySelector('table.eqlist');
        if (slider) {
          _setSliderStyles(slider, feature.id); // set initial colored section of range slider
        }
        if (table) {
          _addListeners(div, feature.magInclusive);
          _initTableSort(feature.id);
        }
      }

      _updateTimestamp();
    }

    if (feature.id === 'mainshock') {
      _addSummaryButton(div);
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

    _featuresEl.innerHTML = '';
    _style.textContent = ''; // inline style for sliders
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = SummaryPane;
