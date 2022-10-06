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
  var decStr = '',
      numStr = String(num),
      parts = numStr.split('.'),
      intStr = parts[0],
      regex = /(\d+)(\d{3})/;

  if (!num && num !== 0) {
    return '';
  }

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
 * Get the min and max values from an Array.
 *
 * Taken from D3: https://github.com/d3/d3-array/blob/main/src/extent.js
 *
 * @param values {Array}
 *
 * @return {Array}
 */
AppUtil.extent = function (values) {
  var min,
      max,
      value;

  for (value of values) {
    if (value != null) {
      if (min === undefined) {
        if (value >= value) min = max = value;
      } else {
        if (min > value) min = value;
        if (max < value) max = value;
      }
    }
  }

  return [min, max];
};

/**
 * Add timeout support to a fetch() request.
 *
 * Taken from: https://dmitripavlutin.com/timeout-fetch-request/
 *
 * @param resource {String}
 *     URI
 * @param options {Object} default is {}
 *     fetch() settings, with an additional prop for timeout in milliseconds
 */
AppUtil.fetchWithTimeout = async function (resource, options = {}) {
  const { timeout = 10000 } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  const response = await fetch(resource, {
    ...options,
    signal: controller.signal
  });
  clearTimeout(timer);

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
  var lat = Math.abs(coords[1]).toFixed(3),
      latHemisphere = (coords[1] < 0 ? 'S' : 'N'),
      lon = Math.abs(coords[0]).toFixed(3),
      lonHemisphere = (coords[0] < 0 ? 'W' : 'E');

  return `${lat}°${latHemisphere}, ${lon}°${lonHemisphere}`;
};

/**
 * Get the value of the given URL parameter.
 *
 * @param name {String}
 *
 * @return {Mixed <String|null>}
 *     returns null when the URL param is not set
 */
AppUtil.getParam = function (name) {
  var params = new URLSearchParams(location.search);

  return params.get(name);
};

/**
 * Get the circle marker radius for the given eq magnitude, rounded to the
 * nearest tenth.
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
  var shaking = [
        {intensity: 'N/A',  level: '–'},
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
      ],
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
  var now = new Date().toString(),
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
 * Check if an Object is empty.
 *
 * @param obj {Object}
 *
 * @return {Boolean}
 */
AppUtil.isEmpty = function (obj) {
  if (typeof obj === 'object' && obj.constructor === Object) {
    return Object.keys(obj).length === 0;
  }
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
      i = 3,
      key = [
        '', 'C', 'CC', 'CCC', 'CD', 'D', 'DC', 'DCC', 'DCCC', 'CM',
        '', 'X', 'XX', 'XXX', 'XL', 'L', 'LX', 'LXX', 'LXXX', 'XC',
        '', 'I' ,'II' ,'III' ,'IV' ,'V' ,'VI' ,'VII' ,'VIII' ,'IX'
      ],
      roman = '';

  if (typeof num !== 'number') {
    return ''; // ignore non-number values
  } else if (num === 0) {
    return 'N/A';
  }

  num = Math.round(num) || 1; // return 'I' for values less than 1
  digits = String(num).split('');

  while (i--) {
    roman = (key[+digits.pop() + (i * 10)] || '') + roman;
  }

  return Array(+digits.join('') + 1).join('M') + roman;
};

/**
 * Round a number to the given number of decimal places.
 *
 * Always return the explicit number of decimal places specified by the
 * precision parameter (i.e. return '2.0' for example).
 *
 * @param num {Number}
 * @param precision {Number} default is 0
 *     number of decimal places
 * @param empty {String} default is '–'
 *     string to return if num is null
 *
 * @return {String}
 *     NOTE: does not return a Number
 */
AppUtil.round = function (num, precision = 0, empty = '–') {
  var rounded,
      multiplier = Math.pow(10, precision);

  if (!num && num !== 0 || num === 'null') { // in case 'null' value is a string
    return empty;
  }

  num = Number(num);
  rounded = Math.round(num * multiplier) / multiplier;

  return rounded.toFixed(precision);
};

/**
 * Round numbers greater than 10,000 to thousands value w/ ' k' appended
 * (i.e. '10 k') and numbers greater than 1,000,000 to e.g. 1.0 M. For numbers
 * less than 10,000, round to the nearest whole number.
 *
 * @param num {Number}
 *
 * @return {String}
 */
AppUtil.roundThousands = function (num) {
  num = Math.round(Number(num));

  if (num < 10000) {
    return num.toString();
  } else if (num < 1000000) {
    return Math.round(num / 1000) + ' k';
  } else {
    return Math.round(num / 1000000 * 10) / 10 + ' M';
  }
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
 * Check if two (shallow) objects are equal, ignoring properties listed in skip.
 *
 * @param obj1 {Object}
 * @param obj2 {Object}
 * @param skip {Array} default is []
 *
 * @return {Boolean}
 */
AppUtil.shallowEqual = function (obj1, obj2, skip = []) {
  var key,
      keys1 = Object.keys(obj1),
      keys2 = Object.keys(obj2);

  // Ignore skipped items
  keys1 = keys1.filter(item => !skip.includes(item));
  keys2 = keys2.filter(item => !skip.includes(item));

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
  var input = document.getElementById(name),
      value = input.value.replace(/\s+/g, ''); // strip whitespace

  input.value = value;

  AppUtil.setParam(name, value);
};


module.exports = AppUtil;
