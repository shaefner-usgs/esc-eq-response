'use strict';


var LatLon = require('LatLon'),
    Moment = require('moment');


// Static object with utility methods
var AppUtil = function () {
};

// Attach (expose) helper libraries
AppUtil.LatLon = LatLon;
AppUtil.Moment = Moment;

/**
 * Get the value of a URL parameter
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
 * Get all URL parameter name/value pairs
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
 * Get eq circle marker radius for a given magnitude
 *
 * @param mag {Number}
 *
 * @return {Number}
 */
AppUtil.getRadius = function (mag) {
  var radius = 2 * Math.pow(10, (0.15 * mag));

  return Math.round(radius * 10) / 10; // round to 1 decimal place
};

/**
 * Lookup table to get a URL parameter from a Feature id
 *
 * @param id {String}
 *
 * @return {String}
 */
AppUtil.lookup = function (id) {
  var lookup = {
    aftershocks: 'as',
    foreshocks: 'fs',
    historical: 'hs'
  };

  return lookup[id];
};

/**
 * Create a new object composed of only the picked object properties
 *
 * @param object {Object}
 * @param picked {Array}
 *
 * @return subset {Object}
 */
AppUtil.pick = function (object, picked) {
  var subset = picked.reduce(function(obj, key) {
    obj[key] = object[key];
    return obj;
  }, {});

  return subset;
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
 * @param empty {String}
 *   optional string to return if num is null
 *
 * @return {String}
 *     Note that it does not return a Number b/c toFixed() returns a string
 */
AppUtil.round = function (num, precision, empty) {
  var multiplier,
      rounded;

  if (!num && num !== 0) {
    return empty || '&ndash;';
  }

  num = Number(num);
  multiplier = Math.pow(10, precision || 0);
  rounded = Math.round(num * multiplier) / multiplier;

  return rounded.toFixed(precision);
};

/**
 * Set the value of a URL parameter
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

/**
 * Strip backslashes from escaped strings
 *   taken from http://locutus.io/php/stripslashes/
 *
 * @param str {String}
 *
 * @return {String}
 */
AppUtil.stripslashes = function (str) {
  return (str + '').replace(/\\(.?)/g, function (s, n1) {
    switch (n1) {
      case '\\':
        return '\\';
      case '0':
        return '\u0000';
      case '':
        return '';
      default:
        return n1;
    }
  });
};

/**
 * Uppercase first letter in a string
 *
 * @param str {String}
 *
 * @return {String}
 */
AppUtil.ucfirst = function (str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
};


module.exports = AppUtil;
