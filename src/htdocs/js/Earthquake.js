'use strict';


var Earthquake = function (options) {
  var _this,
      _initialize,

      _id;

  _this = {};

  _initialize = function (options) {
    var url;

    _id = options.id;

    url = 'http://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/nc72282711.geojson';
  };


  _initialize(options);
  options = null;
  return _this;
};

module.exports = Earthquake;
