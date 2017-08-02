'use strict';


var Moment = require('moment'),
    Tablesort = require('tablesort');


/**
 * Adds / removes summary info from summary pane
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
      _tz,

      _addTimestamp,
      _getBinnedTable,
      _getEqListTable
      _getTimeZone,
      _initTableSort,
      _updateTimestamp;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _el = options.el || document.createElement('div');
    _features = _el.querySelector('.features');
    _tz = _getTimeZone();

    _addTimestamp();
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
   * Get table containing binned earthquake data
   *
   * @param period {String <First | Past | Prior>}
   *      dependent on type (aftershocks/historical)
   *
   * @return html {Html}
   */
  _getBinnedTable = function (bins, period) {
    var html,
        total;

    html = '';
    if (bins[period] && bins[period].length > 0) {
      html = '<table class="bin">' +
        '<tr>' +
          '<th class="period">' + period + ':</th>' +
          '<th>Day</th>' +
          '<th>Week</th>' +
          '<th>Month</th>' +
          '<th>Year</th>' +
          '<th class="total">Total</th>' +
        '</tr>';
      bins[period].forEach(function(cols, mag) {
        html += '<tr><td class="rowlabel">M ' + mag + '</td>';
        cols.forEach(function(col, i) {
          if (i === 0) { // store total
            total = '<td class="total">' + col + '</td>';
          } else {
            html += '<td>' + col + '</td>';
          }
        });
        html += total + '</tr>'; // add total to table as last column
      });
      html += '</table>';
    }

    return html;
  };

  /**
   * Get table containing a list of earthquakes
   *
   * @param rows {Array}
   *
   * @return table {Html}
   */
  _getEqListTable = function (rows) {
    var note,
        sortClass,
        table,
        tableData;

    tableData = '';
    note = '<span class="star">* = local time at epicenter.</span>';
    if (_utc) {
      note += ' Using UTC when local time is not available.';
    }
    sortClass = 'non-sortable';

    if (rows && rows.length > 0) {
      // Eqs are ordered by time (ASC) for Leaflet; reverse for summary table
      rows.reverse();
      rows.forEach(function(row) {
        tableData += row;
      });
      if (rows.length > 1) {
        sortClass = 'sortable';
      }
      table = '<table class="' + sortClass + '">' +
          '<tr class="no-sort">' +
            '<th data-sort-method="number" data-sort-order="desc">Mag</th>' +
            '<th class="sort-up" data-sort-order="desc">Time</th>' +
            '<th class="location">Location</th>' +
            '<th class="distance" data-sort-method="number">' +
              '<abbr title="Distance and direction from mainshock">Distance</abbr>' +
            '</th>' +
            '<th data-sort-method="number">Depth</th>' +
          '</tr>' +
          tableData +
        '</table>';

      table += '<p class="note">' + note + '</p>';
    } else {
      table = '<p>None.</p>';
    }

    return table;
  };

  /**
   * Get eqs html for summary pane
   *
   * @return summary {Html}
   */
  _getSummary = function () {
    var summary;

    if (_id === 'mainshock') {
      summary = _mainshock.summary;
    }
    else {
      if (_id === 'aftershocks') {
        summary = '<div class="bins">';
        summary += _getBinnedTable('First');
        summary += _getBinnedTable('Past');
        summary += '</div>';
        summary += '<h3>Most Recent Aftershock</h3>';
        summary += _getEqListTable(_lastAftershock);
      }
      else if (_id === 'historical') {
        summary = _getBinnedTable('Prior');
      }

      summary += '<h3>M ' + Math.max(_threshold[_id],
        AppUtil.getParam(_id + '-minmag')) + '+ Earthquakes (' + _eqList.length +
        ')</h3>';
      summary += _getEqListTable(_eqList);
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

  /*
   * Make table sortable
   *
   * @param id {String}
   *     id value of container elem
   */
  _initTableSort = function (id) {
    var table,
        cleanNumber,
        compareNumber,
        cssClass;

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

    cssClass = id;
    table = _el.querySelector('.' + cssClass + ' .sortable');
    if (table) {
      new Tablesort(table);
    }
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
   * Add summary text to summary pane (text plus <div> container)
   *   (called by Features.js)
   *
   * @param opts {Object}
   *   {
   *     id: {String}, // used for css class on container elem
   *     name: {String}, // feature name
   *     summary: {Html} // summary text
   *   }
   */
  _this.addSummary = function (opts) {
    var cssClass,
        div;

    cssClass = opts.id;
    div = document.createElement('div');
    div.classList.add('content', 'feature', cssClass);
    div.innerHTML = '<h2>' + opts.name + '</h2>' + opts.summary;

    _features.appendChild(div);

    if (opts.id === 'aftershocks') {
      div.classList.add('darker');
    } else {
      div.classList.add('lighter');
    }

    _updateTimestamp();
    _initTableSort(cssClass);
  };

  /**
   * Remove summary text from summary pane (text plus <div> container)
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
   * Reset timestamp
   */
  _this.resetTimeStamp = function () {
    var time;

    time = _el.querySelector('time');
    time.innerHTML = '';
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = SummaryPane;
