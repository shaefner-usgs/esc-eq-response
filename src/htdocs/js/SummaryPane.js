'use strict';


var Moment = require('moment');


/**
 * Adds / removes summary info for selected event
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

      _addTimestamp,
      _updateTimestamp;


  _this = {};

  _initialize = function (options) {
    options = options || {};
    _el = options.el || document.createElement('div');

    _features = _el.querySelector('.features');

    _addTimestamp();
  };

  /**
   * Add timestamp to summary pane
   */
  _addTimestamp = function () {
    var time;

    time = document.createElement('time');
    _el.insertBefore(time, _features);
  };

  /**
   * Update timestamp
   */
  _updateTimestamp = function () {
    var time,
        timestamp;

    time = _el.querySelector('time');
    timestamp = Moment().format('ddd MMM D, YYYY [at] h:mm:ss A');

    time.innerHTML = timestamp;
  };

  /**
   * Add summary text to summary pane (text plus <div> container)
   *
   * @param opts {Object}
   *   {
   *     id: {String}, // id for container elem
   *     name: {String}, // Layer name
   *     summary: {Html} // Summary text
   *   }
   */
  _this.addSummary = function (opts) {
    var div;

    div = document.createElement('div');
    div.classList.add('feature');
    div.setAttribute('id', opts.id);
    div.innerHTML = '<h2>' + opts.name + '</h2>' + opts.summary;

    _features.appendChild(div);

    _updateTimestamp();
  };

  /**
   * Remove summary text from summary pane (text plus <div> container)
   *
   * @param el {Element}
   *     Element to remove
   */
  _this.removeSummary = function (el) {
    if (_el.contains(el)) {
      el.parentNode.removeChild(el);
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = SummaryPane;
