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

      _MapPane,

      _addListeners,
      _addTimestamp,
      _clickRow,
      _getBinnedTable,
      _getListTable,
      _getSummary,
      _getTimeZone,
      _hoverRow,
      _initTableSort,
      _updateTimestamp;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _el = options.el || document.createElement('div');
    _features = _el.querySelector('.features');
    _tz = _getTimeZone();

    _MapPane = options.mapPane;

    _addTimestamp();
  };

  /**
   * Add event listeners to earthquake lists
   *
   * @param el {Element}
   *     div el that contains list table(s)
   */
  _addListeners = function (el) {
    var i,
        j,
        rows,
        tables;

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
   * @param period {String <First | Past | Prior>}
   *
   * @return html {Html}
   */
  _getBinnedTable = function (bins, period) {
    var html,
        irow,
        row,
        total,
        totalAll;

    html = '';
    if (bins[period] && bins[period].length > 0) {
      html = '<table class="bin">' +
        '<tr>' +
          '<th class="period">' + period + ':</th>' +
          '<th>Day</th>' +
          '<th>Week</th>' +
          '<th>Month</th>' +
          '<th class="year">Year</th>' +
          '<th>Total</th>' +
        '</tr>';
      bins[period].forEach(function(cols, mag) {
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
      html += '<tr class="totals">' +
        '<th class="rowlabel">Total</th>';

      for (row=0; row < bins[period].length; ++row) { // get column indices
        if (typeof bins[period][row] !== 'undefined') {
          break;
        }
      }
      if (row < bins[period].length) { // if found valid row
        totalAll = 0;
        bins[period][row].forEach(function(cols, index) {
          total = 0;
          for (irow=0; irow < bins[period].length; ++irow) {
            if (typeof bins[period][irow] !== 'undefined') {
              if (index === 0) { // row total (last column)
                totalAll += bins[period][irow][index];
              } else {
                total += bins[period][irow][index];
              }
            }
          }
          if (index > 0) {
            html += '<td>' + total + '</td>';
          }
        });
        html += '<td>' + totalAll + '</td>';
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
        if (!magThreshold || parseInt(mag[1], 10) >= magThreshold) {
          count ++;
          tableData += row;
        }
      });
      if (count > 1) {
        sortClass = 'sortable';
      }
      html = '<table class="list ' + sortClass + '">' +
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
      summary += '<div class="focal-mechanism hide">' +
        '<a href="' + url + '#focal-mechanism"><h4></h4></a></div>';
      summary += '<div class="moment-tensor hide">' +
        '<a href="' + url + '#moment-tensor"><h4></h4></a></div>';

      // Add dyfi/sm thumbnails
      if (data.dyfi) {
        summary += '<div class="dyfi"><a href="' + url + '#dyfi">' +
        '<h4>Did You Feel It?</h4><img src="' + data.dyfi + '" /></a></div>';
      }
      if (data.shakemap) {
        summary += '<div class="shakemap"><a href="' + url + '#shakemap">' +
        '<h4>ShakeMap</h4><img src="' + data.shakemap + '" /></a></div>';
      }

      summary += '</div>';
    } else {
      summary += data.detailsHtml;
    }

    if (id === 'aftershocks' || id === 'foreshocks' || id === 'historical') {
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
      if (id === 'historical' || id === 'foreshocks') {
        summary += _getBinnedTable(data.bins, 'Prior');
      }

      listTable = _getListTable(data.list, data.magThreshold);
      subheader = 'M ' + Math.max(data.magThreshold,
        AppUtil.getParam(AppUtil.lookup(id) + '-mag')) + '+ Earthquakes';
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
        summary;

    className = opts.id;
    data = opts.data;
    summary = _getSummary(opts);

    // Add feature to summary
    if (summary) {
      div = document.createElement('div');
      div.classList.add('content', 'feature', 'lighter', className);
      div.innerHTML = summary;
      _features.appendChild(div);

      _addListeners(div);
      _initTableSort(className);
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
   * Reset timestamp
   */
  _this.reset = function () {
    var time;

    time = _el.querySelector('time');
    time.innerHTML = '';
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = SummaryPane;
