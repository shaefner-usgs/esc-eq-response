'use strict';


var Xhr = require('util/Xhr');

var Earthquake = function (options) {
  var _this,
      _initialize,

      _getUrls,
      _loadDetailFeed,
      _setProps,
      _updateFields,

      _controller,
      _editPane,
      _id;

  _this = {};

  _initialize = function (options) {
    _controller = options.controller;
    _editPane = options.editPane;
    _id = options.id;

    _loadDetailFeed();
  };

  _getUrls = function (products) {
    var urls;

    urls = {
      shakemap_mmi: products.shakemap[0].contents['download/cont_mi.json'].url
    };

    return urls;
  };

  _loadDetailFeed = function () {
    var url;

    url = 'http://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/' +
      _id + '.geojson';

    Xhr.ajax({
      url: url,
      success: function (data) {
        _setProps(data);
      },
      error: function (status) {
        console.log(status);
      }
    });
  };

  _setProps = function (data) {
    var props;

    props = data.properties;

    _this.id = data.id;
    _this.geometry = data.geometry;
    _this.properties = {
      mag: props.mag,
      magType: props.magType,
      place: props.place,
      time: props.time,
      urls: _getUrls(data.properties.products),
      utcOffset: props.tz,
      updated: props.updated
    };

    _updateFields();
  };

  _updateFields = function () {
    var defaults;

    defaults = _editPane.getDefaults(_this);
    Object.keys(defaults).forEach(function(key) {
      _controller.setParam(key, defaults[key]);
    });

    _controller.setFormFields();
  };


  _initialize(options);
  options = null;
  return _this;
};

module.exports = Earthquake;
