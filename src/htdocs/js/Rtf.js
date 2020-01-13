'use strict';


var Xhr = require('util/Xhr');


/**
 * Create Event Summary RTF document by sending a json string as raw POST data
 *   to a PHP script
 *
 * @param options {Object}
 *   {
 *     app: {Object}, // Application
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

      _getPostData,
      _getProducts;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
  };

  /**
   * Get POST data json object used to create Event Summary document
   *
   * @return data {Object}
   */
  _getPostData = function () {
    var aftershocks,
        data,
        feeds,
        foreshocks,
        historical,
        mainshock,
        pagerCities,
        pagerExposures,
        products,
        properties;

    aftershocks = _app.Features.getFeature('aftershocks');
    feeds = _app.Feeds.getFeeds();
    foreshocks = _app.Features.getFeature('foreshocks');
    historical = _app.Features.getFeature('historical');
    mainshock = _app.Features.getFeature('mainshock');
    pagerCities = _app.Features.getFeature('pager-cities');
    pagerExposures = _app.Features.getFeature('pager-exposures');
    products = _getProducts(mainshock.json.properties.products);
    properties = mainshock.json.properties;

    // IMPORTANT: Set appropriate types for 'empty' values (i.e. not js 'undefined')
    data = {
      aftershocks: {
        bins: aftershocks.bins,
        description: aftershocks.description,
        forecast: aftershocks.forecast || [],
        model: aftershocks.model || {}
      },
      depth: mainshock.json.geometry.coordinates[2],
      dyfi: products.dyfi || {},
      eqid: mainshock.json.id,
      foreshocks: {
        bins: foreshocks.bins,
        description: foreshocks.description
      },
      historical: {
        bins: historical.bins,
        description: historical.description
      },
      mag: properties.mag,
      magType: properties.magType,
      pager: products.pager || {},
      'pager-cities': pagerCities.cities || {},
      'pager-exposures': pagerExposures.exposures || {},
      place: properties.place,
      shakemap: products.shakemap || '',
      summary: products.summary || '',
      time: {
        local: mainshock.localTime,
        utc: mainshock.utcTime
      },
      title: properties.title,
      urls: {
        app: window.location.href,
        eventPage: properties.url
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

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Create Event Summary RTF file and then trigger download of file
   */
  _this.create = function () {
    var data = JSON.stringify(_getPostData());

    Xhr.ajax({
      error: function (e, xhr) {
        console.error(xhr.statusText + xhr.responseText);

        _app.StatusBar.addError({
          id: 'rtf'
        }, '<h4>Error Creating Event Summary</h4>');
      },
      headers: {
        'Content-Type': 'application/json'
      },
      method: 'POST',
      rawdata: data,
      success: function (json) {
        //window.location.assign('php/event-summary/download.php?file=' + json.file);
        // Testing environment:
        window.location.assign('http://localhost:8888/php/event-summary/download.php?file=' + json.file);

        _app.StatusBar.removeItem('rtf');
      },
      //url: 'php/event-summary/create.php'
      // Testing environment:
      url: 'http://localhost:8888/php/event-summary/create.php'
    });
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Rtf;
