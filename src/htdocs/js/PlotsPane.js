/* global Plotly */
'use strict';


var AppUtil = require('util/AppUtil');


/**
 * Create interactive plots using Plotly. Add/remove/render a Feature's plots
 * when they are created/updated using external feed data.
 *
 * @param options {Object}
 *   {
 *     app: {Object} Application
 *     el: {Element}
 *   }
 *
 * @return _this {Object}
 *   {
 *     addFeature: {Function}
 *     addLoader: {Function}
 *     getPlots: {Function}
 *     removeFeature: {Function}
 *     render: {Function}
 *     rendered: {Boolean}
 *     reset: {Function}
 *     resize: {Function}
 *   }
 */
var PlotsPane = function (options) {
  var _this,
      _initialize,

      _app,
      _contentEl,
      _el,
      _plots,

      _addContainer,
      _addCount,
      _addListeners,
      _getPlotlyConfig,
      _getPlotlyData,
      _getPlotlyLayout,
      _getPlotlyParams,
      _getRatio,
      _isActive;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _el = options.el || document.createElement('section');
    _contentEl = _el.querySelector('.content');
    _plots = {};

    _this.rendered = false;

    // Make plots responsive
    window.onresize = function () {
      _this.resize();
    };
  };

  /**
   * Add a plot's container and name to the DOM.
   *
   * @param featureId {String}
   * @param plotId {String <cumulative|hypocenters|magtime>}
   *
   * @return container {Element}
   */
  _addContainer = function (featureId, plotId) {
    var container,
        h3,
        names,
        parent;

    container = document.createElement('div');
    h3 = document.createElement('h3');
    names = {
      cumulative: 'Cumulative Earthquakes',
      hypocenters: '3D Hypocenters',
      magtime: 'Magnitude vs. Time'
    };
    parent = _contentEl.querySelector('.' + featureId + ' .bubble');

    h3.innerHTML = names[plotId];

    container.classList.add(plotId);
    parent.appendChild(h3);
    parent.appendChild(container);

    return container;
  };

  /**
   * Add the count value to the Feature's name and hide the 'loader'.
   *
   * @param feature {Object}
   * @param div {Element}
   */
  _addCount = function (feature, div) {
    var count,
        loader;

    loader = div.querySelector('.breather');

    if (loader) {
      loader.classList.add('hide');
    }

    if (Object.prototype.hasOwnProperty.call(feature, 'count')) {
      count = document.createElement('span');

      count.classList.add('count', 'hide');
      count.textContent = feature.count;

      div.querySelector('h2').appendChild(count);

      // Trigger a reflow (to enable CSS transition), then unhide
      count.focus();
      count.classList.remove('hide');
    }
  };

  /**
   * Add event listeners.
   *
   * @param plot {Element}
   */
  _addListeners = function (plot) {
    var eqids,
        featureId,
        index,
        plotId,
        points;

    // Show the map and open a popup when the user clicks an eq on a 2d plot
    plot.on('plotly_click', data => {
      points = data.points[0];
      eqids = points.data.eqid;
      featureId = points.data.feature;
      index = points.pointNumber;
      plotId = points.data.plotid;

      // The first point (index 0) on cumulative aftershocks curve is Mainshock
      if (index === 0 && plotId === 'cumulative' && featureId === 'aftershocks') {
        featureId = 'mainshock';
      }

      _app.MapPane.openPopup(eqids[index], featureId);
    });
  };

  /**
   * Get the Plotly config option for a plot.
   *
   * @param featureId {String}
   * @param plotId {String <cumulative|hypocenters|magtime>}
   *
   * @return config {Object}
   */
  _getPlotlyConfig = function (featureId, plotId) {
    var config,
        eqid,
        opts;

    config = {
      displaylogo: false,
      modeBarButtonsToAdd: [{
        click: gd => {
          eqid = AppUtil.getParam('eqid');
          opts = {
            filename: eqid + '-' + featureId + '-' + plotId,
            format: 'svg',
            height: 500,
            width: 1200
          };

          if (gd.classList.contains('hypocenters')) {
            opts.height = 1000;
          }

          Plotly.downloadImage(gd, opts);
        },
        icon: Plotly.Icons.camera,
        name: 'toImage2',
        title: 'Download plot (.svg)'
      }],
      modeBarButtonsToRemove: ['hoverClosest3d','hoverClosestCartesian',
        'hoverCompareCartesian', 'lasso2d', 'resetCameraDefault3d',
        'resetScale2d', 'select2d', 'sendDataToCloud', 'toggleSpikelines',
        'toImage'
      ]
    };

    return config;
  };

  /**
   * Get the Plotly data option for a plot. The Mainshock's trace is added to
   * hypocenters and magtime plots.
   *
   * @param feature {Object}
   * @param plotId {String <cumulative|hypocenters|magtime>}
   *
   * @return data {Array}
   */
  _getPlotlyData = function (feature, plotId) {
    var data = [
      feature.plotTraces[plotId]
    ];

    if (plotId === 'hypocenters' || plotId === 'magtime') {
      data.push(_app.Features.getFeature('mainshock').plotTraces[plotId]);
    }

    return data;
  };

  /**
   * Get the Plotly layout option for a plot.
   *
   * @param plotId {String <cumulative|hypocenters|magtime>}
   * @param zRatio {Number} optional
   *     only needed for hypocenters plot
   *
   * @return layout {Object}
   */
  _getPlotlyLayout = function (plotId, zRatio) {
    var color,
        layout,
        spikecolor;

    color = '#555';
    layout = {
      font: {
        family: '"Helvetica Neue", Helvetica, Arial, sans-serif'
      },
      hovermode: 'closest',
      margin: {
        b: 50,
        l: 50,
        r: 50,
        t: 0
      },
      showlegend: false
    };
    spikecolor = '#4440CC'; // accent-color

    if (plotId === 'hypocenters') {
      layout.scene = {
        aspectmode: 'manual',
        aspectratio: {
          x: 1,
          y: 1,
          z: zRatio
        },
        camera: {
          eye: {
            'x': 0,
            'y': -0.001,
            'z': 2
          }
        },
        xaxis: {
          spikecolor: spikecolor,
          title: {
            font: {
              color: color
            },
            text: 'Longitude'
          },
          zeroline: false
        },
        yaxis: {
          spikecolor: spikecolor,
          title: {
            font: {
              color: color
            },
            text: 'Latitude'
          },
          zeroline: false
        },
        zaxis: {
          spikecolor: spikecolor,
          title: {
            font: {
              color: color
            },
            text: 'Depth (km)'
          },
          zeroline: false
        }
      };
    } else {
      layout.xaxis = {
        title: {
          font: {
            color: color
          },
          text: 'Time (UTC)'
        }
      };
    }

    if (plotId === 'magtime') {
      layout.yaxis = {
        title: {
          font: {
            color: color
          },
          text: 'Magnitude'
        }
      };
    } else {
      layout.yaxis = {
        title: {
          font: {
            color: color
          },
          text: 'Earthquakes'
        }
      };
    }

    return layout;
  };

  /**
   * Get the Plotly parameters that are used to instantiate a new plot.
   *
   * @param feature {Object}
   * @param plotId {String <cumulative|hypocenters|magtime>}
   *
   * @return {Object}
   *     Plotly.newPlot signature
   */
  _getPlotlyParams = function (feature, plotId) {
    var container,
        zRatio;

    container = _addContainer(feature.id, plotId);

    if (plotId === 'hypocenters') {
      zRatio = _getRatio(feature.plotTraces.hypocenters);
    }

    return {
      graphDiv: container,
      options: {
        data: _getPlotlyData(feature, plotId),
        layout: _getPlotlyLayout(plotId, zRatio),
        config: _getPlotlyConfig(feature.id, plotId)
      }
    };
  };

  /**
   * Get the ratio of depth:latitude for scaling a 3d plot.
   *
   * @param trace {Object}
   *     plot's data trace
   *
   * @return ratio {Number}
   */
  _getRatio = function (trace) {
    var depthExtent,
        depthRange,
        latExtent,
        latRange,
        ratio;

    depthExtent = AppUtil.extent(trace.z);
    depthRange = depthExtent[1] - depthExtent[0];
    latExtent = AppUtil.extent(trace.y);
    latRange = 111 * Math.abs(latExtent[1] - latExtent[0]);
    ratio = depthRange / latRange;

    return ratio;
  };

  /**
   * Check if PlotsPane is currently active.
   *
   * @return {Boolean}
   */
  _isActive = function () {
    if (location.hash === '#plotsPane') {
      return true;
    }

    return false;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add a Feature's plots. Plots are created, but not rendered, until PlotsPane
   * is active.
   *
   * @param feature {Object}
   */
  _this.addFeature = function (feature) {
    var div,
        html,
        params;

    // Skip Mainshock (it's included in other Features' plots)
    if (feature.plotTraces && feature.id !== 'mainshock') {
      div = _el.querySelector('div.' + feature.id);
      html = `<div class="bubble">${feature.description}</div>`;
      params = {};

      // Inserting node this way preserves CSS transitions
      div.insertAdjacentHTML('beforeend', html);

      Object.keys(feature.plotTraces).forEach(plotId => {
        if (feature.plotTraces[plotId]) { // null if no data
          if (plotId !== 'cumulative' || feature.count > 1) { // skip cumul. plot w/ 1eq
            params[plotId] = _getPlotlyParams(feature, plotId);
          }
        }
      });

      _plots[feature.id] = {
        params: params,
        rendered: false
      };

      _addCount(feature, div);

      if (_isActive()) {
        _this.render();
      }
    }
  };

  /**
   * Add a Feature's container, name and 'loader'.
   *
   * @param feature {Object}
   */
  _this.addLoader = function (feature) {
    var div;

    // Mainshock is included in other Features' plots, but not on its own
    if (Object.prototype.hasOwnProperty.call(feature, 'plotTraces') &&
      feature.id !== 'mainshock'
    ) {
      div = document.createElement('div');
      div.innerHTML = '<h2>' + feature.name + '<span class="breather">' +
        '<span></span></span></h2>';

      div.classList.add(feature.id, 'feature');

      _contentEl.appendChild(div);
    }
  };

  /**
   * Get Plotly params for all Features that have plots.
   *
   * @return _plots {Object}
   */
  _this.getPlots = function () {
    return _plots;
  };

  /**
   * Remove a Feature's plots.
   *
   * @param feature {Object}
   */
  _this.removeFeature = function (feature) {
    var el,
        plots;

    el = _el.querySelector('.' + feature.id);

    if (el) {
      plots = el.querySelectorAll('.js-plotly-plot');

      plots.forEach(plot =>
        Plotly.purge(plot)
      );

      el.parentNode.removeChild(el);
    }
  };

  /**
   * Render plots.
   */
  _this.render = function () {
    var graphDiv,
        options,
        path,
        params,
        rendered,
        resetButton;

    // Loop thru plots by Feature
    Object.keys(_plots).forEach(id => {
      params = _plots[id].params;
      rendered = _plots[id].rendered;

      if (!rendered) {
        // Loop thru plot types
        Object.keys(params).forEach(plotId => {
          graphDiv = params[plotId].graphDiv;
          options = params[plotId].options;

          Plotly.newPlot(graphDiv, options);

          if (plotId !== 'hypocenters') { // skip click events on 3d plots
            _addListeners(graphDiv);
          }
        });

        _plots[id].rendered = true;

        // Change 'reset camera' button -> 'autoscale' for consistency w/ other plots
        if (params.hypocenters) {
          resetButton = params.hypocenters.graphDiv.querySelector(
            '[data-attr="resetLastSave"]'
          );
          path = resetButton.querySelector('path');

          path.setAttribute('d', 'm250 850l-187 0-63 0 0-62 0-188 63 0 0 188 ' +
            '187 0 0 62z m688 0l-188 0 0-62 188 0 0-188 62 0 0 188 0 62-62 ' +
            '0z m-875-938l0 188-63 0 0-188 0-62 63 0 187 0 0 62-187 0z m875 ' +
            '188l0-188-188 0 0-62 188 0 62 0 0 62 0 188-62 0z m-125 188l-1 ' +
            '0-93-94-156 156 156 156 92-93 2 0 0 250-250 0 0-2 93-92-156-156-156 ' +
            '156 94 92 0 2-250 0 0-250 0 0 93 93 157-156-157-156-93 94 0 0 ' +
            '0-250 250 0 0 0-94 93 156 157 156-157-93-93 0 0 250 0 0 250z');
          resetButton.setAttribute('data-title', 'Autoscale');
        }
      }
    });

    _this.rendered = true;
  };

  /**
   * Reset to default state.
   */
  _this.reset = function () {
    _plots = {};

    _contentEl.innerHTML = '';
    _this.rendered = false;
  };

  /**
   * Resize plots: adds responsive / fluid sizing
   */
  _this.resize = function () {
    var plots = _el.querySelectorAll('.js-plotly-plot');

    if (_isActive()) {
      plots.forEach(plot =>
        Plotly.Plots.resize(plot)
      );
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = PlotsPane;
