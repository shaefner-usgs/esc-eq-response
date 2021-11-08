'use strict';


// Static object with utility methods
var AppUtil = function () {};


/**
 * Add commas to large numbers (10,000 and greater).
 *
 * @param num {Number}
 *
 * @return {String}
 */
AppUtil.addCommas = function (num) {
  var decStr,
      intStr,
      numStr,
      parts,
      regex;

  if (!num && num !== 0) {
    return '';
  }

  decStr = '';
  numStr = String(num);
  parts = numStr.split('.');
  intStr = parts[0];
  regex = /(\d+)(\d{3})/;

  if (parts.length > 1) {
    decStr = '.' + parts[1];
  }

  if (numStr.length > 4) {
    while (regex.test(intStr)) {
      intStr = intStr.replace(regex, '$1' + ',' + '$2');
    }
  }

  return intStr + decStr;
};

/**
 * Capitalize a string.
 *
 * @param str {String}
 *
 * @return {String}
 */
AppUtil.capitalize = function (str) {
  if (typeof str !== 'string') {
    return '';
  }

  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Create a function that is a composition of other functions.
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
 * Delete the given URL parameter and update the URL.
 *
 * @param name {String}
 */
AppUtil.deleteParam = function (name) {
  var params = new URLSearchParams(location.search);

  if (AppUtil.getParam(name)) {
    params.delete(name);
    history.replaceState({}, '', '?' + params.toString() + location.hash);
  }
};

/**
 * Add timeout support to a fetch() request.
 *
 * Taken from: https://dmitripavlutin.com/timeout-fetch-request/
 *
 * @param resource {String}
 * @param options {Object} optional; default is {}
 *     fetch() settings, with an additional prop for timeout in milliseconds
 */
AppUtil.fetchWithTimeout = async function (resource, options = {}) {
  const { timeout = 10000 } = options;

  const controller = new AbortController();
  const id = setTimeout(controller.abort, timeout);

  const response = await fetch(resource, {
    ...options,
    signal: controller.signal
  });
  clearTimeout(id);

  return response;
};

/**
 * Get a formatted lat/lon coordinate pair.
 *
 * @param coords {Array}
 *
 * @return {String}
 */
AppUtil.formatLatLon = function (coords) {
  var lat,
      lon;

  lat = [Math.abs(coords[1]).toFixed(3), '°', (coords[1] < 0 ? 'S':'N')].join('');
  lon = [Math.abs(coords[0]).toFixed(3), '°', (coords[0] < 0 ? 'W':'E')].join('');

  return lat + ', ' + lon;
};

/**
 * Get the value of a given URL parameter.
 *
 * @param name {String}
 *
 * @return {String | null}
 *     returns null when the URL param is not set
 */
AppUtil.getParam = function (name) {
  var params = new URLSearchParams(location.search);

  return params.get(name);
};

/**
 * Get the circle marker radius for a given eq magnitude, rounded to the nearest
 * tenth.
 *
 * @param mag {Number}
 *
 * @return {Number}
 */
AppUtil.getRadius = function (mag) {
  var radius = 2 * Math.pow(10, (0.15 * mag));

  return Math.round(radius * 10) / 10;
};

/**
 * Get the shaking values (intensity/level) for an array of MMI Integer values.
 *
 * @param mmis {Array}
 *
 * @return values {Array}
 */
AppUtil.getShakingValues = function (mmis) {
  var shaking,
      values;

  shaking = [
    {}, // no zero-level values
    {intensity: 'I',    level: 'Not felt'},
    {intensity: 'II',   level: 'Weak'},
    {intensity: 'III',  level: 'Weak'},
    {intensity: 'IV',   level: 'Light'},
    {intensity: 'V',    level: 'Moderate'},
    {intensity: 'VI',   level: 'Strong'},
    {intensity: 'VII',  level: 'Very strong'},
    {intensity: 'VIII', level: 'Severe'},
    {intensity: 'IX',   level: 'Violent'},
    {intensity: 'X+',   level: 'Extreme'}
  ];
  values = [];

  mmis.forEach(val =>
    values.push(shaking[val])
  );

  return values;
};

/**
 * Get the timezone on the user's device.
 *
 * Taken from: https://stackoverflow.com/questions/2897478/get-client-timezone-
 *   not-gmt-offset-amount-in-js/12496442#12496442
 *
 * @return tz {String}
 *     PST, CST, etc
 */
AppUtil.getTimeZone = function () {
  var now,
      tz;

  now = new Date().toString();
  tz = '';

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
    return ''; // ignore 'null' values
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
 * Set the given URL parameter to the given value and update the URL.
 *
 * @param name {String}
 * @param value {Mixed}
 */
AppUtil.setParam = function (name, value) {
  var params = new URLSearchParams(location.search);

  params.set(name, value);

  history.replaceState({}, '', '?' + params.toString() + location.hash);
};

/**
 * Check if two (shallow) objects are equal.
 *
 * @param obj1 {Object}
 * @param obj2 {Object}
 *
 * @return {Boolean}
 */
AppUtil.shallowEqual = function (obj1, obj2) {
  var key,
      keys1,
      keys2;

  keys1 = Object.keys(obj1);
  keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (key of keys1) {
    if (obj1[key] !== obj2[key]) {
      return false;
    }
  }

  return true;
};

/**
 * Strip backslashes from an escaped string.
 *
 * Taken from: https://locutus.io/php/strings/stripslashes/
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
 * Update the given URL parameter with the corresponding input field's value.
 *
 * @param name {String}
 */
AppUtil.updateParam = function (name) {
  var input,
      value;

  input = document.getElementById(name);
  value = input.value.replace(/\s+/g, ''); // strip whitespace

  input.value = value;

  AppUtil.setParam(name, value);
};


module.exports = AppUtil;
