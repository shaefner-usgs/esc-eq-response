'use strict';


var Xhr = require('util/Xhr');

/**
 * Factory for creating an array of significant earthquakes (past 30 days)
 *
 * @param options {Object}
 *   {
 *     callback: {Function},
 *     loadingModule: {Object} // LoadingModule instance
 *   }
 */
var SignificantEqs = function (options) {
  var _this,
      _initialize,

      _callback,
      _loadingModule,

      _loadFeed;


  _this = {};

  _initialize = function (options) {
    options = options || {};
    _callback = options.callback;
    _loadingModule = options.loadingModule;

    _loadFeed();
  };

  /**
   * Load GeoJson feed for significant eqs and return via _callback()
   */
  _loadFeed = function () {
    var url;

    // Alert user that feed is loading (removed by EditPane class)
    _loadingModule.addItem('significant', 'Significant Earthquakes');

    url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson';

    Xhr.ajax({
      url: url,
      success: function (data) {
        _callback(data);
      },
      error: function (status) {
        console.log(status);
        _loadingModule.addError('significant', 'Error Loading Significant Earthquakes');
      }
    });
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = SignificantEqs;
