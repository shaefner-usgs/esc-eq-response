'use strict';


var Moment = require('Moment');


var SummaryPane = function (options) {
  var _this,
      _initialize;


  _this = {};

  _initialize = function () {

  };

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

  _initialize(options);
  options = null;
  return _this;
};


module.exports = SummaryPane;
