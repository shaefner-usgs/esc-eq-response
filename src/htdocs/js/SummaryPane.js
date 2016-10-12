'use strict';


var Moment = require('Moment');


/**
 * Summary pane - adds / removes summary info for selected event
 */
var SummaryPane = function () {
  var _this,
      _initialize;


  _this = {};

  _initialize = function () {

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
    var div,
        timestamp;

    timestamp = Moment().format('ddd MMM D, YYYY h:mm:ss A');

    div = document.createElement('div');
    div.setAttribute('id', opts.id);
    div.innerHTML = '<h3>' + opts.name + '</h3>' + '<time>' + timestamp +
      '</time>' + opts.summary;

    document.querySelector('.summaries').appendChild(div);
  };

  /**
   * Remove summary text from summary pane (text plus <div> container)
   *
   * @param el {Element}
   *     Element to remove
   */
  _this.removeSummary = function (el) {
    el.parentNode.removeChild(el);
  };


  _initialize();
  return _this;
};


module.exports = SummaryPane;
