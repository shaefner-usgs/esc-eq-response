/* global Plotly */
'use strict';


var AppUtil = require('util/AppUtil');


/**
 * Create the parameters that are used to instantiate the Plotly plots.
 *
 * @param options {Object}
 *   {
 *     app {Object}
 *     data {Array}
 *     featureId {String}
 *   }
 *
 * @return _this {Object}
 *   {
 *     getOptions: {Function}
 *     getTrace: {Function}
 *   }
 */
var Plots = function (options) {
  var _this,
      _initialize,

      _app,
      _data,
      _featureId,
      _id,
      _mainshock,
      _zRatio,

      _addMainshock,
      _formatData,
      _getConfig,
      _getCustomData,
      _getData,
      _getLayout,
      _getRatio;


  _this = {};

  _initialize = function (options) {
    _app = options.app;
    _data = _formatData(options.data);
    _featureId = options.featureId;
    _mainshock = _app.Features.getFeature('mainshock');
  };

  /**
   * Add the Mainshock to the beginning of the Aftershocks trace, or to the end
   * of the Historical trace.
   *
   * @param data {Object}
   */
  _addMainshock = function (data) {
    if (_featureId === 'aftershocks') {
      data.date.unshift(_mainshock.data.datetime.toFormat('LLL d, yyyy TT'));
      data.eqid.unshift(AppUtil.getParam('eqid'));
      data.title.unshift(_mainshock.data.title);
      data.x.unshift(_mainshock.data.isoTime);
      data.y.unshift(0);
    } else if (_featureId === 'historical') {
      data.date.push(data.time);
      data.eqid.push(AppUtil.getParam('eqid'));
      data.title.push(_mainshock.data.title);
      data.x.push(_mainshock.data.isoTime);
      data.y.push(data.y.length + 1);
    }
  };

  /**
   * Format the data for Plotly.
   *
   * @param eqs {Array}
   *
   * @return data {Object}
   */
  _formatData = function (eqs) {
    var data = {
      color: [],
      date: [],
      depth: [],
      eqid: [],
      lat: [],
      lon: [],
      mag: [],
      size: [],
      text: [],
      title: [],
      time: []
    };

    eqs.forEach(eq => {
      data.date.push(eq.utcTime);
      data.depth.push(eq.depth * -1); // set to negative value for 3d plots
      data.eqid.push(eq.eqid);
      data.lat.push(eq.lat);
      data.lon.push(eq.lon);
      data.mag.push(eq.mag);
      data.text.push(eq.title + '<br />' + eq.utcTime);
      data.title.push(eq.title);
      data.time.push(eq.isoTime);
      data.color.push(eq.fillColor);
      data.size.push(eq.radius * 2); // Plotly uses diameter
    });

    return data;
  };

  /**
   * Get the Plotly config parameter.
   *
   * @return {Object}
   */
  _getConfig = function () {
    var opts,
        eqid = AppUtil.getParam('eqid');

    return {
      displaylogo: false,
      modeBarButtonsToAdd: [{
        click: gd => {
          opts = {
            filename: eqid + '-' + _featureId + '-' + _id,
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
  };

  /**
   * Get the Plotly formatted data, customized for the given plot type. Add
   * additional props needed to create the plots.
   *
   * @return data {Object}
   */
  _getCustomData = function () {
    var data = { // defaults
      mode: 'markers',
      type: 'scatter'
    };

    if (_id === 'cumulative') {
      Object.assign(data, {
        date: _data.date.slice(), // copy to add Mainshock w/o altering _data
        eqid: _data.eqid.slice(), // ...
        mode: 'lines+markers',
        time: _mainshock.data.datetime.toFormat('LLL d, yyyy TT'),
        title: _data.title.slice(),
        x: _data.time.slice(),
        y: Array.from(new Array(_data.time.length), (val, i) => i + 1) // 1 to length of x
      });

      _addMainshock(data);

      data.text = data.y.map((val, i) => {
        if (
          (i === 0 && _featureId === 'aftershocks') ||
          (i === data.y.length - 1 && _featureId === 'historical')
        ) {
          val = 'Mainshock'; // overrides cumulative count value
        }

        return `${data.title[i]} (${val})<br />${data.date[i]}`;
      });
    } else { // hypocenters, magtime plots
      Object.assign(data, {
        eqid: _data.eqid,
        text: _data.text
      });

      if (_id === 'hypocenters') {
        Object.assign(data, {
          sizeref: 0.79, // adjust eq size for consistency with magtime plot
          type: 'scatter3d',
          x: _data.lon,
          y: _data.lat,
          z: _data.depth
        });
      } else { // magtime plot
        Object.assign(data, {
          sizeref: 1,
          x: _data.time,
          y: _data.mag
        });
      }
    }

    return data;
  };

  /**
   * Get the Plotly data parameter. Add the Mainshock's trace to the hypocenters
   * and magtime plots.
   *
   * @return data {Array}
   */
  _getData = function () {
    var trace = _this.getTrace(_id),
        data = [trace];

    // Set Z Ratio value for 3d plot now that trace is created
    if (_id === 'hypocenters') {
      _zRatio = _getRatio(trace);
    }

    if (_id !== 'cumulative') {
      data.push(_mainshock.plots.getTrace(_id));
    }

    return data;
  };

  /**
   * Get the Plotly layout parameter.
   *
   * @return layout {Object}
   */
  _getLayout = function () {
    var color = '#555',
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
        },
        spikecolor = '#4440CC'; // SCSS $accent-color

    if (_id === 'hypocenters') {
      layout.scene = {
        aspectmode: 'manual',
        aspectratio: {
          x: 1,
          y: 1,
          z: _zRatio
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

    if (_id === 'magtime') {
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
   * Get the ratio of depth:latitude for scaling a 3d plot.
   *
   * @param trace {Object}
   *     plot's data trace
   *
   * @return {Number}
   */
  _getRatio = function (trace) {
    var depthExtent = AppUtil.extent(trace.z),
        depthRange = depthExtent[1] - depthExtent[0],
        latExtent = AppUtil.extent(trace.y),
        latRange = 111 * Math.abs(latExtent[1] - latExtent[0]);

    return depthRange / latRange;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Get the Plotly options that are used to create the plots.
   *
   * @param id {String <cumulative|hypocenters|magtime>}
   *
   * @return {Object}
   */
  _this.getOptions = function (id) {
    _id = id;

    return {
      data: _getData(),
      layout: _getLayout(),
      config: _getConfig()
    };
  };

  /**
   * Get the Plotly trace for a plot.
   *
   * @param id {String <cumulative|hypocenters|magtime>}
   *
   * @return trace {Object} or undefined
   */
  _this.getTrace = function (id) {
    var data, trace;

    if (_data.date.length === 0) {
      return;
    }

    _id = id;

    data = _getCustomData();
    trace = {
      eqid: data.eqid,
      feature: _featureId,
      hoverinfo: 'text',
      hoverlabel: {
        font: {
          size: 15
        }
      },
      id: id,
      mode: data.mode,
      text: data.text,
      type: data.type,
      x: data.x,
      y: data.y,
      z: data.z
    };

    if (data.mode === 'markers') { // hypocenters, magtime plots
      trace.marker = {
        color: _data.color, // fill
        line: { // stroke
          color: 'rgb(65, 65, 65)',
          width: 1
        },
        opacity: 0.85,
        size: _data.size,
        sizeref: data.sizeref
      };
    } else { // cumulative plot
      Object.assign(trace, {
        line: {
          color: 'rgb(120, 186, 232)',
          width: 2
        },
        marker: {
          color: 'rgb(120, 186, 232)', // fill
          line: { // stroke
            color: 'rgb(31, 119, 180)',
            width: 1
          },
          size: 3
        }
      });
    }

    return trace;
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Plots;
