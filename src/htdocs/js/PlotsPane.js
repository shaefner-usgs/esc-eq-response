'use strict';


var Plotly = require('plotly.js');


var PlotsPane = function (options) {
  var _this,
      _initialize,

      _el,
      _features,

      _getDataConfig,
      _getLayout;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _el = options.el || document.createElement('div');
    _features = _el.querySelector('.features');

    _features.innerHTML = '<h2>Plots</h2><div id="plot"></div>';

    console.log(Plotly);
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
        sizemin: 5,
        sizeref: 0.1,
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
        b: 0,
        l: 50,
        r: 50,
        t: 0
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

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add summary text to summary pane (text plus <div> container)
   *   (called by Features.js)
   *
   * @param opts {Object}
   *   {
   *     data: {Object}, // plot data
   *     id: {String}, // used for css class on container elem
   *     name: {String} // feature name
   *   }
   */
  _this.addPlot = function (opts) {
    var aftershocks,
        data,
        depthExtent,
        depthRange,
        latExtent,
        latRange,
        layout,
        mainshock,
        zRatio;

    aftershocks = _getDataConfig(opts.data[0], 'Aftershocks');
    mainshock = _getDataConfig(opts.data[1], 'Mainshock');

    data = [mainshock, aftershocks];

    depthExtent = Plotly.d3.extent(aftershocks.z);
    depthRange = depthExtent[1] - depthExtent[0];
    latExtent = Plotly.d3.extent(aftershocks.y);
    latRange = 111 * Math.abs(latExtent[1] - latExtent[0]);
    zRatio = depthRange / latRange;

    layout = _getLayout(zRatio);

    Plotly.plot('plot', data, layout, {
      showLink: false
    });
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = PlotsPane;
