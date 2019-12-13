'use strict';


var Xhr = require('util/Xhr');


/**
 * Load PHP script and pass in POST data to create RTF summary document
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

      _getPostData;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
  };

  /**
   * Get POST data key-value pairs used to create Event Summary document
   *
   * @return data {Object}
   */
  _getPostData = function () {
    var aftershocks,
        contents,
        data,
        dyfi,
        feeds,
        foreshocks,
        historical,
        mainshock,
        pager,
        pagerCities,
        pagerExposures,
        products,
        shakemap,
        summary;

    aftershocks = _app.Features.getFeature('aftershocks');
    feeds = _app.Feeds.getFeeds();
    foreshocks = _app.Features.getFeature('foreshocks');
    historical = _app.Features.getFeature('historical');
    mainshock = _app.Features.getFeature('mainshock');
    pagerCities = _app.Features.getFeature('pager-cities');
    pagerExposures = _app.Features.getFeature('pager-exposures');
    products = mainshock.json.properties.products;

    if (products.dyfi) {
      contents = products.dyfi[0].contents;
      dyfi = {
        map: contents[products.dyfi[0].code + '_ciim_geo.jpg'].url,
        plot: contents[products.dyfi[0].code + '_plot_atten.jpg'].url,
        maxmmi: Number(products.dyfi[0].properties.maxmmi),
        responses: Number(products.dyfi[0].properties.numResp)
      };
    }
    if (products['general-text']) {
      summary = products['general-text'][0].contents[''].bytes;
    }
    if (products.losspager) {
      contents = products.losspager[0].contents;
      pager = {
        alert: products.losspager[0].properties.alertlevel,
        economic: contents['alertecon_smaller.png'].url,
        exposure: contents['exposure.png'].url,
        fatalities: contents['alertfatal_smaller.png'].url
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

    // Must send appropriate type for 'empty' values (not js 'undefined' prop)
    data = {
      aftershocks: {
        bins: aftershocks.bins,
        description: aftershocks.description,
        forecast: aftershocks.forecast || [],
        model: aftershocks.model || {}
      },
      depth: mainshock.json.geometry.coordinates[2],
      dyfi: dyfi || {},
      eqid: mainshock.json.id,
      foreshocks: {
        bins: foreshocks.bins,
        description: foreshocks.description
      },
      historical: {
        bins: historical.bins,
        description: historical.description
      },
      mag: mainshock.json.properties.mag,
      magType: mainshock.json.properties.magType,
      pager: pager || {},
      'pager-cities': pagerCities.cities,
      'pager-exposures': pagerExposures.exposures,
      place: mainshock.json.properties.place,
      shakemap: shakemap || '',
      'tectonic-summary': summary || '',
      time: {
        local: mainshock.localTime,
        utc: mainshock.utcTime
      },
      title: mainshock.json.properties.title,
      urls: {
        app: window.location.href,
        eventPage: mainshock.json.properties.url
      }
    };

    // Add feed data fetched for Event Summary document
    Object.keys(feeds).forEach(function(id) {
      data[id] = feeds[id].json;
    });

    return data;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Create Event Summary document (RTF) and trigger download
   */
  _this.create = function () {
    Xhr.ajax({
      data: _getPostData(),
      error: function (e, xhr) {
        console.error(xhr.statusText + xhr.responseText);
      },
      method: 'POST',
      success: function (json) {
        window.location = 'php/event-summary/download.php?file=' + json.file;
      },
      url: 'php/event-summary/rtf.php'
    });
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Rtf;
