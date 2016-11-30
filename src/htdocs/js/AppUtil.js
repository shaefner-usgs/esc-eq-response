'use strict';

// static object with utility methods
var AppUtil = function () {
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

  if (typeof num !== 'number') {
    return false;
  }

  multiplier = Math.pow(10, precision || 0);
  rounded = Math.round(num * multiplier) / multiplier;

  return rounded.toFixed(precision);
};


module.exports = AppUtil;
