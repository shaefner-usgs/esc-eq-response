'use strict';

var BeachBallView = require('beachballs/BeachBallView'),
    Tensor = require('beachballs/Tensor'),
    Util = require('hazdev-webutils/src/util/Util');


var _DEFAULTS = {
  className: 'moment-tensor',
  fillColor: '#6ea8ff',
  labelAxes: false,
  labelPlanes: false,
  size: 200,
  type: 'moment-tensor'
};


var MomentTensor = function (options) {
  var _this,
      _initialize,

      _beachballView,
      _className,
      _data,
      _fillColor,
      _labelAxes,
      _labelPlanes,
      _size,
      _tensor,
      _type;

  _this = {};

  _initialize = function (options) {
    options = Util.extend({}, _DEFAULTS, options);

    _data = options.data;
    _className = options.className;
    _fillColor = options.fillColor;
    _labelAxes = options.labelAxes;
    _labelPlanes = options.labelPlanes;
    _size = options.size;
    _type = options.type;

    _data.type = _type; // attach _type so it's available to Tensor class
    _tensor = Tensor.fromProduct(_data);
  };

  _this.destroy = Util.compose(function () {
    if (_beachballView) {
      _beachballView.destroy();
    }

    _beachballView = null;
    _className = null;
    _fillColor = null;
    _tensor = null;

    _initialize = null;
    _this = null;
  }, _this.destroy);

  /**
   * Create/render beachball
   */
  _this.render = function (el) {
    _beachballView = BeachBallView({
      className: _className,
      el: el,
      fillColor: _fillColor,
      labelAxes: _labelAxes,
      labelPlanes: _labelPlanes,
      size: _size,
      tensor: _tensor
    });

    _beachballView.render();
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = MomentTensor;
