/* global Plotly */
'use strict';


var PlotsPane = function (options) {
  var _this,
      _initialize,

      _el,
      _features,

      _getRatio,
      _getDataConfig,
      _getLayout;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _el = options.el || document.createElement('div');
    _features = _el.querySelector('.features');
  };

  /**
   * Get plot data in format expected by plotly.js charting library
   *
   * @param data {Object}
   *     eq data
   * @param name {String}
   *     Name of trace
   *
   * @return {Object}
   */
  _getDataConfig = function  (data, name) {
    return {
      hoverinfo: 'text+x+y',
      marker: {
        color: data.color, // fill
        line: { //  stroke
          color: 'rgb(153,153,153)',
          width: 1
        },
        size: data.size,
        sizeref: 0.79, // Plotly doesn't properly honor size value; adjust it.
      },
      mode: 'markers',
      name: name,
      text: data.text,
      type: 'scatter3d',
      x: data.x,
      y: data.y,
      z: data.z
    };
  };

  _getLayout = function (zRatio) {
    return {
      margin: {
        b: 20,
        l: 50,
        r: 50,
        t: 20
      },
      scene: {
        aspectratio: {
          x: 1,
          y: 1,
          z: zRatio
        },
        xaxis: {
          title: 'longitude',
          titlefont: {
            color: 'rgb(0,0,0)'
          }
        },
        yaxis: {
          title: 'latitude',
          titlefont: {
            color: 'rgb(0,0,0)'
          }
        },
        zaxis: {
          title: 'depth (km)',
          titlefont: {
            color: 'rgb(0,0,0)'
          }
        }
      },
      showlegend: false,
    };
  };

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
   * Add 3d plot to plot pane (plot plus <div> container)
   *   (called by Features.js)
   *
   * @param opts {Object}
   *   {
   *     data: {Object}, // plot data
   *     id: {String}, // used for css class on container elem
   *     name: {String} // feature name
   *   }
   */
  _this.add3dPlot = function (opts) {
    var aftershocks,
        cssClass,
        data,
        div,
        gd3,
        layout,
        mainshock,
        plotContainer,
        zRatio;

    cssClass = opts.id;
    div = document.createElement('div');
    div.classList.add('content', 'feature', cssClass);
    div.innerHTML = '<h2>' + opts.name + '</h2>';

    _features.appendChild(div);

    // Make responsive (https://plot.ly/javascript/responsive-fluid-layout/)
    gd3 = Plotly.d3.select('#plotsPane .' + cssClass)
      .append('div')
      .style({
          width: '100%',
          height: '80vh',
      });
    plotContainer = gd3.node();
    window.onresize = function() {
      Plotly.Plots.resize(plotContainer);
    };

    aftershocks = _getDataConfig(opts.data[1], 'Aftershocks');
    mainshock = _getDataConfig(opts.data[0], 'Mainshock');
    data = [mainshock, aftershocks];

    zRatio = _getRatio(aftershocks);
    layout = _getLayout(zRatio);

    Plotly.plot(plotContainer, data, layout, {
      showLink: false
    });
  };

  /**
   * Remove plot from plot pane (plot plus <div> container)
   *   (called by Features.js)
   *
   * @param el {Element}
   *     Element to remove
   */
  _this.removePlot = function (el) {
    if (_el.contains(el)) {
      el.parentNode.removeChild(el);
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = PlotsPane;
