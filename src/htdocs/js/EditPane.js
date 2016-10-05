'use strict';


var EditPane = function (options) {
  var _this,
      _initialize;

  _this = {};

  _initialize = function () {
    document.getElementById('eqid').focus();
  };

  /*
   * Get default values for form fields that depend on selected earthquake
   *
   * @param earthquake {Object}
   *
   * @return {Object}
   */
  _this.getDefaults = function (earthquake) {
    var mag;

    mag = earthquake.features[0].properties.mag;

    return {
      ashockDistance: Math.max(5, Math.round(mag - 2) * 5),
      histDistance: Math.max(10, Math.round(mag - 2) * 10)
    };
  };


  _initialize(options);
  options = null;
  return _this;
};

module.exports = EditPane;
