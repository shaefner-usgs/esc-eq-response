'use strict';

// static object with utility methods
var AppUtil = function () {
};


/**
 * Get value of url param
 *
 * @param name {String}
 *
 * @return {Mixed}
 */
AppUtil.getParam = function (name) {
  var params = AppUtil.getParams();

  return params[name];
};

/**
 * Get all url param name/value pairs
 *
 * @return params {Object}
 */
AppUtil.getParams = function () {
  var params,
      queryString;

  params = {};
  queryString = location.search.slice(1);

  queryString.replace(/([^=]*)=([^&]*)&*/g, function (match, key, value) {
    params[key] = value;
  });

  return params;
};

/**
 * Convert number to roman numeral
 *
 * @param num {Number}
 *
 * @return {String}
 */
AppUtil.romanize = function (num) {
  var digits,
      i,
      key,
      roman;

  if (typeof num !== 'number') {
    return false;
  }
  num = Math.round(num) || 1; // return 'I' for values less than 1
  digits = String(num).split('');
  key = ['','C','CC','CCC','CD','D','DC','DCC','DCCC','CM',
         '','X','XX','XXX','XL','L','LX','LXX','LXXX','XC',
         '','I','II','III','IV','V','VI','VII','VIII','IX'];
  roman = '';
  i = 3;

  while (i--) {
    roman = (key[+digits.pop() + (i * 10)] || '') + roman;
  }

  return Array(+digits.join('') + 1).join('M') + roman;
};

/**
 * Round a number to given number of decimal places
 *
 * @param num {Number}
 * @param precision {Number}
 *
 * @return {String}
 *     Note that it does not return a Number b/c toFixed() returns a string
 */
AppUtil.round = function (num, precision) {
  var multiplier,
      rounded;

  num = Number(num);
  multiplier = Math.pow(10, precision || 0);
  rounded = Math.round(num * multiplier) / multiplier;

  return rounded.toFixed(precision);
};

/**
 * Set the value of a url parameter
 *
 * @param name {String}
 * @param value {Mixed}
 */
AppUtil.setParam = function (name, value) {
  var hash,
      pairs,
      params,
      queryString;

  hash = location.hash;
  params = AppUtil.getParams();
  params[name] = value;

  pairs = [];
  Object.keys(params).forEach(function(key) {
    pairs.push(key + '=' + params[key]);
  });
  queryString = '?' + pairs.join('&');

  window.history.replaceState({}, '', queryString + hash);
};


module.exports = AppUtil;
