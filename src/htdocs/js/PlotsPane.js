/* global Plotly */
'use strict';


var AppUtil = require('AppUtil');


/**
 * Set up and create Plotly.js plots; also adds / removes plots
 *
 * @param options {Object}
 *   {
 *     app: {Object}, // Application
 *     el: {Element}
 *   }
 *
 * @return _this {Object}
 *   {
 *     addFeature: {Function},
 *     addLoadingSpinner: {Function},
 *     getPlots: {Function},
 *     removeFeature: {Function},
 *     render: {Function},
 *     rendered: {Boolean},
 *     reset: {Function},
 *     resize: {Function}
 *   }
 */
var PlotsPane = function (options) {
  var _this,
      _initialize,

      _app,
      _el,
      _featuresEl,
      _plots,

      _addListeners,
      _addPlotContainer,
      _checkIfActive,
      _getPlotlyConfig,
      _getPlotlyLayout,
      _getPlotlyParams,
      _getPlotlyTraces,
      _getRatio;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _el = options.el || document.createElement('div');
    _featuresEl = _el.querySelector('.features');
    _plots = {};

    _this.rendered = false;

    // Make plots responsive
    window.onresize = function () {
      _this.resize();
    };
  };

  /**
   * Add event listeners to earthquakes on 2d plots, which open popups on map
   *
   * @param plot {Element}
   */
  _addListeners = function (plot) {
    var eqids,
        featureId,
        index,
        plotId,
        points;

    plot.on('plotly_click', function (data) {
      points = data.points[0];

      eqids = points.data.eqid;
      featureId = points.data.feature;
      index = points.pointNumber;
      plotId = points.data.plotid;

      // First point (at index 0) on cumulative aftershocks curve is mainshock
      if (index === 0 && plotId === 'cumulative' && featureId === 'aftershocks') {
        featureId = 'mainshock';
      }

      _app.MapPane.openPopup(featureId, eqids[index]);
    });
  };

  /**
   * Add plot's container / title to DOM
   *
   * @param featureId {String}
   * @param plotId {String}
   * @param plotTitle {String}
   *
   * @return container {Element}
   */
  _addPlotContainer = function (featureId, plotId, plotTitle) {
    var container,
        h3,
        parent;

    container = document.createElement('div');
    container.classList.add(plotId);

    h3 = document.createElement('h3');
    h3.innerHTML = plotTitle;

    parent = _featuresEl.querySelector('.' + featureId);
    parent.appendChild(h3);
    parent.appendChild(container);

    return container;
  };

  /**
   * Check if plots pane is currently active
   *
   * @return {Boolean}
   */
  _checkIfActive = function () {
    if (location.hash === '#plotsPane') {
      return true;
    }

    return false;
  };

  /**
   * Get plot config option for Plotly.js
   *
   * @param featureId {String}
   * @param plotId {String}
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
        click: function(gd) {
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
   * Get plot layout option for Plotly.js
   *
   * @param plotId {String}
   * @param zRatio {Number}
   *     optional; only needed for hypocenters plot
   *
   * @return layout {Object}
   */
  _getPlotlyLayout = function (plotId, zRatio) {
    var layout,
        spikecolor,
        titlefont;

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
    spikecolor = '#7234dc';
    titlefont = {
      color: '#555'
    };

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
          title: 'Longitude',
          titlefont: titlefont,
          zeroline: false
        },
        yaxis: {
          spikecolor: spikecolor,
          title: 'Latitude',
          titlefont: titlefont,
          zeroline: false
        },
        zaxis: {
          spikecolor: spikecolor,
          title: 'Depth (km)',
          titlefont: titlefont,
          zeroline: false
        }
      };
    } else {
      layout.xaxis = {
        title: 'Time (UTC)',
        titlefont: titlefont
      };
    }

    if (plotId === 'magtime') {
      layout.yaxis = {
        title: 'Magnitude',
        titlefont: titlefont
      };
    } else {
      layout.yaxis = {
        title: 'Earthquakes',
        titlefont: titlefont
      };
    }

    return layout;
  };

  /**
   * Get Plotly.js parameters used to instantiate plots
   *
   * @param feature {Object}
   * @param plotId {String <cumulative | hypocenters | magtime>}
   *
   * @return {Object}
   *     Plotly.newPlot signature
   */
  _getPlotlyParams = function (feature, plotId) {
    var config,
        container,
        data,
        layout,
        titles,
        zRatio;

    titles = {
      cumulative: 'Cumulative Earthquakes',
      hypocenters: '3D Hypocenters',
      magtime: 'Magnitude vs. Time'
    };

    if (plotId === 'hypocenters') {
      zRatio = _getRatio(feature.plotTraces.hypocenters);
    }

    config = _getPlotlyConfig(feature.id, plotId);
    container = _addPlotContainer(feature.id, plotId, titles[plotId]);
    data = _getPlotlyTraces(feature, plotId);
    layout = _getPlotlyLayout(plotId, zRatio);

    return {
      graphDiv: container,
      options: {
        data: data,
        layout: layout,
        config: config
      }
    };
  };

  /**
   * Get plot traces option for Plotly.js (mainshock trace is added to
   *   hypocenters, magtime plots)
   *
   * @param feature {Object}
   * @param plotId {String}
   *
   * @return traces {Array}
   */
  _getPlotlyTraces = function (feature, plotId) {
    var traces;

    traces = [
      feature.plotTraces[plotId]
    ];
    if (plotId === 'hypocenters' || plotId === 'magtime') {
      traces.push(_app.Features.getFeature('mainshock').plotTraces[plotId]);
    }

    return traces;
  };

  /**
   * Get ratio of depth values to latitude values to scale 3d plot correctly
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

    depthExtent = Plotly.d3.extent(trace.z);
    depthRange = depthExtent[1] - depthExtent[0];
    latExtent = Plotly.d3.extent(trace.y);
    latRange = 111 * Math.abs(latExtent[1] - latExtent[0]);
    ratio = depthRange / latRange;

    return ratio;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add a Feature to plots pane - creates plots, but only renders them once
   *   plots pane is visible
   *
   * @param feature {Object}
   */
  _this.addFeature = function (feature) {
    var count,
        div,
        isActive,
        params,
        spinner;

    // Skip mainshock (it's included in other Features' plots)
    if (feature.plotTraces && feature.id !== 'mainshock') {
      div = _el.querySelector('div.' + feature.id);
      spinner = div.querySelector('.spinner');

      if (spinner) { // hide loading spinner
        spinner.classList.add('hide');
      }

      if (feature.hasOwnProperty('count')) { // add count to Feature name
        count = document.createElement('span');
        count.classList.add('count', 'hide');
        count.textContent = feature.count;

        div.querySelector('h2').appendChild(count);

        // Trigger a reflow, then unhide (to enable CSS transition)
        count.focus();
        count.classList.remove('hide');
      }

      div.insertAdjacentHTML('beforeend', feature.description); // preserves CSS transition

      params = {};
      Object.keys(feature.plotTraces).forEach(function(plotId) {
        if (feature.plotTraces[plotId]) { // null if no data
          if (plotId !== 'cumulative' || feature.count > 1) { // skip cumul. plot w/ 1eq
            params[plotId] = _getPlotlyParams(feature, plotId);
          }
        }
      });

      // Plot.ly params to create plot
      _plots[feature.id] = {
        params: params,
        rendered: false
      };

      isActive = _checkIfActive();
      if (isActive) {
        _this.render();
      }
    }
  };

  /**
   * Add a Feature's container, name and a loading 'spinner' to plots pane
   *
   * @param feature {Object}
   */
  _this.addLoadingSpinner = function (feature) {
    var div;

    // Mainshock is included in other Features' plots, but not separately
    if (feature.plotTraces && feature.id !== 'mainshock') {
      div = document.createElement('div');
      div.classList.add('content', 'feature', feature.id);
      div.innerHTML = '<h2>' + feature.name + '<div class="spinner">' +
        '<div></div></div></h2>';

      _featuresEl.appendChild(div);
    }
  };

  /**
   * Get Plot.ly params for all Features that have plots
   *
   * @return {Object}
   */
  _this.getPlots = function () {
    return _plots;
  };

  /**
   * Remove a Feature from plots pane
   *
   * @param feature {Object}
   */
  _this.removeFeature = function (feature) {
    var el,
        i,
        plots;

    el = _el.querySelector('.' + feature.id);

    if (el) {
      plots = el.querySelectorAll('.js-plotly-plot');

      for (i = 0; i < plots.length; i ++) {
        Plotly.purge(plots[i]);
      }
      el.parentNode.removeChild(el);
    }
  };

  /**
   * Render plots
   */
  _this.render = function () {
    var graphDiv,
        options,
        path,
        params,
        rendered,
        resetButton;

    // Loop thru Features
    Object.keys(_plots).forEach(function(featureId) {
      params = _plots[featureId].params;
      rendered = _plots[featureId].rendered;

      if (!rendered) {
        // Loop thru plot types for Feature
        Object.keys(params).forEach(function(plotId) {
          graphDiv = params[plotId].graphDiv;
          options = params[plotId].options;

          Plotly.newPlot(graphDiv, options);
          if (plotId !== 'hypocenters') { // skip click events on 3d plots
            _addListeners(graphDiv);
          }
        });

        _plots[featureId].rendered = true;

        // Change 'reset camera' button to 'autoscale' for consistency w/ other plots
        if (params.hypocenters) {
          resetButton = params.hypocenters.graphDiv.querySelector(
            '[data-attr="resetLastSave"]'
          );
          resetButton.setAttribute('data-title', 'Autoscale');
          path = resetButton.querySelector('path');
          path.setAttribute('d', 'm250 850l-187 0-63 0 0-62 0-188 63 0 0 188 ' +
            '187 0 0 62z m688 0l-188 0 0-62 188 0 0-188 62 0 0 188 0 62-62 ' +
            '0z m-875-938l0 188-63 0 0-188 0-62 63 0 187 0 0 62-187 0z m875 ' +
            '188l0-188-188 0 0-62 188 0 62 0 0 62 0 188-62 0z m-125 188l-1 ' +
            '0-93-94-156 156 156 156 92-93 2 0 0 250-250 0 0-2 93-92-156-156-156 ' +
            '156 94 92 0 2-250 0 0-250 0 0 93 93 157-156-157-156-93 94 0 0 ' +
            '0-250 250 0 0 0-94 93 156 157 156-157-93-93 0 0 250 0 0 250z');
        }
      }
    });

    _this.rendered = true;
  };

  /**
   * Reset plots pane to initial state
   */
  _this.reset = function () {
    var features;

    features = _app.Features.getFeatures();
    Object.keys(features).forEach(function(feature) {
      _this.removeFeature(feature);
    });

    _featuresEl.innerHTML = '';
    _this.rendered = false;
  };

  /**
   * Resize plots: adds responsive / fluid sizing
   */
  _this.resize = function () {
    var i,
        isActive,
        plots;

    isActive = _checkIfActive();

    if (isActive) {
      plots = _el.querySelectorAll('.js-plotly-plot');
      for (i = 0; i < plots.length; i ++) {
        Plotly.Plots.resize(plots[i]);
      }
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = PlotsPane;
