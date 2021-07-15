'use strict';


// Static object with utility methods
var AppUtil = function () {};


/**
 * Add commas to large numbers.
 *
 * @param num {Number}
 *
 * @return {String}
 */
AppUtil.addCommas = function (num) {
  var dec,
      int,
      parts,
      regex;

  dec = '';
  num = String(num);
  parts = num.split('.');
  int = parts[0];
  regex = /(\d+)(\d{3})/;

  if (parts.length > 1) {
    dec = '.' + parts[1];
  }

  while (regex.test(int)) {
    int = int.replace(regex, '$1' + ',' + '$2');
  }

  return int + dec;
};

/**
 * Creates a function that is a composition of other functions.
 *
 * For example:
 *      a(b(c(x))) === compose(c, b, a)(x);
 *
 * Each function should accept as an argument, the result of the previous
 * function call in the chain. It is allowable for all functions to have no
 * return value as well.
 *
 * @param ... {Function}
 *     a variable set of functions to call, in order
 *
 * @return {Function}
 *     the composition of the functions provided as arguments
 */
AppUtil.compose = function () {
  var fns = arguments;

  return result => {
    fns.forEach(fn => {
      if (fn && fn.call) {
        result = fn.call(this, result);
      }
    });

    return result;
  };
};

/**
 * Get the value of a URL parameter.
 *
 * @param name {String}
 *
 * @return {String}
 */
AppUtil.getParam = function (name) {
  var params = AppUtil.getParams();

  return params[name];
};

/**
 * Get all URL parameter name/value pairs.
 *
 * @return params {Object}
 */
AppUtil.getParams = function () {
  var params,
      queryString;

  params = {};
  queryString = location.search.slice(1);

  queryString.replace(/([^=]*)=([^&]*)&*/g, (match, key, value) => {
    params[key] = value;
  });

  return params;
};

/**
 * Get circle marker radius for a given eq magnitude.
 *
 * @param mag {Number}
 *
 * @return {Number}
 */
AppUtil.getRadius = function (mag) {
  var radius = 2 * Math.pow(10, (0.15 * mag));

  return Math.round(radius * 10) / 10; // round to nearest tenth
};

/**
 * Get the timezone on user's device.
 *
 * https://stackoverflow.com/questions/2897478/get-client-timezone-not-gmt-
 *  offset-amount-in-js/12496442#12496442
 *
 * @return tz {String}
 *     PST, CST, etc
 */
AppUtil.getTimeZone = function () {
  var now,
      tz;

  now = new Date().toString();

  try {
    if (now.indexOf('(') > -1) {
      tz = now.match(/\([^)]+\)/)[0].match(/[A-Z]/g).join('');
    } else {
      tz = now.match(/[A-Z]{3,4}/)[0];
    }

    if (tz === 'GMT' && /(GMT\W*\d{4})/.test(now)) {
      tz = RegExp.$1;
    }
  } catch (error) {
    console.error(error);
  }

  return tz;
};

/**
 * Lookup table to get a URL parameter prefix from a Feature id.
 *
 * @param id {String}
 *
 * @return {String}
 */
AppUtil.lookupPrefix = function (id) {
  var lookup = {
    aftershocks: 'as',
    foreshocks: 'fs',
    historical: 'hs'
  };

  return lookup[id];
};

/**
 * Convert a number to a roman numeral.
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
    return false; // ignore 'null' values
  }

  num = Math.round(num) || 1; // return 'I' for values less than 1
  digits = String(num).split('');
  i = 3;
  key = [
    '', 'C', 'CC', 'CCC', 'CD', 'D', 'DC', 'DCC', 'DCCC', 'CM',
    '', 'X', 'XX', 'XXX', 'XL', 'L', 'LX', 'LXX', 'LXXX', 'XC',
    '', 'I' ,'II' ,'III' ,'IV' ,'V' ,'VI' ,'VII' ,'VIII' ,'IX'
  ];
  roman = '';

  while (i--) {
    roman = (key[+digits.pop() + (i * 10)] || '') + roman;
  }

  return Array(+digits.join('') + 1).join('M') + roman;
};

/**
 * Round a number to a given number of decimal places.
 *
 * Always return the explicit number of decimal places specified by the
 * precision parameter (i.e. return '2.0' for example).
 *
 * @param num {Number}
 * @param precision {Number} optional; default is 0
 *     number of decimal places
 * @param empty {String} optional; default is '–'
 *     string to return if num is null
 *
 * @return {String}
 *     NOTE: does not return a Number
 */
AppUtil.round = function (num, precision = 0, empty = '–') {
  var multiplier,
      rounded;

  if (!num && num !== 0 || num === 'null') { // in case 'null' value is a string
    return empty;
  }

  num = Number(num);
  multiplier = Math.pow(10, precision);
  rounded = Math.round(num * multiplier) / multiplier;

  return rounded.toFixed(precision);
};

/**
 * Set all form field values to match the values in querystring.
 */
AppUtil.setFormFieldValues = function () {
  var params = AppUtil.getParams();

  Object.keys(params).forEach(key => {
    if (document.getElementById(key)) {
      document.getElementById(key).value = params[key];
    }
  });
};

/**
 * Set the value of a URL parameter.
 *
 * @param name {String}
 * @param value {Mixed}
 */
AppUtil.setParam = function (name, value) {
  var pairs,
      params,
      queryString;

  pairs = [];
  params = AppUtil.getParams();
  params[name] = value;
  queryString = '?';

  Object.keys(params).forEach(key => {
    pairs.push(key + '=' + params[key]);
  });

  queryString += pairs.join('&');

  window.history.replaceState({}, '', queryString + location.hash);
};

/**
 * Set all querystring values to match the values in form fields.
 */
AppUtil.setQueryStringValues = function () {
  var fields,
      pairs,
      queryString;

  fields = document.querySelectorAll('#editPane input');
  pairs = [];
  queryString = '?';

  fields.forEach(field => {
    pairs.push(field.id + '=' + field.value);
  });

  queryString += pairs.join('&');

  window.history.replaceState({}, '', queryString + location.hash);
};

/**
 * Strip backslashes from escaped strings.
 *
 * https://locutus.io/php/strings/stripslashes/
 *
 * @param str {String}
 *
 * @return {String}
 */
AppUtil.stripslashes = function (str) {
  return (str + '').replace(/\\(.?)/g, (s, n1) => {
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
 * Update the value of a URL parameter (i.e. when a form field is changed).
 *
 * @param e {Event}
 */
AppUtil.updateParam = function (e) {
  var el,
      id,
      value;

  id = e.target.id;
  el = document.getElementById(id);
  value = el.value.replace(/\s+/g, ''); // strip whitespace

  el.value = value;

  AppUtil.setParam(id, value);
};


module.exports = AppUtil;
