/* global Plotly */
'use strict';


var AppUtil = require('util/AppUtil');


/**
 * Create an Event Summary RTF document using a JSON string that is sent as a
 * POST data Blob to a PHP script that generates the binary file.
 *
 * @param options {Object}
 *   {
 *     app: {Object} Application
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
      _getSortValues;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
  };

  /**
   * Comparison function to sort an Array of earthquakes by _sortKey.
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

    if (_sortKey) { // not set for unsorted (i.e. single row) tables
      aValue = a[_sortKey];
      bValue = b[_sortKey];
      comparison = 0;

      // Case insensitive sort for strings
      if (typeof a[_sortKey] === 'string') {
        aValue = a[_sortKey].toUpperCase();
      }
      if (typeof b[_sortKey] === 'string') {
        bValue = b[_sortKey].toUpperCase();
      }

      // Use ISO time to sort date/time fields
      if (_sortKey === 'utcTime') {
        aValue = a.isoTime;
        bValue = b.isoTime;
      }

      if (aValue > bValue) {
        comparison = 1;
      } else if (aValue < bValue) {
        comparison = -1;
      }

      if (_sortOrder === 'up') {
        comparison *= -1;
      }

      return comparison;
    }
  };

  /**
   * Filter out earthquakes below the current mag threshold which is set on
   * SummaryPane's range slider.
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
    sortValues = _getSortValues(feature.id);

    if (slider) { // eq list has a slider filter
      _magThreshold = Number(slider.value);
      list = feature.list.filter(eq => {
        return eq.mag >= _magThreshold;
      });
    }

    // Set sort key, order here (not in _compare) so it only gets set once/Feature
    if (list.length > 1 && sortValues) {
      _sortKey = sortValues.key;
      _sortOrder = sortValues.order;
    }

    return list;
  };

  /**
   * Get FocalMechanism, MomentTensor beachballs as base64 encoded dataURLs.
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

    Object.keys(canvasEls).forEach(key => {
      beachball = canvasEls[key];

      if (beachball) {
        beachballs[key] = beachball.toDataURL('image/png');
      }
    });

    return beachballs;
  };

  /**
   * Get an Array of <div> containers for all 2d plots, grouped by Feature.
   *
   * @return divs {Object}
   *   {
   *     featureId: [div1, ...]
   *     ...
   *   }
   */
  _getPlotDivs = function () {
    var divs,
        params,
        plots;

    divs = {};
    plots = _app.PlotsPane.getPlots();

    Object.keys(plots).forEach(featureId => {
      divs[featureId] = [];
      params = plots[featureId].params;

      Object.keys(params).forEach(plotId => {
        if (plotId !== 'hypocenters') { // skip 3d plots
          divs[featureId].push(params[plotId].graphDiv);
        }
      });
    });

    return divs;
  };

  /**
   * Get the POST data JSON object used to populate the Event Summary RTF.
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

    // IMPORTANT: Set appropriate types for 'empty' values (i.e. not undefined)
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
      mag: AppUtil.round(props.mag, 1),
      magType: props.magType || 'M',
      pager: products.pager || {},
      'pager-cities': pagerCities.cities || [],
      'pager-exposures': pagerExposures.exposures || {},
      place: props.place,
      shakemap: products.shakemap || '',
      summary: products.summary || '',
      time: {
        local: mainshock.details.localTime,
        utc: mainshock.details.utcTime
      },
      title: props.title,
      urls: {
        app: window.location.href,
        eventPage: props.url
      }
    };

    // Add feed data fetched for Event Summary document
    Object.keys(feeds).forEach(id => {
      data[id] = feeds[id].json;
    });

    return data;
  };

  /**
   * Check if DYFI, PAGER, ShakeMap and Summary products exist, and if they do,
   * return select properties for each.
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
   * Get a Promise to (2d) plot image as a base64 encoded dataURL.
   *
   * @param div {Element}
   * @param id {String}
   *     Feature id
   *
   * @return promise {Object}
   */
  _getPromise = function (div, id) {
    var promise,
        type;

    type = div.classList.item(0); // plot type key
    promise = Plotly.toImage(div, {
      format: 'png',
      height: 300,
      width: 800
    }).then(dataUrl => {
      _plots[id][type] = dataUrl;
    });

    return promise;
  };

  /**
   * Wrapper method to get a Promise to each (2d) plot image.
   *
   * @return promises {Array}
   */
  _getPromises = function () {
    var plotDivs,
        promises;

    plotDivs = _getPlotDivs();
    promises = [];
    _plots = {};

    Object.keys(plotDivs).forEach(id => {
      _plots[id] = {};

      plotDivs[id].forEach(div => {
        promises.push(_getPromise(div, id));
      });
    });

    return promises;
  };

  /**
   * Get the current sort key (set as a CSS class on a <th>) and sort order for
   * an earthquake list.
   *
   * @param id {String}
   *     Feature id
   *
   * @return {Object}
   */
  _getSortValues = function (id) {
    var el,
        key,
        order,
        regex1,
        regex2,
        result,
        ths;

    regex1 = /sort-(up|down)/; // finds current sorted-by th
    regex2 = /sort-\w+/; // finds css classes associated with sorting algorithm
    ths = document.querySelectorAll('.' + id + ' .list.sortable th');

    if (ths.length === 0) { // non-sorted table (only 1 row)
      return;
    }

    ths.forEach(th => {
      th.classList.forEach(className => {
        result = regex1.exec(className);

        if (result) {
          el = th; // field (element) table is sorted by
          order = result[1]; // 'up' or 'down'
        }
      });
    });

    key = Array.from(el.classList).filter(className => {
      return !regex2.test(className); // weeds out sorting algorithm CSS classes
    });

    return {
      key: key[0],
      order: order
    };
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Create the Event Summary RTF and trigger a download of the file.
   */
  _this.create = function () {
    var data,
        url;

    // PHP file that creates the Summary RTF and returns a JSON response
    url = `${location.protocol}//${location.host}/php/event-summary/create.php`;

    // Render plots so that their images can be captured
    if (!_app.PlotsPane.rendered) {
      _app.PlotsPane.render();
    }

    Promise.all(_getPromises()).then(() => {
      data = new Blob([JSON.stringify(_getPostData())], {
        type: 'application/json'
      });

      // Upload data to the server and create the RTF
      _app.JsonFeed.fetch({
        id: 'rtf',
        name: 'Event Summary',
        url: url
      }, {
        body: data,
        headers: new Headers({
          'Content-Type': 'application/json'
        }),
        method: 'POST'
      }).then(json => { // trigger download on success
        if (json.file) {
          window.location.assign('php/event-summary/download.php?file=' + json.file);

          _app.StatusBar.removeItem('rtf');
        } else if (json.error) {
          console.error(json.error);
        }
      });
    });
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Rtf;
