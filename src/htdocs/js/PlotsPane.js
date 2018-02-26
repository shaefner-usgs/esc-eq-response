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
      _plotData,

      _MapPane,

      _addListeners,
      _addPlotContainer,
      _getCumulativePlot,
      _getHypocentersPlot,
      _getLayout,
      _getMagTimePlot,
      _getRatio,
      _getTrace,
      _isPlotPaneActive;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _el = options.el || document.createElement('div');
    _features = _el.querySelector('.features');
    _plotData = {};

    _MapPane = options.mapPane;

    // Make plots responsive
    window.onresize = function() {
      _this.resizePlots();
    };
  };

  /**
   * Add event listeners to earthquake circles on plots
   *
   * @param plot {Element}
   */
  _addListeners = function (plot) {
    var eqids,
        feature,
        index,
        points;

    plot.on('plotly_click', function(data) {
      points = data.points[0];
      eqids = points.data.eqid;
      feature = points.data.feature;
      index = points.pointNumber;

      _MapPane.openPopup(feature, eqids[index]);
    });
  };

  /**
   * Add plot container / title to DOM
   *
   * @param containerClass {String}
   * @param title {String}
   * @param opts {Object}
   *
   * @return container {Element}
   */
  _addPlotContainer = function (containerClass, title, opts) {
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

    // Add plot container, title
    parent.appendChild(h3);
    parent.appendChild(container);

    return container;
  };

  /**
   * Get config params for cumulative plot
   *
   * @param opts {Object}
   *   {
   *     data: {Object}, // plot data
   *     id: {String}, // feature id
   *     name: {String} // feature name
   *   }
   *
   * @return {Object}
   */
  _getCumulativePlot = function (opts) {
    var container,
        layout,
        plotId,
        trace;

    plotId = 'cumulative';
    container = _addPlotContainer(plotId, 'Cumulative Earthquakes', opts);

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

    return {
      container: container,
      data: [trace],
      layout: layout
    };
  };

  /**
   * Get config params for hypocenters plot
   *
   * @param opts {Object}
   *   {
   *     data: {Object}, // plot data
   *     id: {String}, // feature id
   *     name: {String} // feature name
   *   }
   *
   * @return {Object}
   */
  _getHypocentersPlot = function (opts) {
    var container,
        data,
        layout,
        plotId,
        trace,
        traces,
        zRatio;

    plotId = 'hypocenters';
    container = _addPlotContainer(plotId, '3D Hypocenters', opts);

    // Get traces for plot and store in data (mainshock is in a separate trace)
    data = [];
    traces = ['mainshock', opts.id];
    traces.forEach(function(id) {
      trace = _getTrace({
        data: opts.data[id].plotdata,
        id: id,
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

    return {
      container: container,
      data: data,
      layout: layout
    };
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

    if (opts.plot === 'magtime') {
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
   * Get config params for mag-time plot
   *
   * @param opts {Object}
   *   {
   *     data: {Object}, // plot data
   *     id: {String}, // feature id
   *     name: {String} // feature name
   *   }
   *
   * @return {Object}
   */
  _getMagTimePlot = function (opts) {
    var container,
        data,
        layout,
        plotId,
        trace,
        traces;

    plotId = 'magtime';
    container = _addPlotContainer(plotId, 'Magnitude vs. Time', opts);

    // Get traces for plot and store in data (mainshock is in a separate trace)
    data = [];
    traces = ['mainshock', opts.id];
    traces.forEach(function(id) {
      trace = _getTrace({
        data: opts.data[id].plotdata,
        id: id,
        plot: plotId,
        type: 'scatter'
      });
      data.push(trace);
    });

    layout = _getLayout({
      plot: plotId
    });

    return {
      container: container,
      data: data,
      layout: layout
    };
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
        date,
        mode,
        sizeref,
        text,
        trace,
        x,
        y,
        z;

    data = opts.data;

    if (opts.plot === 'cumulative') {
      mode = 'lines+markers';

      // Copy date/time arrays so they can be modified w/o affecting orig. data
      date = data.date.slice(0);
      x = data.time.slice(0);
      // Fill y with values from 1 to length of x
      y = Array.from(new Array(x.length), function (val, i) {
        return i + 1;
      });

      // Add origin point to beginning of aftershocks trace
      if (opts.id === 'aftershocks') {
        date.unshift(opts.mainshockDate);
        x.unshift(opts.mainshockTime);
        y.unshift(0);
      }

      // Add date field to hover text
      text = y.map(function(val, i) {
        return val + '<br />' + date[i];
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
      eqid: data.eqid,
      feature: opts.id,
      hoverinfo: 'text',
      hoverlabel: {
        font: {
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
        line: { // stroke
          color: 'rgb(65, 65, 65)',
          width: 1
        },
        opacity: 0.85,
        size: data.size,
        sizeref: sizeref
      };
    } else { // lines+markers
      trace.line = {
        color: 'rgb(120, 186, 232)',
        width: 2
      };
      trace.marker = {
        color: 'rgb(120, 186, 232)', // fill
        line: { // stroke
          color: 'rgb(31, 119, 180)',
          width: 1
        },
        size: 3
      };
    }

    return trace;
  };

  /**
   * Check if plots pane is currently active
   *
   * @return {Boolean}
   */
  _isPlotPaneActive = function () {
    if (location.hash === '#plotsPane') {
      return true;
    }

    return false;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add feature to plots pane - creates plots, but doesn't render them
   *   (called by Features.js)
   *
   * @param opts {Object}
   */
  _this.addPlots = function (opts) {
    var className,
        count,
        div;

    className = opts.id;
    count = opts.data[className].plotdata.date.length;
    div = document.createElement('div');

    div.classList.add('content', 'feature', className);
    div.innerHTML = '<h2>' + opts.name + '</h2>' + opts.data[className].detailsHtml;
    _features.appendChild(div);

    if (count > 0) {
      _plotData[className] = {
        count: count,
        plots: {
          magTime: _getMagTimePlot(opts),
          cumulative: _getCumulativePlot(opts),
          hypocenters: _getHypocentersPlot(opts)
        },
        rendered: false
      };
    }

    if (_isPlotPaneActive()) {
      _this.renderPlots();
    }
  };

  /**
   * Remove feature from plots pane (including container)
   *   (called by Features.js)
   *
   * @param el {Element}
   *     Element to remove
   */
  _this.removePlots = function (el) {
    var i,
        plots;

    plots = el.querySelectorAll('.js-plotly-plot');
    for (i = 0; i < plots.length; i ++) {
      Plotly.purge(plots[i]);
    }
    if (_el.contains(el)) {
      el.parentNode.removeChild(el);
    }
  };

  /**
   * Render plots (only call when plots pane is active)
   *
   * Plotly.js has issues if plots are rendered when plotsPane is not active
   *   (called by NavBar.js when user selects plot tab)
   */
  _this.renderPlots = function () {
    var count,
        el,
        path,
        plots,
        rendered,
        resetButton;

    // Loop thru features
    Object.keys(_plotData).forEach(function(feature) {
      count = _plotData[feature].count;
      plots = _plotData[feature].plots;
      rendered = _plotData[feature].rendered;

      if (!rendered && count > 0) {
        // Loop thru plot types for feature
        Object.keys(plots).forEach(function(type) {
          el = plots[type].container;
          Plotly.plot(el, plots[type].data, plots[type].layout, {
            showLink: false
          });
          if (type !== 'hypocenters') {
            _addListeners(el); // plotly click events are buggy for 3d charts
          }
        });

        _plotData[feature].rendered = true;

        // Change 'reset camera' button to 'autoscale' for consistency w/ other plots
        resetButton = plots.hypocenters.container.querySelector(
          '[data-title="Reset camera to last save"]'
        );
        resetButton.setAttribute('data-title', 'Autoscale');
        path = resetButton.querySelector('path');
        path.setAttribute('d', 'm250 850l-187 0-63 0 0-62 0-188 63 0 0 188 ' +
          '187 0 0 62z m688 0l-188 0 0-62 188 0 0-188 62 0 0 188 0 62-62 0z ' +
          'm-875-938l0 188-63 0 0-188 0-62 63 0 187 0 0 62-187 0z m875 ' +
          '188l0-188-188 0 0-62 188 0 62 0 0 62 0 188-62 0z m-125 188l-1 ' +
          '0-93-94-156 156 156 156 92-93 2 0 0 250-250 0 0-2 93-92-156-156-156 ' +
          '156 94 92 0 2-250 0 0-250 0 0 93 93 157-156-157-156-93 94 0 0 ' +
          '0-250 250 0 0 0-94 93 156 157 156-157-93-93 0 0 250 0 0 250z');
      }
    });
  };

  /**
   * Resize plots: adds responsive / fluid sizing
   */
  _this.resizePlots = function () {
    var i,
        plots;

    if(_isPlotPaneActive()) {
      plots = document.querySelectorAll('.js-plotly-plot');
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
