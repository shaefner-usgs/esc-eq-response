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
      _magThreshold,
      _plots,
      _sortField,
      _sortOrder,

      _compare,
      _create,
      _destroy,
      _filter,
      _getBeachBalls,
      _getData,
      _getDescriptions,
      _getParams,
      _getPlotDivs,
      _getPromise,
      _getPromises,
      _upload;


  _initialize = function (options = {}) {
    _app = options.app;

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

    if (_sortField) { // not set for unsorted (i.e. single row) tables
      aVal = a[_sortField];
      bVal = b[_sortField];

      // Case insensitive sort for strings
      if (typeof a[_sortField] === 'string') {
        aVal = a[_sortField].toUpperCase();
      }
      if (typeof b[_sortField] === 'string') {
        bVal = b[_sortField].toUpperCase();
      }

      // Use ISO time to sort date/time fields
      if (_sortField === 'userTime' || _sortField === 'utcTime') {
        aVal = a.isoTime;
        bVal = b.isoTime;
      }

      if (aVal > bVal) {
        comparison = 1;
      } else if (aVal < bVal) {
        comparison = -1;
      }

      if (_sortOrder === 'up') {
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
    _magThreshold = null;
    _plots = null;
    _sortField = null;
    _sortOrder = null;

    _compare = null;
    _create = null;
    _destroy = null;
    _filter = null;
    _getBeachBalls = null;
    _getData = null;
    _getDescriptions = null;
    _getParams = null;
    _getPlotDivs = null;
    _getPromise = null;
    _getPromises = null;
    _upload = null;
  };

  /**
   * Filter out earthquakes below the current magnitude threshold setting of the
   * Feature's range Slider on the SummaryPane.
   *
   * @param feature {Object}
   *
   * @return eqs {Array}
   */
  _filter = function (feature) {
    var eqs = feature.data.eqs,
        params = _getParams(feature.id),
        slider = document.querySelector(`#summary-pane .${feature.id} output`);

    _magThreshold = feature.params.magnitude; // default

    if (slider) {
      _magThreshold = Number(slider.value);

      eqs = eqs.filter(eq => eq.mag >= _magThreshold);
    }

    // Set sort options here (not in _compare) so it gets set once/Feature
    if (eqs.length > 1 && params) {
      _sortField = params.field;
      _sortOrder = params.order;
    }

    return eqs;
  };

  /**
   * Get the Focal Mechanism and Moment Tensor beachball images as base64
   * encoded dataURLs, along with their status and update times.
   *
   * @param mainshock {Object}
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
   * @return data {Object}
   */
  _getData = function () {
    var data,
        prefix = (AppUtil.getParam('catalog') === 'dd') ? 'dd-' : '',
        aftershocks = _app.Features.getFeature(`${prefix}aftershocks`),
        descriptions = _getDescriptions(prefix),
        dyfi = _app.Features.getFeature('dyfi'),
        mainshock = _app.Features.getFeature('mainshock'),
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

    data = {
      aftershocks: {
        bins: aftershocks.bins,
        count: aftershocks.count,
        description: descriptions.aftershocks,
        earthquakes: _filter(aftershocks).sort(_compare),
        forecast: forecast.data,
        magThreshold: _magThreshold,
        plots: _plots.aftershocks,
        userTime: aftershocks.data.userTime,
        utcOffset: aftershocks.data.utcOffset,
        utcTime: aftershocks.data.utcTime
      },
      beachballs: _getBeachBalls(),
      dyfi: dyfi.data,
      foreshocks: {
        bins: foreshocks.bins,
        count: foreshocks.count,
        description: descriptions.foreshocks,
        earthquakes: _filter(foreshocks).sort(_compare),
        magThreshold: _magThreshold,
        userTime: foreshocks.data.userTime,
        utcOffset: foreshocks.data.utcOffset,
        utcTime: foreshocks.data.utcTime
      },
      historical: {
        bins: historical.bins,
        count: historical.count,
        description: descriptions.historical,
        earthquakes: _filter(historical).sort(_compare),
        events: historicalEvents.data,
        magThreshold: _magThreshold,
        plots: _plots.historical,
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
      plotNames: _app.PlotsPane.names,
      shakeAlert: shakeAlert.data,
      shakemap: shakemap.data,
      tectonic: tectonic[0]?.contents?.['']?.bytes || '',
      urls: {
        app: location.href,
        eventPage: eq.url
      },
      zone: AppUtil.getParam('timezone') || 'utc'
    };

    return data;
  };

  /**
   * Get the Feature descriptions from the SummaryPane text.
   *
   * @param prefix {String}
   *
   * @return descriptions {Object}
   */
  _getDescriptions = function (prefix) {
    var descriptions = {},
        el = document.getElementById('summary-pane'),
        features = ['aftershocks', 'foreshocks', 'historical'];

    features.forEach(id => {
      var description = el.querySelector(`.${prefix}${id} .description`);
      descriptions[id] = description.innerText;
    });

    return descriptions;
  };

  /**
   * Get the sort parameters for the given Feature's earthquake list.
   *
   * @param id {String}
   *     Feature id
   *
   * @return {Object}
   */
  _getParams = function (id) {
    var el, field, order,
        regex1 = /sort-(up|down)/, // current sorted-by field
        regex2 = /sort-\w+/, // sorting algorithm's CSS classes
        ths = document.querySelectorAll(`.${id} .sortable th`);

    if (ths.length === 0) { // un-sorted table (only 1 data row)
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
    field = Array.from(el.classList).find(className =>
      !regex2.test(className)
    );

    return {
      field: field || '',
      order: order || ''
    };
  };

  /**
   * Get Arrays of the visible 2d plots' <div> containers, grouped by Feature.
   *
   * @return divs {Object}
   *     {
   *       featureId: [divs]
   *       ...
   *     }
   */
  _getPlotDivs = function () {
    var plot,
        divs = {},
        params = _app.PlotsPane.params || {};

    Object.keys(params).forEach(featureId => {
      divs[featureId] = [];

      Object.keys(params[featureId]).forEach(id => {
        plot = document.querySelector(`#plots-pane .${featureId} div.${id}`);

        if (
          !plot.classList.contains('hide') &&
          id !== 'hypocenters'
        ) { // skip 'empty' and 3d plots
          divs[featureId].push(params[featureId][id].graphDiv);
        }
      });
    });

    return divs;
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
    var options = {
          body: blob,
          headers: new Headers({
            'Content-Type': 'application/json'
          }),
          method: 'POST'
        },
        path = 'php/event-summary/',
        resource = {
          id: 'rtf',
          name: 'Event Summary',
          url: location.origin + location.pathname + path + 'create.php'
        };

    JsonFeed({
      app: _app
    }).fetch(resource, options).then(json => {
      if (json.file) {
        location.assign(path + 'download.php?file=' + json.file);
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
