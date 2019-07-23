'use strict';


var AftershocksFeature = require('features/AftershocksFeature'),
    AppUtil = require('AppUtil'),
    FieldNotesFeature = require('features/FieldNotesFeature'),
    FocalMechanismFeature = require('features/FocalMechanismFeature'),
    ForeshocksFeature = require('features/ForeshocksFeature'),
    HistoricalFeature = require('features/HistoricalFeature'),
    MainshockFeature = require('features/MainshockFeature'),
    Moment = require('moment'),
    MomentTensorFeature = require('features/MomentTensorFeature'),
    StationsFeature = require('features/StationsFeature'),
    Xhr = require('util/Xhr');


/**
 * Retrieves and adds 'features' to map, plot, and summary panes
 *
 * Features are event-specific layers added dynamically, based on the mainshock
 * Event ID entered by user
 *
 * Feature data comes from GeoJson web services (mostly via earthquake.usgs.gov)
 *
 * The stacking order of feature layers on the map is defined in css
 *
 * @param options {Object}
 *   {
 *     mapPane: {Object}, // MapPane instance
 *     plotsPane: {Object}, // PlotsPane instance
 *     statusBar: {Object}, // StatusBar instance
 *     summaryPane: {Object} // SummaryPane instance
 *   }
 */
var Features = function (options) {
  var _this,
      _initialize,

      _editPane,
      _eqid,
      _features,
      _mainshockJson,
      _plotdata,

      _MapPane,
      _PlotsPane,
      _StatusBar,
      _SummaryPane,

      _addFeature,
      _addPlots,
      _addSummary,
      _getAftershocks,
      _getEqFeedUrl,
      _getFieldNotes,
      _getFocalMechanism,
      _getForeshocks,
      _getHistorical,
      _getMainshock,
      _getMomentTensor,
      _getStations,
      _loadFeed,
      _removeCanvasEls,
      _removeFeature;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _MapPane = options.mapPane;
    _PlotsPane = options.plotsPane;
    _StatusBar = options.statusBar;
    _SummaryPane = options.summaryPane;

    // Flag to block mult. instances of feature from refreshing at the same time
    _this.isRefreshing = false;
  };

  /**
   * Create and add feature to map, plots, summary panes
   *
   * @param opts {Object}
   *   {
   *     jsClass: {Function}, // class that creates Feature
   *     json: {Object}, // geojson data
   *     mainshockJson: {Object}, // geojson data
   *     name: {String}
   *   }
   */
  _addFeature = function (opts) {
    var id,
        feature,
        name;

    name = opts.name;

    try {
      // Create feature (and store it in _features for access later)
      feature = opts.jsClass({
        json: opts.json,
        layerOn: opts.layerOn,
        mainshockJson: opts.mainshockJson,
        name: name
      });
      id = feature.id;
      _features[id] = feature;

      // Create a new map pane and add feature to map, summary panes
      _MapPane.createMapPane(id, 'overlayPane');
      _MapPane.addFeatureLayer(feature);
      _addSummary(feature);

      if (id === 'mainshock') {
        // Show mainshock details on editPane
        _editPane.showMainshock(feature.getSummaryData().detailsHtml,
          opts.mainshockJson.properties);

        // Store mainshock's plotdata
        _plotdata[id] = feature.getPlotData();

        // Add other (non-mainshock) features
        _this.getFeatures();
      } else if (id === 'aftershocks' || id === 'historical') {
        // Add plots to plots pane
        _plotdata[id] = feature.getPlotData();

        _addPlots(feature);
      }

      // Feature finished loading; remove alert / set isRefreshing to false
      _StatusBar.removeItem(name);
      _this.isRefreshing = false;
    }
    catch (error) {
      console.error(error);
      _StatusBar.addError(name, '<h4>Error Creating ' + name + '</h4><ul><li>' +
        error + '</li></ul>');
      _this.isRefreshing = false;
    }
  };

  /**
   * Add feature to plots pane
   *
   * @param feature {Object}
   */
  _addPlots = function (feature) {
    _PlotsPane.addPlots({
      id: feature.id,
      name: feature.name,
      data: _plotdata
    });
  };

  /**
   * Add feature to summary pane
   *
   * @param feature {Object}
   */
  _addSummary = function (feature) {
    if (feature.getSummaryData) { // check 1st if feature has summary to add
      _SummaryPane.addSummary({
        id: feature.id,
        name: feature.name,
        data: feature.getSummaryData()
      });
    }
  };

  /**
   * Get aftershocks feature
   */
  _getAftershocks = function () {
    var params;

    params = {
      latitude: _mainshockJson.geometry.coordinates[1],
      longitude: _mainshockJson.geometry.coordinates[0],
      maxradiuskm: AppUtil.getParam('as-dist'),
      minmagnitude: Number(AppUtil.getParam('as-mag')) - 0.05, // account for rounding to tenths
      starttime: Moment(_mainshockJson.properties.time + 1000).utc().toISOString()
        .slice(0, -5)
    };

    _loadFeed({
      jsClass: AftershocksFeature,
      name: 'Aftershocks',
      url: _getEqFeedUrl(params)
    });
  };

  /**
   * Get the feed url for aftershock / historical seismicity features
   *
   * @param params {Object}
   *
   * @return {String}
   */
  _getEqFeedUrl = function (params) {
    var baseUri,
        pairs,
        queryString;

    baseUri = 'https://earthquake.usgs.gov/fdsnws/event/1/query';

    pairs = ['format=geojson', 'orderby=time-asc'];
    Object.keys(params).forEach(function(key) {
      pairs.push(key + '=' + params[key]);
    });
    queryString = '?' + pairs.join('&');

    return baseUri + queryString;
  };

  _getFieldNotes = function (layerOn) {
    var after,
        before,
        pairs,
        params,
        url;

    after = Moment(_mainshockJson.properties.time + 1000).utc().format('X');
    before = Moment(_mainshockJson.properties.time).utc().add(30, 'days').format('X');
    params = {
      between: after + ',' + before,
      lat: _mainshockJson.geometry.coordinates[1],
      lon: _mainshockJson.geometry.coordinates[0],
      radius: AppUtil.getParam('as-dist') // use aftershocks radius
    };

    pairs = [];
    Object.keys(params).forEach(function(key) {
      pairs.push(key + '=' + params[key]);
    });

    url = 'https://bayquakealliance.org/fieldnotes/features.json.php?' + pairs.join('&');

    _loadFeed({
      jsClass: FieldNotesFeature,
      layerOn: layerOn,
      name: 'Fieldnotes',
      url: url
    });
  };

  /**
   * Get focal mechanism feature
   */
  _getFocalMechanism = function () {
    var focalmechanism;

    focalmechanism = _mainshockJson.properties.products['focal-mechanism'];
    if (focalmechanism) {
      _addFeature({
        jsClass: FocalMechanismFeature,
        json: focalmechanism[0].properties,
        mainshockJson: _mainshockJson,
        name: 'Focal Mechanism'
      });
    }
  };

  /**
   * Get foreshocks feature
   */
  _getForeshocks = function () {
    var days,
        params;

    days = AppUtil.getParam('fs-days');

    params = {
      endtime: Moment(_mainshockJson.properties.time - 1000).utc().toISOString()
        .slice(0, -5),
      latitude: _mainshockJson.geometry.coordinates[1],
      longitude: _mainshockJson.geometry.coordinates[0],
      maxradiuskm: AppUtil.getParam('fs-dist'),
      minmagnitude: Number(AppUtil.getParam('fs-mag')) - 0.05, // account for rounding to tenths
      starttime: Moment(_mainshockJson.properties.time).utc()
        .subtract(days, 'days').toISOString().slice(0, -5)
    };

    _loadFeed({
      jsClass: ForeshocksFeature,
      name: 'Foreshocks',
      url: _getEqFeedUrl(params)
    });
  };

  /**
   * Get historical seismicity feature
   */
  _getHistorical = function () {
    var params,
        years;

    years = AppUtil.getParam('hs-years');

    params = {
      endtime: Moment(_mainshockJson.properties.time - 1000).utc().toISOString()
        .slice(0, -5),
      latitude: _mainshockJson.geometry.coordinates[1],
      longitude: _mainshockJson.geometry.coordinates[0],
      maxradiuskm: AppUtil.getParam('hs-dist'),
      minmagnitude: Number(AppUtil.getParam('hs-mag')) - 0.05, // account for rounding to tenths
      starttime: Moment(_mainshockJson.properties.time).utc()
        .subtract(years, 'years').toISOString().slice(0, -5)
    };

    _loadFeed({
      jsClass: HistoricalFeature,
      name: 'Historical Seismicity',
      url: _getEqFeedUrl(params)
    });
  };

  /**
   * Get mainshock feature
   */
  _getMainshock = function () {
    var url;

    url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/' +
      _eqid + '.geojson';

    _loadFeed({
      jsClass: MainshockFeature,
      name: 'Mainshock',
      url: url
    });
  };

  /**
   * Get moment tensor feature
   */
  _getMomentTensor = function () {
    var momentTensor;

    momentTensor = _mainshockJson.properties.products['moment-tensor'];
    if (momentTensor) {
      _addFeature({
        jsClass: MomentTensorFeature,
        json: momentTensor[0].properties,
        mainshockJson: _mainshockJson,
        name: 'Moment Tensor'
      });
    }
  };

  /**
   * Get ShakeMap stations feature
   */
  _getStations = function () {
    var shakemap,
        url;

    shakemap = _mainshockJson.properties.products.shakemap;
    if (shakemap) {
      url = shakemap[0].contents['download/stationlist.json'].url;

      _loadFeed({
        jsClass: StationsFeature,
        name: 'ShakeMap Stations',
        url: url
      });
    }
  };

  /**
   * Load json feed and then call _addFeature() when it's finished loading
   *
   * @param opts {Object}
   *   {
   *     name: {String}
   *     jsClass: {Function},
   *     url: {String}
   *   }
   */
  _loadFeed = function (opts) {
    var domain,
        errorMsg,
        matches,
        name;

    name = opts.name;
    errorMsg = '<h4>Error Loading ' + name + '</h4>';

    // Alert user that feature is loading
    _StatusBar.addItem(name);

    Xhr.ajax({
      url: opts.url,
      success: function (json) {
        if (json.id === _eqid) { // mainshock
          _mainshockJson = json; // store mainshock's json (other features depend on it)

          // Set default param values on edit pane
          _editPane.setDefaults(_mainshockJson);
        }

        _addFeature({
          jsClass: opts.jsClass,
          json: json,
          layerOn: opts.layerOn,
          mainshockJson: _mainshockJson,
          name: name
        });
      },
      error: function (status, xhr) {
        errorMsg += '<ul>';

        // Show response in console and add additional info to error message
        if (xhr.responseText) {
          console.error(xhr.responseText);

          if (xhr.responseText.match('limit of 20000')) { // status code 400
            errorMsg += '<li>Modify the parameters to match fewer ' +
              'earthquakes (max 20,000)</li>';
          }
          else if (xhr.responseText.match('parameter combination')){ // status code 400
            errorMsg += ' <li>Missing required parameters (all fields are ' +
              'required)</li>';
          }
        }
        if (status) {
          if (status === 404 && name === 'Mainshock') {
            errorMsg += ' <li>Event ID ' + _eqid + ' not found</li>';
          }
          else if (status.message) {
            errorMsg += '<li>' + status.message + '</li>';
          }
          else {
            errorMsg += '<li>http status code: ' + status + '</li>';
          }
        }

        errorMsg += '</ul>';
        _StatusBar.addError(name, errorMsg);
        _this.isRefreshing = false;
      },
      ontimeout: function (xhr) {
        console.error(xhr);

        matches = opts.url.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
        domain = matches && matches[1];
        errorMsg += '<ul><li>Request timed out (can&rsquo;t connect to ' + domain +
          ')</li></ul>';

        _StatusBar.addError(name, errorMsg);
        _this.isRefreshing = false;
      },
      timeout: 2000
    });
  };

  /**
   * Remove all canvas beachballs from map pane
   */
  _removeCanvasEls = function () {
    var els,
        i,
        mapPane;

    mapPane = document.querySelector('#mapPane');
    els = mapPane.querySelectorAll('canvas');

    for (i = 0; i < els.length; i ++) {
      mapPane.removeChild(els[i]);
    }
  };

  /**
   * Remove feature from map, plots, summary panes
   *
   * @param id {String}
   *     id of feature to remove
   */
  _removeFeature = function (id) {
    var className,
        mapLayer,
        plotsEl,
        summaryEl;

    className = id;

    if (_features[id]) {
      mapLayer = _features[id].getMapLayer();
      plotsEl = document.querySelector('#plotsPane .' + className);
      summaryEl = document.querySelector('#summaryPane .' + className);
    }

    if (mapLayer) {
      _MapPane.map.removeLayer(mapLayer);
      _MapPane.layerControl.removeLayer(mapLayer);
    }

    if (plotsEl) {
      _PlotsPane.removePlots(plotsEl);
    }

    if (summaryEl) {
      _SummaryPane.removeSummary(summaryEl);
    }
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Initialize and begin process of adding feature layers
   *
   * Called each time a new Event ID is entered by user
   *
   * @param opts {Object}
   *   {
   *     editPane: {Object} // EditPane instance
   *   }
   */
  _this.getFeatures = function (opts) {
    if (opts && opts.hasOwnProperty('editPane')) { // new mainshock
      // 1. Initialize environment
      _editPane = opts.editPane;
      _eqid = AppUtil.getParam('eqid');
      _features = {};
      _plotdata = {};

      // 2. Create mainshock feature
      _getMainshock();
    } else {
      // 3. Create other features (called via mainshock's callback)
      _getAftershocks();
      _getForeshocks();
      _getHistorical();
      _getMomentTensor();
      _getFocalMechanism();
      _getStations();
      _getFieldNotes();
    }
  };

  /**
   * Refresh earthquakes feature layer when user tweaks form fields on edit pane
   *
   * @param id {String}
   */
  _this.refresh = function (id) {
    var fieldnotesLayerOn = false;

    _this.isRefreshing = true;
    _removeFeature(id);

    if (id === 'aftershocks') {
      _getAftershocks();

      // Also refresh Fieldnotes
      if (_MapPane.map.hasLayer(_features.fieldnotes.getMapLayer())) {
        fieldnotesLayerOn = true;
      }
      _removeFeature('fieldnotes');
      _getFieldNotes(fieldnotesLayerOn);
    } else if (id === 'foreshocks') {
      _getForeshocks();
    } else if (id === 'historical') {
      _getHistorical();
    }
  };

  /**
   * Remove all features from map, plots, summary panes
   */
  _this.removeFeatures = function () {
    if (_features) {
      Object.keys(_features).forEach(function(id) {
        _removeFeature(id);
      });
      // remove any leftover beachballs
      _removeCanvasEls();
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Features;
