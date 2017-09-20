'use strict';


var MomentTensor = require('beachballs/MomentTensor'),
    Util = require('hazdev-webutils/src/util/Util');


var _DEFAULTS = {
  className: 'focal-mechanism-pin-beachball',
  fillColor: '#ffaa69',
  type: 'focal-mechanism'
};


/**
 * This class for rendering a focal mechanism. Currently it
 * does the same thing as {MomentTensor} (i.e. a beachball), but
 * uses a different color and className by default.
 *
 * @see {beachballs/MomentTensor}
 */
var FocalMechanism = function (options) {
  var _this;


  options = Util.extend({}, _DEFAULTS, options);
  _this = MomentTensor(options);


  options = null;
  return _this;
};


module.exports = FocalMechanism;
