/* global Plotly */
'use strict';


/**
 * Creates, adds, and removes plot from plots pane
 *
 * @param options {Object}
 *   {
 *     el: {Element}
 *   }
 */
var PlotsPane = function (options) {
  var _this,
      _initialize,

      _el,
      _features,
      _plots,

      _addContainer,
      _addCumulativePlot,
      _addHypocentersPlot,
      _addMagTimePlot,
      _getLayout,
      _getRatio,
      _getTrace;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _el = options.el || document.createElement('div');
    _features = _el.querySelector('.features');
    _plots = [];

    // Make plots responsive
    window.onresize = function() {
      _this.resizePlots();
    };
  };

  /**
   * Add plot container to DOM and store it in _plots
   *
   * @param containerClass {String}
   * @param title {String}
   * @param opts {Object}
   *
   * @return container {Element}
   */
  _addContainer = function (containerClass, title, opts) {
    var container,
        h3,
        parentClass,
        parent;

    container = document.createElement('div');
    container.classList.add(containerClass);

    h3 = document.createElement('h3');
    h3.innerHTML = title;

    parentClass = opts.id;
    parent = _features.querySelector('.' + parentClass);

    if (!parent) { // create parent container if it doesn't already exist
      parent = document.createElement('div');
      parent.classList.add('content', 'feature', parentClass);
      parent.innerHTML = '<h2>' + opts.name + '</h2>' + opts.data[opts.id].detailsHtml;

      _features.appendChild(parent);
    }

    // Add and store plot container
    parent.appendChild(h3);
    parent.appendChild(container);
    _plots.push(container);

    return container;
  };

  /**
   * Add cumulative plot to plot pane
   *
   * @param opts {Object}
   *   {
   *     data: {Object}, // plot data
   *     id: {String}, // feature id
   *     name: {String} // feature name
   *   }
   */
  _addCumulativePlot = function (opts) {
    var container,
        layout,
        plotId,
        trace;

    plotId = 'cumulative';
    container = _addContainer(plotId, 'Cumulative Earthquakes', opts);

    trace = _getTrace({
      data: opts.data[opts.id].plotdata,
      id: opts.id,
      mainshockDate: opts.data.mainshock.plotdata.date[0],
      mainshockTime: opts.data.mainshock.plotdata.time[0],
      plot: plotId,
      type: 'scatter'
    });

    layout = _getLayout({
      plot: plotId
    });

    Plotly.plot(container, [trace], layout, {
      showLink: false
    });
  };

  /**
   * Add hypocenters plot to plot pane
   *
   * @param opts {Object}
   *   {
   *     data: {Object}, // plot data
   *     id: {String}, // feature id
   *     name: {String} // feature name
   *   }
   */
  _addHypocentersPlot = function (opts) {
    var container,
        data,
        layout,
        path,
        plotId,
        resetButton,
        trace,
        traces,
        zRatio;

    plotId = 'hypocenters';
    container = _addContainer(plotId, '3D Hypocenters', opts);

    // Get traces for plot and store in data (mainshock is in a separate trace)
    data = [];
    traces = ['mainshock', opts.id];
    traces.forEach(function(id) {
      trace = _getTrace({
        data: opts.data[id].plotdata,
        plot: plotId,
        type: 'scatter3d'
      });
      data.push(trace);
    });

    zRatio = _getRatio(trace);
    layout = _getLayout({
      plot: plotId,
      zRatio: zRatio
    });

    Plotly.plot(container, data, layout, {
      showLink: false
    });

    // Change 'reset camera' button to 'autoscale' for consistency w/ other plots
    resetButton = container.querySelector('[data-title="Reset camera to last save"]');
    resetButton.setAttribute('data-title', 'Autoscale');
    path = resetButton.querySelector('path');
    path.setAttribute('d', 'm250 850l-187 0-63 0 0-62 0-188 63 0 0 188 187 0 ' +
      '0 62z m688 0l-188 0 0-62 188 0 0-188 62 0 0 188 0 62-62 0z ' +
      'm-875-938l0 188-63 0 0-188 0-62 63 0 187 0 0 62-187 0z m875 ' +
      '188l0-188-188 0 0-62 188 0 62 0 0 62 0 188-62 0z m-125 188l-1 ' +
      '0-93-94-156 156 156 156 92-93 2 0 0 250-250 0 0-2 93-92-156-156-156 ' +
      '156 94 92 0 2-250 0 0-250 0 0 93 93 157-156-157-156-93 94 0 0 0-250 ' +
      '250 0 0 0-94 93 156 157 156-157-93-93 0 0 250 0 0 250z');
  };

  /**
   * Add mag-time plot to plot pane
   *
   * @param opts {Object}
   *   {
   *     data: {Object}, // plot data
   *     id: {String}, // feature id
   *     name: {String} // feature name
   *   }
   */
  _addMagTimePlot = function (opts) {
    var container,
        data,
        layout,
        plotId,
        trace,
        traces;

    plotId = 'magtime';
    container = _addContainer(plotId, 'Magnitude vs. Time', opts);

    // Get traces for plot and store in data (mainshock is in a separate trace)
    data = [];
    traces = ['mainshock', opts.id];
    traces.forEach(function(id) {
      trace = _getTrace({
        data: opts.data[id].plotdata,
        plot: plotId,
        type: 'scatter'
      });
      data.push(trace);
    });

    layout = _getLayout({
      plot: plotId
    });

    Plotly.plot(container, data, layout, {
      showLink: false
    });
  };

  /**
   * Get plot layout config for plotly.js
   *
   * @param opts {Object}
   *
   * @return layout {Object}
   */
  _getLayout = function (opts) {
    var layout,
        spikecolor,
        titlefont;

    spikecolor = '#999';
    titlefont = {
      color: 'rgb(0, 0, 0)'
    };

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

    if (opts.plot === 'hypocenters') {
      layout.scene = {
        aspectmode: 'manual',
        aspectratio: {
          x: 1,
          y: 1,
          z: opts.zRatio
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
          title: 'longitude',
          titlefont: titlefont,
          zeroline: false
        },
        yaxis: {
          spikecolor: spikecolor,
          title: 'latitude',
          titlefont: titlefont,
          zeroline: false
        },
        zaxis: {
          spikecolor: spikecolor,
          title: 'depth (km)',
          titlefont: titlefont,
          zeroline: false
        }
      };
    } else {
      layout.xaxis = {
        title: 'time (UTC)',
        titlefont: titlefont
      };
    }

    if (opts.plot === 'magtime') {
      layout.yaxis = {
        title: 'magnitude',
        titlefont: titlefont
      };
    } else {
      layout.yaxis = {
        title: 'earthquakes',
        titlefont: titlefont
      };
    }

    return layout;
  };

  /**
   * Get ratio of depth values to latitude values
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

  /**
   * Get plot trace config for plotly.js
   *
   * @param opts {Object}
   *
   * @return trace {Object}
   */
  _getTrace = function (opts) {
    var data,
        mode,
        sizeref,
        text,
        trace,
        x,
        y,
        z;

    data = opts.data;

    if (opts.plot === 'cumulative') {
      mode = 'markers+lines';
      x = data.time;
      // Fill y with values from 1 to length of x
      y = Array.from(new Array(x.length), function (val, i) {
        return i + 1;
      });

      // Add origin point to beginning of aftershocks trace
      if (opts.id === 'aftershocks') {
        x.unshift(opts.mainshockTime);
        data.date.unshift(opts.mainshockDate);
        y.unshift(0);
      }

      // Add date field to hover text
      text = y.map(function(val, i) {
        return val + '<br />' + data.date[i];
      });
    } else if (opts.plot === 'hypocenters') {
      mode = 'markers';
      sizeref = 0.79; // Plotly doesn't honor size value on 3d plots; adjust it.
      text = data.text;
      x = data.lon;
      y = data.lat;
      z = data.depth;
    } else if (opts.plot === 'magtime') {
      mode = 'markers';
      sizeref = 1;
      text = data.text;
      x = data.time;
      y = data.mag;
    }

    trace = {
      hoverinfo: 'text',
      hoverlabel: {
        bgcolor: 'rgba(255, 255, 255, .85)',
        bordercolor: 'rgb(153, 153, 153)',
        font: {
          color: 'rgb(0, 0, 0)',
          size: 15
        }
      },
      mode: mode,
      text: text,
      type: opts.type,
      x: x,
      y: y,
      z: z
    };

    if (mode === 'markers') {
      trace.marker = {
        color: data.color, // fill
        line: {
          color: 'rgb(51, 51, 51)' // stroke
        },
        size: data.size,
        sizeref: sizeref,
      };
    } else {
      trace.marker = {
        size: 4
      };
    }

    return trace;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add feature to plots pane
   *   (called by Features.js)
   *
   * @param opts {Object}
   */
  _this.addPlots = function (opts) {
    _addMagTimePlot(opts);
    _addCumulativePlot(opts);
    _addHypocentersPlot(opts);
  };

  /**
   * Remove feature from plots pane (including container)
   *   (called by Features.js)
   *
   * @param el {Element}
   *     Element to remove
   */
  _this.removePlots = function (el) {
    if (_el.contains(el)) {
      el.parentNode.removeChild(el);
    }
  };

  /**
   * Resize plots: Sets initial size and adds responsive / fluid sizing
   */
  _this.resizePlots = function () {
    _plots.forEach(function(plot) {
      Plotly.Plots.resize(plot);
    });
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = PlotsPane;
