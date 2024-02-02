/* global Plotly */
'use strict';


var AppUtil = require('util/AppUtil'),
    JsonFeed = require('util/JsonFeed');


/**
 * Create the Event Summary RTF document for an earthquake. A JSON Blob is sent
 * as POST data to a PHP script that generates the document. Upon success, a
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
      _order,
      _plots,

      _compare,
      _create,
      _destroy,
      _filter,
      _getBeachBalls,
      _getData,
      _getPlotDivs,
      _getPromise,
      _getPromises,
      _getThreshold,
      _upload;


  _initialize = function (options = {}) {
    _app = options.app;
    _plots = {};

    _create();
  };

  /**
   * Comparison function to sort the Array of earthquakes.
   *
   * @params a, b {Objects}
   *
   * @return comparison {Integer}
   */
  _compare = function (a, b) {
    var aVal, bVal,
        comparison = 0; // default

    if (_field) { // not set for unsorted (i.e. empty/single row) tables
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

      if (_order === 'desc') {
        comparison *= -1;
      }

      return comparison;
    }
  };

  /**
   * Create the Event Summary RTF.
   */
  _create = function () {
    // Ensure plots are rendered so their images can be captured
    _app.PlotsPane.render();

    // Create the data Blob, including the plot images and beachballs
    Promise.all(_getPromises()).then(() => {
      var blob = new Blob([JSON.stringify(_getData())], {
        type: 'application/json'
      });

      _upload(blob);
    });
  };

  /**
   * Destroy this Class.
   */
  _destroy = function () {
    _initialize = null;

    _app = null;
    _field = null;
    _order = null;
    _plots = null;

    _compare = null;
    _create = null;
    _destroy = null;
    _filter = null;
    _getBeachBalls = null;
    _getData = null;
    _getPlotDivs = null;
    _getPromise = null;
    _getPromises = null;
    _getThreshold = null;
    _upload = null;
  };

  /**
   * Filter out earthquakes below the UI's current magnitude threshold setting.
   *
   * @param feature {Object}
   *
   * @return eqs {Array}
   */
  _filter = function (feature) {
    var eqs = feature.data.eqs,
        slider = document.querySelector(`#summary-pane .${feature.id} output`),
        threshold = _getThreshold(feature);

    if (slider) {
      eqs = eqs.filter(eq => eq.mag >= threshold);
    }

    // Set sort options here (not in _compare) so it gets set once/Feature
    _field = sessionStorage.getItem(feature.type + '-field');
    _order = sessionStorage.getItem(feature.type + '-order');

    return eqs;
  };

  /**
   * Get the Focal Mechanism and Moment Tensor beachball images as base64
   * encoded dataURLs, along with their status and update times.
   *
   * @return beachballs {Object}
   */
  _getBeachBalls = function () {
    var beachballs = {},
        canvasEls = {
          'focal-mechanism': document.querySelector('#focal-mechanism canvas'),
          'moment-tensor': document.querySelector('#moment-tensor canvas')
        };

    Object.keys(canvasEls).forEach(key => {
      var data,
          beachball = canvasEls[key];

      if (beachball) {
        data = _app.Features.getFeature(key).data || {};
        beachballs[key] = {
          image: beachball.toDataURL('image/png'),
          status: data.status,
          userTime: data.userTime,
          utcOffset: data.utcOffset,
          utcTime: data.utcTime
        };
      }
    });

    return beachballs;
  };

  /**
   * Get the data used to create the RTF document.
   *
   * @return {Object}
   */
  _getData = function () {
    var prefix = (AppUtil.getParam('catalog') === 'dd') ? 'dd-' : '',
        aftershocks = _app.Features.getFeature(`${prefix}aftershocks`),
        dyfi = _app.Features.getFeature('dyfi'),
        mainshock = _app.Features.getMainshock(),
        eq = mainshock.data.eq,
        forecast = _app.Features.getFeature('forecast'),
        foreshocks = _app.Features.getFeature(`${prefix}foreshocks`),
        historical = _app.Features.getFeature(`${prefix}historical`),
        historicalEvents = _app.Features.getFeature('historical-events'),
        nearbyCities = _app.Features.getFeature('nearby-cities'),
        products = eq.products || {},
        notice = products['general-header'] || [],
        pager = _app.Features.getFeature('pager'),
        shakeAlert = _app.Features.getFeature('shake-alert'),
        shakemap = _app.Features.getFeature('shakemap'),
        tectonic = products['general-text'] || [];

    return {
      aftershocks: {
        bins: aftershocks.summary.bins,
        count: aftershocks.count,
        description: aftershocks.description,
        earthquakes: _filter(aftershocks).sort(_compare),
        forecast: forecast.data,
        plots: _plots[`${prefix}aftershocks`],
        threshold: _getThreshold(aftershocks),
        userTime: aftershocks.data.userTime,
        utcOffset: aftershocks.data.utcOffset,
        utcTime: aftershocks.data.utcTime
      },
      beachballs: _getBeachBalls(),
      dyfi: dyfi.data,
      foreshocks: {
        bins: foreshocks.summary.bins,
        count: foreshocks.count,
        description: foreshocks.description,
        earthquakes: _filter(foreshocks).sort(_compare),
        threshold: _getThreshold(foreshocks),
        userTime: foreshocks.data.userTime,
        utcOffset: foreshocks.data.utcOffset,
        utcTime: foreshocks.data.utcTime
      },
      historical: {
        bins: historical.summary.bins,
        count: historical.count,
        description: historical.description,
        earthquakes: _filter(historical).sort(_compare),
        events: historicalEvents.data,
        plots: _plots[`${prefix}historical`],
        threshold: _getThreshold(historical),
        userTime: historical.data.userTime,
        utcOffset: historical.data.utcOffset,
        utcTime: historical.data.utcTime
      },
      mainshock: {
        day: {
          user: eq.userDayofWeek,
          utc: eq.utcDayofWeek
        },
        depthDisplay: eq.depthDisplay,
        eqid: eq.id,
        magDisplay: eq.magDisplay,
        magType: eq.magType,
        time: {
          local: eq.localTimeDisplay,
          user: eq.userTimeDisplay,
          utc: eq.utcTimeDisplay,
        },
        title: eq.title
      },
      nearbyCities: nearbyCities.data,
      notice: notice[0]?.contents?.['']?.bytes || '',
      pager: pager.data,
      shakeAlert: shakeAlert.data,
      shakemap: shakemap.data,
      tectonic: tectonic[0]?.contents?.['']?.bytes || '',
      urls: {
        app: location.href,
        eventPage: eq.url
      },
      zone: AppUtil.getParam('timezone') || 'utc'
    };
  };

  /**
   * Get the visible 2d plots' <div> containers, grouped by Feature id.
   *
   * @return divs {Object}
   *     {
   *       id: [divs]
   *       ...
   *     }
   */
  _getPlotDivs = function () {
    var plot,
        divs = {},
        plotDivs = _app.PlotsPane.plotDivs;

    Object.keys(plotDivs).forEach(id => {
      divs[id] = [];

      Object.keys(plotDivs[id]).forEach(type => {
        plot = document.querySelector(`#plots-pane .${id} div.${type}`);

        if (
          plot && !plot.classList.contains('hide') &&
          type !== 'hypocenters'
        ) { // skip 'empty' and 3d plots
          divs[id].push(plotDivs[id][type]);
        }
      });
    });

    return divs;
  };

  /**
   * Get a Promise to (2d) plot image as a base64 encoded dataURL.
   *
   * @param div {Element}
   * @param id {String}
   *     Feature id
   *
   * @return {Object}
   */
  _getPromise = function (div, id) {
    var type = Array.from(div.classList).find(className =>
      className !== 'js-plotly-plot'
    );

    return Plotly.toImage(div, {
      format: 'png',
      height: 300,
      width: 800
    }).then(dataUrl => {
      var feature = _app.Features.getFeature(id),
          name = feature.plots.getParams(type).layout.name;

      _plots[id][type] = {
        dataUrl: dataUrl,
        name: name
      };
    });
  };

  /**
   * Wrapper method that gets a Promise to each (2d) plot image.
   *
   * @return promises {Array}
   */
  _getPromises = function () {
    var divs = _getPlotDivs(),
        promises = [];

    Object.keys(divs).forEach(id => {
      _plots[id] = {};

      divs[id].forEach(div =>
        promises.push(_getPromise(div, id))
      );
    });

    return promises;
  };

  /**
   * Get the current magnitude threshold.
   *
   * @param feature {Object}
   *
   * @return {Integer}
   */
  _getThreshold = function (feature) {
    var key = feature.type + '-mag';

    return Number(sessionStorage.getItem(key)) || feature.summary.threshold;
  };

  /**
   * Upload the data to the server to create the RTF and then trigger a download
   * dialog on success or an error on fail.
   *
   * @param blob {Object}
   */
  _upload = function (blob) {
    var path = 'php/event-summary';

    JsonFeed({
      app: _app
    }).fetch({
      id: 'rtf',
      name: 'Event Summary',
      url: location.origin + location.pathname + path + '/create.php'
    }, {
      body: blob,
      headers: new Headers({
        'Content-Type': 'application/json'
      }),
      method: 'POST'
    }).then(json => {
      if (json.file) {
        location.assign(path + '/download.php?file=' + json.file);
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
