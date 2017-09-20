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
      _tz,

      _addTimestamp,
      _getBinnedTable,
      _getListTable,
      _getSummary,
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
   * @param bins {Object}
   *     earthquake data binned by mag/time
   * @param period {String <First | Past | Prior>}
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
   * Get table containing a list of earthquakes above mag threshold
   *
   * @param rows {Object}
   *     tr html for each earthquake in list keyed by eqid
   * @param magThreshold {Number}
   *
   * @return {Object}
   */
  _getListTable = function (rows, magThreshold) {
    var count,
        html,
        length,
        mag,
        row,
        sortClass,
        tableData;

    count = 0;
    length = Object.keys(rows).length;
    sortClass = 'non-sortable';
    tableData = '';

    if (length > 0) {
      Object.keys(rows).forEach(function(key) {
        row = rows[key];
        mag = /tr\s+class="m(\d+)"/.exec(row);
        if (!magThreshold || mag[1] >= magThreshold) {
          count ++;
          tableData += row;
        }
      });
      if (count > 1) {
        sortClass = 'sortable';
      }
      html = '<table class="' + sortClass + '">' +
          '<tr class="no-sort">' +
            '<th data-sort-method="number" data-sort-order="desc">Mag</th>' +
            '<th data-sort-order="desc" class="sort-default">Time (UTC)</th>' +
            '<th class="location">Location</th>' +
            '<th class="distance" data-sort-method="number">' +
              '<abbr title="Distance and direction from mainshock">Distance</abbr>' +
            '</th>' +
            '<th data-sort-method="number">Depth</th>' +
          '</tr>' +
          tableData +
        '</table>';
    }
    if (count === 0) {
      html = '<p>None.</p>';
    }

    return {
      count: count,
      html: html
    };
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
    var data,
        id,
        listTable,
        subheader,
        summary;

    data = opts.data;
    id = opts.id;

    summary = '<h2>' + opts.name + '</h2>';
    summary += data.detailsHtml;

    if (id === 'mainshock') {
      // Add placeholders; beachballs are actually added in addSummary()
      summary += '<div class="focal-mechanism"></div>';
      summary += '<div class="moment-tensor"></div>';
    }

    if (id === 'aftershocks' || id === 'historical') {
      if (id === 'aftershocks') {
        summary += '<div class="bins">';
        summary += _getBinnedTable(data.bins, 'First');
        summary += _getBinnedTable(data.bins, 'Past');
        summary += '</div>';
        if (data.lastId) {
          summary += '<h3>Most Recent Aftershock</h3>';
          summary += _getListTable({
            lastAftershock: data.list[data.lastId]
          }, false).html;
        }
      }
      if (id === 'historical') {
        summary += _getBinnedTable(data.bins, 'Prior');
      }

      listTable = _getListTable(data.list, data.magThreshold);
      subheader = 'M ' + Math.max(data.magThreshold,
        AppUtil.getParam(id + '-minmag')) + '+ Earthquakes';
      if (listTable.count !== 0) {
        subheader += ' (' + listTable.count + ')';
      }
      summary += '<h3>' + subheader + '</h3>';
      summary += listTable.html;
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
   * @param cssClass {String}
   *     cssClass value of container elem
   */
  _initTableSort = function (cssClass) {
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
    var cssClass,
        data,
        div,
        el,
        focalMechanism,
        momentTensor;

    cssClass = opts.id;
    data = opts.data;

    div = document.createElement('div');
    div.classList.add('content', 'feature', cssClass);
    div.innerHTML = _getSummary(opts);
    _features.appendChild(div);

    if (opts.id === 'mainshock') {
      focalMechanism = data.focalMechanism;
      momentTensor = data.momentTensor;

      if (focalMechanism) {
        el = _el.querySelector('.focal-mechanism');
        focalMechanism.render(el);
      }
      if (momentTensor) {
        el = _el.querySelector('.moment-tensor');
        momentTensor.render(el);
      }
    }

    if (opts.id === 'aftershocks') {
      div.classList.add('darker');
    } else {
      div.classList.add('lighter');
    }

    _updateTimestamp();
    _initTableSort(cssClass);
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
