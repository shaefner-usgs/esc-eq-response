'use strict';


var AppUtil = require('AppUtil'),
    Moment = require('moment'),
    Tablesort = require('tablesort');


/**
 * Creates, adds, and removes summary info from summary pane
 *
 * @param options {Object}
 *   {
 *     el: {Element}
 *   }
 */
var SummaryPane = function (options) {
  var _this,
      _initialize,

      _el,
      _features,
      _style,
      _tz,

      _MapPane,

      _addListeners,
      _addTimestamp,
      _clickRow,
      _getBinnedTable,
      _getListTable,
      _getSlider,
      _getSummary,
      _getTimeZone,
      _getValue,
      _hoverRow,
      _initTableSort,
      _setStyleRules,
      _updateTimestamp;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _el = options.el || document.createElement('div');
    _features = _el.querySelector('.features');
    _style = document.createElement('style');
    _tz = _getTimeZone();

    _MapPane = options.mapPane;

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
      table = el.querySelector('div.filter + .list');

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

    tables = el.querySelectorAll('table.list');
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
      _MapPane.openPopup(feature, eqid);
    }
  };

  /**
   * Get table containing binned earthquake data
   *
   * @param bins {Object}
   *     earthquake data binned by mag/time
   * @param type {String <magInclusive | first | past | prior>}
   *
   * @return html {Html}
   */
  _getBinnedTable = function (bins, type) {
    var html,
        irow,
        row,
        total,
        totalAll;

    html = '';
    if (bins[type] && bins[type].length > 0) {
      html = '<table class="bin">' +
        '<tr>' +
          '<th class="period">' + type + ':</th>' +
          '<th>Day</th>' +
          '<th>Week</th>' +
          '<th>Month</th>' +
          '<th class="year">Year</th>' +
          '<th>Total</th>' +
        '</tr>';
      bins[type].forEach(function(cols, mag) {
        html += '<tr><th class="rowlabel">M ' + mag + '</th>';
        cols.forEach(function(col, i) {
          if (i === 0) { // store row total
            total = '<td class="total">' + col + '</td>';
          } else {
            html += '<td>' + col + '</td>';
          }
        });
        html += total + '</tr>'; // add row total to table as last column
      });

      // Add total for each column as last row
      html += '<tr>' +
        '<th class="rowlabel">Total</th>';

      for (row = 0; row < bins[type].length; ++row) { // get column indices
        if (typeof bins[type][row] !== 'undefined') {
          break;
        }
      }
      if (row < bins[type].length) { // if found valid row
        totalAll = 0;
        bins[type][row].forEach(function(cols, index) {
          total = 0;
          for (irow = 0; irow < bins[type].length; ++irow) {
            if (typeof bins[type][irow] !== 'undefined') {
              if (index === 0) { // row total (last column)
                totalAll += bins[type][irow][index];
              } else {
                total += bins[type][irow][index];
              }
            }
          }
          if (index > 0) {
            html += '<td class="total">' + total + '</td>';
          }
        });
        html += '<td class="total">' + totalAll + '</td>';
        html += '</tr>';
      }
      html += '</table>';
    }

    return html;
  };

  /**
   * Get table containing a list of earthquakes above mag threshold
   *
   * @param rows {Object}
   *     tr html for each earthquake in list keyed by eqid
   * @param magThreshold {Number}
   *
   * @return html {String}
   */
  _getListTable = function (rows, magThreshold) {
    var cssClasses,
        html,
        length,
        mag,
        match,
        row,
        sortClass,
        tableData;

    cssClasses = ['list'];
    length = Object.keys(rows).length;
    sortClass = 'non-sortable';
    tableData = '';

    Object.keys(rows).forEach(function(key) {
      row = rows[key];

      match = /tr\s+class="m(\d+)"/.exec(row);
      mag = parseInt(match[1], 10);
      if (mag >= magThreshold && cssClasses.indexOf('m' + mag) === -1) {
        cssClasses.push('m' + mag);
      }

      tableData += row;
    });
    if (length > 1) {
      cssClasses.push('sortable');
    }
    html = '<table class="' + cssClasses.join(' ') + '">' +
        '<tr class="no-sort">' +
          '<th data-sort-method="number" data-sort-order="desc">Mag</th>' +
          '<th data-sort-order="desc" class="sort-default">Time (UTC)</th>' +
          '<th class="location">Location</th>' +
          '<th data-sort-method="number">Depth</th>' +
          '<th data-sort-method="number">' +
            '<abbr title="Distance and direction from mainshock">Distance</abbr>' +
          '</th>' +
          '<th class="eqid">Event ID</th>' +
        '</tr>' +
        tableData +
      '</table>';

    return html;
  };

  /**
   * Get html for input range slider when there's at least two mag bins w/ eqs
   *
   * @param id {String}
   *     feature id
   * @param mag {Number}
   * @param cumulativeEqs {Array}
   *     Array of cumulative eqs by mag
   *
   * @return html {String}
   */
  _getSlider = function (id, mag, cumulativeEqs) {
    var html,
        mags,
        max,
        min,
        singleMagBin;

    html = '';
    singleMagBin = cumulativeEqs.every(function(value, i, array) {
      return array[0] === value;
    });

    if (!singleMagBin) {
      mags = Object.keys(cumulativeEqs);
      max = Math.max.apply(null, mags);
      min = Math.floor(AppUtil.getParam(AppUtil.lookup(id) + '-mag'));

      html += '<div class="filter">';
      html += '<h4>Filter earthquakes by magnitude</h4>';
      html += '<div class="min">' + min + '</div>';
      html += '<div class="inverted slider" style="--min: ' + min +
        '; --max: ' + max + '; --val: ' + mag + ';">';
      html += '<input id="' + id + '" type="range" min="' + min + '" max="' +
        max + '" value="' + mag + '"/>';
      html += '<output for="'+ id + '">' + mag + '</output>';
      html += '</div>';
      html += '<div class="max">' + max + '</div>';
      html += '</div>';
    }

    return html;
  };

  /**
   * Get summary html for feature
   *
   * @param opts {Object}
   *   {
   *     data: {Object}, // summary data
   *     id: {String}, // used for css class on container elem
   *     name: {String} // feature name
   *   }
   *
   * @return summary {Html}
   */
  _getSummary = function (opts) {
    var count,
        data,
        id,
        mag,
        subheader,
        summary,
        url;

    data = opts.data;
    id = opts.id;

    if (id === 'focal-mechanism' || id === 'moment-tensor') {
      var beachball,
          className,
          h4;

      beachball = opts.data;
      className = '.' + id;
      h4 = _el.querySelector(className + ' h4');

      // Display beachball
      beachball.render(_el.querySelector(className + ' a'));
      h4.innerHTML = opts.name;
      _el.querySelector(className).classList.remove('hide');

      return;
    }

    summary = '<h2>' + opts.name + '</h2>';

    if (id === 'mainshock') {
      url = 'https://earthquake.usgs.gov/earthquakes/eventpage/' +
        AppUtil.getParam('eqid');

      summary += '<div class="products">';
      summary += data.detailsHtml;

      // Add placeholders for beachballs
      summary += '<div class="focal-mechanism hide scale">' +
        '<a href="' + url + '#focal-mechanism"><h4></h4></a></div>';
      summary += '<div class="moment-tensor hide scale">' +
        '<a href="' + url + '#moment-tensor"><h4></h4></a></div>';

      // Add dyfi/sm thumbnails
      if (data.dyfi) {
        summary += '<div class="dyfi scale"><a href="' + url + '#dyfi">' +
          '<h4>Did You Feel It?</h4><img src="' + data.dyfi.url + '" class="mmi' +
          data.dyfi.cdi + '" /></a></div>';
      }
      if (data.shakemap) {
        summary += '<div class="shakemap scale"><a href="' + url + '#shakemap">' +
          '<h4>ShakeMap</h4><img src="' + data.shakemap.url + '" class="mmi' +
          data.shakemap.mmi + '" /></a></div>';
      }

      summary += '</div>';
    } else {
      summary += data.detailsHtml;
    }

    if (id === 'aftershocks' || id === 'foreshocks' || id === 'historical') {
      count = Object.keys(opts.data.list).length;
      if (count > 0) {
        mag = Math.floor(Math.max(data.magThreshold,
          AppUtil.getParam(AppUtil.lookup(id) + '-mag')));

        // Check if there's eq data for mag threshold; if not, decr mag by 1
        while (!data.bins.magInclusive[mag]) {
          mag --;
        }

        if (id === 'aftershocks') {
          summary += '<div class="bins">';
          summary += _getBinnedTable(data.bins, 'first');
          summary += _getBinnedTable(data.bins, 'past');
          summary += '</div>';
          summary += data.probabilities;
          if (data.lastId && count > 1) {
            summary += '<h3>Most Recent Aftershock</h3>';
            summary += _getListTable({
              lastAftershock: data.list[data.lastId]
            }, false);
          }
        }
        if (id === 'historical' || id === 'foreshocks') {
          summary += _getBinnedTable(data.bins, 'prior');
        }

        subheader = 'M <span class="mag">' + mag + '</span>+ Earthquakes';
        subheader += ' (<span class="num">' + data.bins.magInclusive[mag] +
          '</span>)';
        summary += '<h3>' + subheader + '</h3>';
        summary += _getSlider(id, mag, data.bins.magInclusive);
        summary += _getListTable(data.list, mag);
      }
    }

    return summary;
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

  /*
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
    timestamp = Moment().format('ddd MMM D, YYYY [at] h:mm:ss A') +
      ' (' + _tz + ')';

    time.innerHTML = timestamp;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add feature to summary pane (text plus <div> container)
   *   (called by Features.js)
   *
   * @param opts {Object}
   *   {
   *     data: {Object}, // summary data
   *     id: {String}, // used for css class on container elem
   *     name: {String} // feature name
   *   }
   */
  _this.addSummary = function (opts) {
    var className,
        data,
        div,
        input,
        summary,
        table;

    className = opts.id;
    data = opts.data;
    summary = _getSummary(opts);

    // Add feature to summary
    if (summary) {
      div = document.createElement('div');
      div.classList.add('content', 'lighter', 'feature', className);
      div.innerHTML = summary;
      _features.appendChild(div);

      table = div.querySelector('table.list');
      if (table) {
        input = div.querySelector('input');
        _addListeners(div, data.bins.magInclusive);
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
   * Remove feature from summary pane (including container)
   *   (called by Features.js)
   *
   * @param el {Element}
   *     Element to remove
   */
  _this.removeSummary = function (el) {
    if (_el.contains(el)) {
      el.parentNode.removeChild(el);
    }
  };

  /**
   * Reset timestamp, inline styles for range inputs
   */
  _this.reset = function () {
    var time;

    time = _el.querySelector('time');
    time.innerHTML = '';

    _style.textContent = '';
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = SummaryPane;
