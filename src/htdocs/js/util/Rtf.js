/* global Plotly */
'use strict';


var AppUtil = require('util/AppUtil'),
    JsonFeed = require('util/JsonFeed');


/**
 * Create an Event Summary RTF document for an earthquake. A JSON Blob is sent
 * as POST data to a PHP script that generates the document and upon success, a
 * download dialog is triggered.
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *     }
 */
var Rtf = function (options) {
  var _initialize,

      _app,
      _field,
      _magThreshold,
      _order,
      _plots,

      _compare,
      _create,
      _destroy,
      _filter,
      _getBeachBalls,
      _getData,
      _getParams,
      _getPlotDivs,
      _getProducts,
      _getPromise,
      _getPromises,
      _upload;


  _initialize = function (options = {}) {
    _app = options.app;

    _create();
  };

  /**
   * Comparison function to sort an Array of earthquakes.
   *
   * @params a, b {Objects}
   *
   * @return comparison {Integer}
   */
  _compare = function (a, b) {
    var aVal, bVal,
        comparison = 0; // default

    if (_field) { // not set for unsorted (i.e. single row) tables
      aVal = a[_field];
      bVal = b[_field];

      // Case insensitive sort for strings
      if (typeof a[_field] === 'string') {
        aVal = a[_field].toUpperCase();
      }
      if (typeof b[_field] === 'string') {
        bVal = b[_field].toUpperCase();
      }

      // Use ISO time to sort date/time fields
      if (_field === 'userTime' || _field === 'utcTime') {
        aVal = a.isoTime;
        bVal = b.isoTime;
      }

      if (aVal > bVal) {
        comparison = 1;
      } else if (aVal < bVal) {
        comparison = -1;
      }

      if (_order === 'up') {
        comparison *= -1;
      }

      return comparison;
    }
  };

  /**
   * Kick off the process of creating the Event Summary RTF.
   */
  _create = function () {
    // Render plots so that their images can be captured
    if (!_app.PlotsPane.rendered) {
      _app.PlotsPane.render();
    }

    // Create the data Blob, including the plot images and beachballs
    Promise.all(_getPromises()).then(() => {
      var blob = new Blob([JSON.stringify(_getData())], {
        type: 'application/json'
      });

      _upload(blob);
    });
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _destroy = function () {
    _initialize = null;

    _app = null;
    _field = null;
    _magThreshold = null;
    _order = null;
    _plots = null;

    _compare = null;
    _create = null;
    _destroy = null;
    _filter = null;
    _getBeachBalls = null;
    _getData = null;
    _getParams = null;
    _getPlotDivs = null;
    _getProducts = null;
    _getPromise = null;
    _getPromises = null;
    _upload = null;
  };

  /**
   * Filter out earthquakes below the current magnitude threshold setting of the
   * Feature's range slider on the SummaryPane.
   *
   * @param feature {Object}
   *
   * @return eqs {Array}
   */
  _filter = function (feature) {
    var eqs = feature.data,
        params = _getParams(feature.id),
        slider = document.querySelector('.' + feature.id + ' .filter output');

    _magThreshold = feature.params.magnitude; // default

    if (slider) {
      _magThreshold = Number(slider.value);

      eqs = eqs.filter(eq => eq.mag >= _magThreshold);
    }

    // Set _field, _order here (not in _compare) so it's set once/Feature
    if (eqs.length > 1 && params) {
      _field = params.field;
      _order = params.order;
    }

    return eqs;
  };

  /**
   * Get the FocalMechanism and MomentTensor beachballs as base64 encoded
   * dataURLs.
   *
   * @return beachballs {Object}
   */
  _getBeachBalls = function () {
    var beachballs = {},
        canvasEls = {
          fm: document.querySelector('#focal-mechanism-lightbox canvas'),
          mt: document.querySelector('#moment-tensor-lightbox canvas')
        };

    Object.keys(canvasEls).forEach(key => {
      var beachball = canvasEls[key];

      if (beachball) {
        beachballs[key] = beachball.toDataURL('image/png');
      }
    });

    return beachballs;
  };

  /**
   * Get the data used to create the RTF document.
   *
   * @return data {Object}
   */
  _getData = function () {
    var data,
        prefix = (AppUtil.getParam('catalog') === 'dd' ? 'dd-' : ''),
        aftershocks = _app.Features.getFeature(`${prefix}aftershocks`),
        el = document.getElementById('summaryPane'),
        description = {
          aftershocks: el.querySelector(`.${prefix}aftershocks .description`).innerText,
          foreshocks: el.querySelector(`.${prefix}foreshocks .description`).innerText,
          historical: el.querySelector(`.${prefix}historical .description`).innerText
        },
        forecast = _app.Features.getFeature('forecast'),
        foreshocks = _app.Features.getFeature(`${prefix}foreshocks`),
        historical = _app.Features.getFeature(`${prefix}historical`),
        historicalEvents = _app.Features.getFeature('historical-events'),
        mainshock = _app.Features.getFeature('mainshock'),
        nearbyCities = _app.Features.getFeature('nearby-cities'),
        pagerCities = _app.Features.getFeature('pager-cities'),
        pagerComments = _app.Features.getFeature('pager-comments'),
        pagerExposures = _app.Features.getFeature('pager-exposures'),
        products = _getProducts(mainshock.data.products),
        shakeAlert = _app.Features.getFeature('shake-alert'),
        shakemapInfo = _app.Features.getFeature('shakemap-info'),
        zone = AppUtil.getParam('timezone') || 'utc';

    data = {
      aftershocks: {
        bins: aftershocks.bins,
        count: aftershocks.count,
        description: description.aftershocks,
        earthquakes: _filter(aftershocks).sort(_compare),
        forecast: forecast.forecast,
        magThreshold: _magThreshold,
        model: forecast.model,
        plots: _plots.aftershocks
      },
      beachballs: _getBeachBalls(),
      depthDisplay: mainshock.data.depthDisplay,
      dyfi: products.dyfi,
      eqid: mainshock.data.id,
      foreshocks: {
        bins: foreshocks.bins,
        count: foreshocks.count,
        description: description.foreshocks,
        earthquakes: _filter(foreshocks).sort(_compare),
        magThreshold: _magThreshold
      },
      groundMotions: shakemapInfo.groundMotions,
      historical: {
        bins: historical.bins,
        count: historical.count,
        description: description.historical,
        earthquakes: _filter(historical).sort(_compare),
        magThreshold: _magThreshold,
        plots: _plots.historical
      },
      historicalEvents: historicalEvents.events,
      magDisplay: mainshock.data.magDisplay,
      magType: mainshock.data.magType,
      nearbyCities: nearbyCities.cities,
      notice: products.notice,
      pager: products.pager,
      pagerCities: pagerCities.cities,
      pagerComments: {
        impact1: pagerComments.impact1,
        structComment: pagerComments.structComment
      },
      pagerExposures: pagerExposures.exposures,
      plotNames: _app.PlotsPane.names,
      shakeAlert: shakeAlert.data,
      shakemap: products.shakemap,
      tectonic: products.tectonic,
      time: {
        local: mainshock.data.localTime,
        user: mainshock.data.userTimeDisplay,
        utc: mainshock.data.utcTimeDisplay,
        utcOffset: _app.utcOffset,
        zone: zone
      },
      title: mainshock.data.title,
      urls: {
        app: location.href,
        eventPage: mainshock.data.url
      }
    };

    console.log(data);

    return data;
  };

  /**
   * Get the current sort parameters of the given Feature's earthquake list.
   *
   * @param id {String}
   *     Feature id
   *
   * @return {Object}
   */
  _getParams = function (id) {
    var el, field, order,
        regex1 = /sort-(up|down)/, // used to find current sorted-by field
        regex2 = /sort-\w+/, // used to find sorting algorithm's css classes
        ths = document.querySelectorAll(`.${id} .sortable th`);

    if (ths.length === 0) { // un-sorted table (i.e. only 1 row)
      return;
    }

    ths.forEach(th => {
      th.classList.forEach(className => {
        var result = regex1.exec(className);

        if (result) {
          el = th; // field (Element) table is sorted by
          order = result[1]; // 'up' or 'down'
        }
      });
    });

    // Weed out other (sorting algorithm) CSS classes
    field = Array.from(el.classList).filter(className =>
      !regex2.test(className)
    );

    return {
      field: field[0],
      order: order
    };
  };

  /**
   * Get Arrays of the <div> containers with 2d plots, grouped by Feature.
   *
   * @return divs {Object}
   *     {
   *       featureId: [divs]
   *       ...
   *     }
   */
  _getPlotDivs = function () {
    var divs = {},
        params = _app.PlotsPane.params;

    Object.keys(params).forEach(featureId => {
      divs[featureId] = [];

      Object.keys(params[featureId]).forEach(id => {
        if (id !== 'hypocenters') { // skip 3d plots
          divs[featureId].push(params[featureId][id].graphDiv);
        }
      });
    });

    return divs;
  };

  /**
   * Check if DYFI, Notice, PAGER, ShakeMap and Tectonic products exist, and if
   * they do, return select properties for each.
   *
   * @param products {Object}
   *
   * @return {Object}
   */
  _getProducts = function (products) {
    var contents, dyfi, notice, pager, product, shakemap, tectonic;

    if (products.dyfi) {
      product = products.dyfi[0];
      contents = product.contents;
      dyfi = {
        map: contents[product.code + '_ciim_geo.jpg'].url,
        maxmmi: Number(product.properties.maxmmi),
        plot: contents[product.code + '_plot_atten.jpg'].url,
        responses: Number(product.properties.numResp)
      };
    }

    if (products['general-header']) {
      notice = products['general-header'][0].contents[''].bytes;
    }

    if (products.losspager) {
      product = products.losspager[0];
      contents = product.contents;
      pager = {
        alert: product.properties.alertlevel,
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
      tectonic = products['general-text'][0].contents[''].bytes;
    }

    return {
      dyfi: dyfi || {},
      notice: notice || '',
      pager: pager || {},
      shakemap: shakemap || '',
      tectonic: tectonic || ''
    };
  };

  /**
   * Get a Promise to (2d) plot image as a base64 encoded dataURL.
   *
   * @param div {Element}
   * @param type {String}
   *
   * @return {Object}
   */
  _getPromise = function (div, type) {
    var id = Array.from(div.classList).find(className =>
      className !== 'js-plotly-plot'
    );

    return Plotly.toImage(div, {
      format: 'png',
      height: 300,
      width: 800
    }).then(dataUrl =>
      _plots[type][id] = dataUrl
    );
  };

  /**
   * Wrapper method that gets a Promise to each (2d) plot image.
   *
   * @return promises {Array}
   */
  _getPromises = function () {
    var divs = _getPlotDivs(),
        promises = [];

    _plots = {};

    Object.keys(divs).forEach(featureId => {
      var type = featureId.replace('dd-', ''); // remove prefix from DD FeatureId

      _plots[type] = {};

      divs[featureId].forEach(div =>
        promises.push(_getPromise(div, type))
      );
    });

    return promises;
  };

  /**
   * Upload the data to the server to create the RTF and then trigger a download
   * dialog on success or an error on fail.
   *
   * @param blob {Object}
   */
  _upload = function (blob) {
    var url = location.origin + location.pathname + 'php/event-summary/create.php';

    JsonFeed({
      app: _app
    }).fetch({
      id: 'rtf',
      name: 'Event Summary',
      url: url
    }, {
      body: blob,
      headers: new Headers({
        'Content-Type': 'application/json'
      }),
      method: 'POST'
    }).then(json => {
      if (json.file) {
        location.assign('php/event-summary/download.php?file=' + json.file);

        _app.StatusBar.removeItem('rtf');
      } else if (json.error) {
        console.error(json.error);
      }

      _destroy();
    }).catch(error => {
      _app.StatusBar.addError({
        id: 'rtf',
        message: `<h4>Error Creating Event Summary</h4><ul><li>${error}</li></ul>`
      });

      console.error(error);
      _destroy();
    });
  };


  _initialize(options);
  options = null;
};


module.exports = Rtf;
