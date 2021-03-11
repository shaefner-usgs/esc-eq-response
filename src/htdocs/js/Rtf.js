/* global Plotly */
'use strict';


var Xhr = require('hazdev-webutils/src/util/Xhr');


/**
 * Create an Event Summary RTF document by sending a json string as
 *   raw POST data to a PHP script that generates the binary file
 *
 * @param options {Object}
 *   {
 *     app: {Object} // Application
 *   }
 *
 * @return _this {Object}
 *   {
 *     create: {Function}
 *   }
 */
var Rtf = function (options) {
  var _this,
      _initialize,

      _app,
      _magThreshold,
      _plots,
      _sortKey,
      _sortOrder,

      _compare,
      _filter,
      _getBeachBalls,
      _getPlotDivs,
      _getPostData,
      _getProducts,
      _getPromise,
      _getPromises,
      _getSortValues,
      _initPlots;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
  };

  /**
   * Sort an array of earthquake objects by key
   *
   * @params a, b {Objects}
   *     Objects to compare/sort
   *
   * @return {Integer}
   */
  _compare = function (a, b) {
    var aValue,
        bValue,
        comparison;

    if (_sortKey) { // not set for unsorted (1 row) tables
      // Case insensitive sort for strings
      aValue = a[_sortKey];
      if (typeof a[_sortKey] === 'string') {
        aValue = a[_sortKey].toUpperCase();
      }
      bValue = b[_sortKey];
      if (typeof b[_sortKey] === 'string') {
        bValue = b[_sortKey].toUpperCase(); // case insensitive
      }

      // Use ISO time to properly sort date/time fields
      if (_sortKey === 'utcTime') {
        aValue = a.isoTime;
        bValue = b.isoTime;
      }

      comparison = 0;
      if (aValue > bValue) {
        comparison = 1;
      } else if (aValue < bValue) {
        comparison = -1;
      }

      if (_sortOrder === 'up') { // order flag inverted?? by table sorting library
        comparison *= -1;
      }

      return comparison;
    }
  };

  /**
   * Filter out eqs below mag threshold (set via summary pane's filter sliders)
   *
   * @param feature {Object}
   *
   * @return list {Array}
   */
  _filter = function (feature) {
    var list,
        slider,
        sortValues;

    list = feature.list;
    slider = document.querySelector('.' + feature.id + ' .filter output');

    if (slider) { // eq list has a slider filter
      _magThreshold = Number(slider.value);
      list = feature.list.filter(function (eq) {
        return eq.mag >= _magThreshold;
      });
    }

    // Set sort key, order here (not in _compare) so it only gets set once/feature
    if (list.length > 0) {
      sortValues = _getSortValues(feature.id);
      if (sortValues) {
        _sortKey = sortValues.key;
        _sortOrder = sortValues.order;
      }
    }

    return list;
  };

  /**
   * Get focal mechanism, moment tensor beachballs as a dataUrl (base64 encoded)
   *
   * @return beachballs {Object}
   */
  _getBeachBalls = function () {
    var beachball,
        beachballs,
        canvasEls;

    beachballs = {};
    canvasEls = {
      fm: document.querySelector('#summaryPane .focal-mechanism canvas'),
      mt: document.querySelector('#summaryPane .moment-tensor canvas')
    };

    Object.keys(canvasEls).forEach(function(key) {
      beachball = canvasEls[key];
      if (beachball) {
        beachballs[key] = beachball.toDataURL('image/png');
      }
    });

    return beachballs;
  };

  /**
   * Get an array of div containers for all (2d) plots, grouped by Feature
   *
   * @return divs {Object}
   *   {
   *     featureId: [div1, ...],
   *     ...
   *   }
   */
  _getPlotDivs = function () {
    var divs,
        params,
        plots;

    divs = {};
    plots = _app.PlotsPane.getPlots();

    Object.keys(plots).forEach(function(featureId) {
      divs[featureId] = [];
      params = plots[featureId].params;

      Object.keys(params).forEach(function(plotId) {
        if (plotId !== 'hypocenters') { // skip 3d plots
          divs[featureId].push(params[plotId].graphDiv);
        }
      });
    });

    return divs;
  };

  /**
   * Get POST data json object used to populate Event Summary RTF document
   *
   * @return data {Object}
   */
  _getPostData = function () {
    var aftershocks,
        beachballs,
        data,
        feeds,
        foreshocks,
        historical,
        mainshock,
        pagerCities,
        pagerExposures,
        products,
        props;

    aftershocks = _app.Features.getFeature('aftershocks');
    beachballs = _getBeachBalls();
    feeds = _app.Feeds.getFeeds();
    foreshocks = _app.Features.getFeature('foreshocks');
    historical = _app.Features.getFeature('historical');
    mainshock = _app.Features.getFeature('mainshock');
    pagerCities = _app.Features.getFeature('pager-cities');
    pagerExposures = _app.Features.getFeature('pager-exposures');
    products = _getProducts(mainshock.json.properties.products);
    props = mainshock.json.properties;

    // IMPORTANT: Set appropriate types for 'empty' values (i.e. not js 'undefined')
    data = {
      aftershocks: {
        bins: aftershocks.bins,
        count: aftershocks.count,
        description: aftershocks.description,
        earthquakes: _filter(aftershocks).sort(_compare),
        forecast: aftershocks.forecast || [],
        magThreshold: _magThreshold || 0,
        model: aftershocks.model || {},
        plots: _plots.aftershocks
      },
      beachballs: beachballs,
      depth: mainshock.json.geometry.coordinates[2],
      dyfi: products.dyfi || {},
      eqid: mainshock.json.id,
      foreshocks: {
        bins: foreshocks.bins,
        count: foreshocks.count,
        description: foreshocks.description,
        earthquakes: _filter(foreshocks).sort(_compare),
        magThreshold: _magThreshold || 0
      },
      historical: {
        bins: historical.bins,
        count: historical.count,
        description: historical.description,
        earthquakes: _filter(historical).sort(_compare),
        magThreshold: _magThreshold || 0,
        plots: _plots.historical
      },
      mag: props.mag,
      magType: props.magType,
      pager: products.pager || {},
      'pager-cities': pagerCities.cities || [],
      'pager-exposures': pagerExposures.exposures || {},
      place: props.place,
      shakemap: products.shakemap || '',
      summary: products.summary || '',
      time: {
        local: mainshock.localTime,
        utc: mainshock.utcTime
      },
      title: props.title,
      urls: {
        app: window.location.href,
        eventPage: props.url
      }
    };

    // Add feed data fetched for Event Summary document
    Object.keys(feeds).forEach(function(id) {
      data[id] = feeds[id].json;
    });

    return data;
  };

  /**
   * Check if DYFI, ShakeMap, PAGER, Summary products exist, and if they do,
   *   return select properties for each
   *
   * @param products {Object}
   *
   * @return {Object}
   */
  _getProducts = function (products) {
    var contents,
        dyfi,
        pager,
        shakemap,
        summary;

    if (products.dyfi) {
      contents = products.dyfi[0].contents;
      dyfi = {
        map: contents[products.dyfi[0].code + '_ciim_geo.jpg'].url,
        plot: contents[products.dyfi[0].code + '_plot_atten.jpg'].url,
        maxmmi: Number(products.dyfi[0].properties.maxmmi),
        responses: Number(products.dyfi[0].properties.numResp)
      };
    }
    if (products.losspager) {
      contents = products.losspager[0].contents;
      pager = {
        alert: products.losspager[0].properties.alertlevel,
        economic: contents['alertecon.png'].url,
        exposure: contents['exposure.png'].url,
        fatalities: contents['alertfatal.png'].url
      };
    }
    if (products.shakemap) {
      contents = products.shakemap[0].contents;
      if (contents['download/tvmap.jpg']) {
        shakemap = contents['download/tvmap.jpg'].url;
      } else if (contents['download/intensity.jpg'].url) {
        shakemap = contents['download/intensity.jpg'].url;
      }
    }
    if (products['general-text']) {
      summary = products['general-text'][0].contents[''].bytes;
    }

    return {
      dyfi: dyfi,
      pager: pager,
      shakemap: shakemap,
      summary: summary
    };
  };

  /**
   * Get a Promise to (2d) plot image as a dataUrl (base64 encoded)
   *
   * @param div {Element}
   * @param featureId {String}
   *
   * @return promise {Object}
   */
  _getPromise = function (div, featureId) {
    var promise,
        type;

    type = div.classList.item(0); // plot type key
    promise = Plotly.toImage(div, {
      format: 'png',
      height: 300,
      width: 800
    }).then(function(dataUrl) {
      _plots[featureId][type] = dataUrl;
    });

    return promise;
  };

  /**
   * Wrapper method to get a Promise to each (2d) plot image
   *
   * @return promises {Array}
   */
  _getPromises = function () {
    var plotDivs,
        promises;

    plotDivs = _getPlotDivs();
    promises = [];

    Object.keys(plotDivs).forEach(function(featureId) {
      _plots[featureId] = {}; // initialize object that stores a Feature's plots

      plotDivs[featureId].forEach(function(div) {
        promises.push(_getPromise(div, featureId));
      });
    });

    return promises;
  };

  /**
   * Get the sort key (set as a CSS class on a <th>) and order for an eq list
   *
   * @param featureId {String}
   *     Feature ID
   *
   * @return {Object}
   */
  _getSortValues = function (featureId) {
    var el,
        key,
        order,
        regex1,
        regex2,
        result,
        ths;

    regex1 = /sort-(up|down)/; // finds current sorted-by th
    regex2 = /sort-\w+/; // finds css classes associated with sorting algorithm
    ths = document.querySelectorAll('.' + featureId + ' .eqlist.sortable th');

    if (ths.length === 0) { // unsorted table (happens when there is only 1 row)
      return;
    }

    ths.forEach(function(th) {
      th.classList.forEach(function(className) {
        result = regex1.exec(className);
        if (result) {
          el = th; // field (element) table is sorted by
          order = result[1]; // 'up' or 'down'
        }
      });
    });

    key = Array.from(el.classList).filter(function (cssClass) {
      return !regex2.test(cssClass); // weeds out sorting algorithm CSS classes
    });

    return {
      key: key[0],
      order: order
    };
  };

  /**
   * Store plot image .pngs, which are each returned as a Promise from Plot.ly
   *
   * @return promises {Array}
   */
  _initPlots = function () {
    var promises;

    _plots = {};
    promises = _getPromises(); // promises that populate _plots

    return promises;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Create Event Summary RTF file and then trigger download of file
   */
  _this.create = function () {
    var data,
        plots;

    // Render plots so that their images can be captured
    if (!_app.PlotsPane.rendered) {
      _app.PlotsPane.render();
    }

    plots = _initPlots();

    Promise.all(plots).then(function() {
      data = JSON.stringify(_getPostData());

      Xhr.ajax({
        error: function (e, xhr) {
          console.error(xhr.statusText + xhr.responseText);

          _app.StatusBar.addError({
            id: 'rtf',
            message: '<h4>Error Creating Event Summary</h4>'
          });
        },
        headers: {
          'Content-Type': 'application/json'
        },
        method: 'POST',
        rawdata: data,
        success: function (json) {
          window.location.assign('php/event-summary/download.php?file=' + json.file);

          _app.StatusBar.removeItem('rtf');
        },
        url: 'php/event-summary/create.php'
      });
    });
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Rtf;
