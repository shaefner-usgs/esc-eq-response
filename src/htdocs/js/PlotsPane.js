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

      _add3dPlot,
      _addContainer,
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

    // Make plot(s) responsive
    window.onresize = function() {
      _this.resizePlots();
    };
  };

  /**
   * Add 3d plot to plot pane
   *
   * @param opts {Object}
   *   {
   *     data: {Object}, // plot data
   *     id: {String}, // used for css class on container elem
   *     name: {String} // feature name
   *   }
   */
  _add3dPlot = function (opts) {
    var container,
        data,
        layout,
        trace,
        zRatio;

    container = _addContainer('plot3d', '3D Hypocenters', opts);

    // Get traces for plot and store in data (mainshock is in a separate trace)
    data = [];
    Object.keys(opts.data).forEach(function(key) {
      trace = _getTrace('scatter3d', opts.data[key].plotdata, key);
      data.push(trace);
    });

    zRatio = _getRatio(trace);
    layout = _getLayout(zRatio);

    Plotly.plot(container, data, layout, {
      showLink: false
    });
  };

  /**
   * Add plot container to DOM and store it in _plots
   *
   * @param containerClass {String}
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
   * Add mag-time plot to plot pane
   *
   * @param opts {Object}
   *   {
   *     data: {Object}, // plot data
   *     id: {String}, // used for css class on container elem
   *     name: {String} // feature name
   *   }
   */
  _addMagTimePlot = function (opts) {
    var container,
        data,
        layout,
        trace;

    container = _addContainer('plotmt', 'Magnitude vs. Time', opts);

    // Get traces for plot and store in data (mainshock is in a separate trace)
    data = [];
    Object.keys(opts.data).forEach(function(key) {
      trace = _getTrace('scatter', opts.data[key].plotdata, key);
      data.push(trace);
    });

    layout = _getLayout();

    Plotly.plot(container, data, layout, {
      showLink: false
    });

    // Select 'closest' instead of 'compare' for hover data
    document.querySelector('[data-title="Show closest data on hover"]').click();
  };

  /**
   * Get plot layout config for plotly.js
   *
   * @param zRatio {Number} optional
   *
   * @return layout {Object}
   */
  _getLayout = function (zRatio) {
    var layout,
        titlefont;

    titlefont = {
      color: 'rgb(0,0,0)'
    };

    layout = {
      font: {
        family: '"Helvetica Neue", Helvetica, Arial, sans-serif'
      },
      margin: {
        b: 50,
        l: 50,
        r: 50,
        t: 0
      },
      showlegend: false
    };

    if (zRatio) { // if set, assume this is a 3d plot
      layout.scene = {
        aspectratio: {
          x: 1,
          y: 1,
          z: zRatio
        },
        xaxis: {
          title: 'longitude',
          titlefont: titlefont
        },
        yaxis: {
          title: 'latitude',
          titlefont: titlefont
        },
        zaxis: {
          title: 'depth (km)',
          titlefont: titlefont
        }
      };
    } else {
      layout.xaxis = {
        title: 'time (UTC)',
        titlefont: titlefont
      };
      layout.yaxis = {
        title: 'magnitude',
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
   * @param data {Object}
   *     earthquake data
   * @param name {String}
   *     name of trace
   *
   * @return trace {Object}
   */
  _getTrace = function  (type, data, name) {
    var sizeref,
        trace,
        x,
        y,
        z;

    if (type === 'scatter3d') {
      sizeref = 0.79; // Plotly doesn't honor size value on 3d plots; adjust it.
      x = data.lon;
      y = data.lat;
      z = data.depth;
    } else {
      sizeref = 1;
      x = data.time;
      y = data.mag;
    }

    trace = {
      hoverinfo: 'text',
      hoverlabel: {
        bgcolor: 'rgba(255,255,255,.85)',
        bordercolor: 'rgb(153,153,153)',
        font: {
          color: 'rgb(0,0,0)'
        }
      },
      marker: {
        color: data.color, // fill
        line: {
          color: 'rgb(102,102,102)' // stroke
        },
        size: data.size,
        sizeref: sizeref,
      },
      mode: 'markers',
      name: name,
      text: data.text,
      type: type,
      x: x,
      y: y,
      z: z
    };

    return trace;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add feature to plots pane
   *   (called by Features.js)
   */
  _this.addPlots = function (opts) {
    _addMagTimePlot(opts);
    _add3dPlot(opts);
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
