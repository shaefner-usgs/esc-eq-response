/* global Plotly */
'use strict';


var AppUtil = require('util/AppUtil'),
    Slider = require('util/controls/Slider');


var _COLORS,
    _DEFAULTS;

_COLORS = {
  cumLine: 'rgb(120, 186, 232)',
  cumMarker: 'rgb(31, 119, 180)',
  grid: '#555',
  stroke: 'rgba(0, 0, 0. .6)',
  text: '#444'
};
_DEFAULTS = {
  bgcolor: '#fff'
};


/**
 * Supply the Plotly parameters/traces used to create the plots for the
 * Mainshock, Aftershocks, and Historical Seismicity Features and handle the
 * interactive components like filtering and clicking on an earthquake (2d plots
 * only).
 *
 * @param options {Object}
 *     {
 *       app: {Object}
 *       feature: {Object}
 *     }
 *
 * @return _this {Object}
 *     {
 *       addListeners: {Function}
 *       destroy: {Function}
 *       filter: {Function}
 *       getParams: {Function}
 *       getSlider: {Function}
 *       getTrace: {Function}
 *       removeListeners: {Function}
 *     }
 */
var Plots = function (options) {
  var _this,
      _initialize,

      _app,
      _bgcolor,
      _data,
      _feature,
      _mainshock,
      _names,
      _plots,
      _slider,
      _zRatio,

      _addMainshock,
      _formatData,
      _getConfig,
      _getData,
      _getLayout,
      _getRatio,
      _getScene,
      _getTraceData,
      _openPopup,
      _update;


  _this = {};

  _initialize = function (options = {}) {
    var data = options.feature.data;

    options = Object.assign({}, _DEFAULTS, options);

    _app = options.app;
    _bgcolor = options.bgcolor;
    _data = _formatData(data.eqs || [data.eq]);
    _feature = options.feature;
    _mainshock = _app.Features.getMainshock();
    _names = {
      cumulative: 'Cumulative Earthquakes',
      hypocenters: '3D Hypocenters',
      magtime: 'Magnitude vs. Time'
    };
  };

  /**
   * Add the Mainshock to the beginning of the cumulative Aftershocks trace, or
   * to the end of the cumulative Historical trace.
   *
   * @param data {Object}
   * @param timezone {String}
   */
  _addMainshock = function (data, timezone) {
    var eq = _mainshock.data.eq,
        x = eq.isoTime;

    if (timezone === 'user') {
      x = eq.datetime.toLocal().toISO();
    }

    if (_feature.type === 'aftershocks') {
      data.eqid.unshift(eq.id);
      data.title.unshift(eq.title);
      data.userTime.unshift(eq.userTimeDisplay);
      data.utcTime.unshift(eq.utcTimeDisplay);
      data.x.unshift(x);
      data.y.unshift(0);
    } else if (_feature.type === 'historical') {
      data.eqid.push(eq.id);
      data.title.push(eq.title);
      data.userTime.push(eq.userTimeDisplay);
      data.utcTime.push(eq.utcTimeDisplay);
      data.x.push(x);
      data.y.push(data.y.length + 1);
    }
  };

  /**
   * Format the earthquake data for Plotly.
   *
   * @param eqs {Array}
   *
   * @return data {Object}
   */
  _formatData = function (eqs) {
    var data = {
      color: [],
      datetime: [],
      depth: [],
      eqid: [],
      isoTime: [],
      lat: [],
      lon: [],
      mag: [],
      size: [],
      text: [],
      title: [],
      userTime: [],
      utcTime: []
    };

    eqs.forEach(eq => {
      var text = `${eq.title}<br><span>${eq.userTimeDisplay}</span>` +
        `<span>${eq.utcTimeDisplay}</span>`;

      data.color.push(eq.fillColor);
      data.datetime.push(eq.datetime);
      data.depth.push(eq.coords[2] * -1); // set to negative value for 3d plots
      data.eqid.push(eq.id);
      data.isoTime.push(eq.isoTime);
      data.lat.push(eq.coords[1]);
      data.lon.push(eq.coords[0]);
      data.mag.push(eq.mag);
      data.size.push(eq.radius * 2); // Plotly uses diameter
      data.text.push(text);
      data.title.push(eq.title);
      data.userTime.push(eq.userTimeDisplay);
      data.utcTime.push(eq.utcTimeDisplay);
    });

    return data;
  };

  /**
   * Get the Plotly config parameter for the given plot type.
   *
   * @param type {String <cumulative|hypocenters|magtime>}
   *
   * @return {Object}
   */
  _getConfig = function (type) {
    var eqid = AppUtil.getParam('eqid');

    return {
      displaylogo: false,
      modeBarButtonsToAdd: [{
        click: gd => {
          var opts = {
            filename: eqid + '-' + _feature.id + '-' + type,
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
   * Get the Plotly data parameter for the given plot type.
   *
   * Also add the Mainshock's trace to the hypocenters and magtime plots and
   * set the Z ratio for the hypocenters plot.
   *
   * @param type {String <cumulative|hypocenters|magtime>}
   *
   * @return data {Array}
   */
  _getData = function (type) {
    var trace = _this.getTrace(type),
        data = [trace];

    if (type !== 'cumulative') {
      data.push(_mainshock.plots.getTrace(type));
    }

    // Set the 3d plot's Z ratio now that its trace is ready
    if (type === 'hypocenters') {
      _zRatio = _getRatio(trace);
    }

    return data;
  };

  /**
   * Get the Plotly layout parameter for the given plot type.
   *
   * @param type {String <cumulative|hypocenters|magtime>}
   *
   * @return layout {Object}
   */
  _getLayout = function (type) {
    var layout = {
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
          name: _names[type],
          paper_bgcolor: _bgcolor,
          plot_bgcolor: _bgcolor,
          showlegend: false
        },
        timezone = AppUtil.getParam('timezone') || 'utc',
        zoneDisplay = 'UTC';

    if (timezone === 'user') {
      zoneDisplay = 'User';
    }

    if (type === 'hypocenters') {
      layout.scene = _getScene();
    } else { // cumulative, magtime plots
      layout.xaxis = {
        color: _COLORS.grid,
        title: {
          font: {
            color: _COLORS.text
          },
          text: `Time (${zoneDisplay})`
        }
      };
      layout.yaxis = {
        color: _COLORS.grid,
        title: {
          font: {
            color: _COLORS.text
          },
          text: 'Earthquakes' // cumulative plot
        }
      };

      if (type === 'magtime') {
        layout.yaxis.title.text = 'Magnitude';
      }
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

  /**
   * Get the scene value for a 3d plot.
   *
   * @return {Object}
   */
  _getScene = function () {
    var el = document.querySelector('nav a.selected'),
        spikecolor = getComputedStyle(el).getPropertyValue('background-color');

    return {
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
        color: _COLORS.grid,
        spikecolor: spikecolor,
        title: {
          font: {
            color: _COLORS.text
          },
          text: 'Longitude'
        },
        zeroline: false
      },
      yaxis: {
        color: _COLORS.grid,
        spikecolor: spikecolor,
        title: {
          font: {
            color: _COLORS.text
          },
          text: 'Latitude'
        },
        zeroline: false
      },
      zaxis: {
        color: _COLORS.grid,
        spikecolor: spikecolor,
        title: {
          font: {
            color: _COLORS.text
          },
          text: 'Depth (km)'
        },
        zeroline: false
      }
    };
  };

  /**
   * Get the Plotly trace data for the given plot type.
   *
   * @param type {String <cumulative|hypocenters|magtime>}
   *
   * @return data {Object}
   */
  _getTraceData = function (type) {
    var data = { // defaults, common props
          color: _data.color,
          mode: 'markers',
          size: _data.size,
          type: 'scatter'
        },
        timezone = AppUtil.getParam('timezone') || 'utc',
        x = _data.isoTime;

    if (timezone === 'user') {
      x = _data.datetime.map(datetime => datetime.toLocal().toISO());
    }

    if (type === 'cumulative') {
      // Copy data Arrays and add the Mainshock, leaving _data unaltered
      Object.assign(data, {
        eqid: [..._data.eqid],
        title: [..._data.title],
        userTime: [..._data.userTime],
        utcTime: [..._data.utcTime],
        x: [...x],
        y: Array.from(Array(x.length), (val, i) => i + 1) // 1 to length of x
      });

      _addMainshock(data, timezone);

      Object.assign(data, {
        mode: 'lines+markers',
        text: data.y.map((val, i) => {
          if (
            (i === 0 && _feature.type === 'aftershocks') ||
            (i === data.y.length - 1 && _feature.type === 'historical')
          ) {
            val = 'Mainshock'; // overrides cumulative count value
          }

          return `${data.title[i]} (${val})<br>` +
            `<span>${data.userTime[i]}</span><span>${data.utcTime[i]}</span>`;
        })
      });
    } else { // hypocenters, magtime plots
      Object.assign(data, {
        eqid: _data.eqid,
        text: _data.text
      });

      if (type === 'hypocenters') {
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
          x: x,
          y: _data.mag
        });
      }
    }

    return data;
  };

  /**
   * Event handler that opens an earthquake's map Popup.
   *
   * @param data {Object}
   */
  _openPopup = function (data) {
    var point = data.points[0],
        featureId = point.data.featureId,
        feature = _app.Features.getFeature(featureId),
        count = feature.count,
        eqids = point.data.eqid,
        id = point.data.id,
        index = point.pointNumber;

    // The first/last point on cumulative aftershocks/historical curve is the MS
    if (id === 'cumulative' &&
      (feature.type === 'aftershocks' && index === 0) ||
      (feature.type === 'historical' && index === count)
    ) {
      feature = _app.Features.getMainshock();
    }

    location.href = '#map';

    // Ensure location.href setting is applied first
    setTimeout(() => _app.MapPane.openPopup(feature, eqids[index]));
  };

  /**
   * Update the hypocenters plot to display the given (filtered) trace data.
   *
   * @param trace {Object}
   */
  _update = function (trace) {
    var params = _app.PlotsPane.params[_feature.id].hypocenters;

    Object.assign(params, {
      data: [
        trace,
        _mainshock.plots.getTrace('hypocenters')
      ],
      rendered: false
    });

    _app.PlotsPane.render(_feature);
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add event listeners.
   */
  _this.addListeners = function () {
    var div = document.querySelector('#plots-pane .' + _feature.id),
        input = document.getElementById(_feature.type + '-depth');

    _plots = div.querySelectorAll('.js-plotly-plot');

    _plots.forEach(plot => {
      if (!plot.classList.contains('hypocenters')) { // 2d plots only
        plot.on('plotly_click', _openPopup);
      }
    });

    _slider?.addListeners(input);
    _slider?.setValue(); // also set the initial state
  };

  /**
   * Destroy this Class.
   */
  _this.destroy = function () {
    _slider?.destroy();

    _initialize = null;

    _app = null;
    _bgcolor = null;
    _data = null;
    _feature = null;
    _mainshock = null;
    _names = null;
    _plots = null;
    _slider = null;
    _zRatio = null;

    _addMainshock = null;
    _formatData = null;
    _getConfig = null;
    _getData = null;
    _getLayout = null;
    _getRatio = null;
    _getScene = null;
    _getTraceData = null;
    _openPopup = null;
    _update = null;

    _this = null;
  };

  /**
   * Filter the hypocenters data by depth.
   */
  _this.filter = function () {
    var params = _this.getParams('hypocenters'),
        data = params.data.find(trace => trace.featureId === _feature.id),
        depth = this.value, // Slider's current value
        filtered = {},
        keep = [];

    data.z.filter((val, i) => {
      if (Math.round(10 * val) / 10 >= depth) {
        keep.push(i); // array indices of values to keep
      }
    });

    ['eqid', 'text', 'x', 'y', 'z'].forEach(prop => {
      filtered[prop] = [];

      keep.forEach(i => filtered[prop].push(data[prop][i]));

      data[prop] = filtered[prop];
    });

    _update(data);
  };

  /**
   * Get the Plotly parameters for the given plot type.
   *
   * @param type {String <cumulative|hypocenters|magtime>}
   *
   * @return {Object}
   */
  _this.getParams = function (type) {
    return {
      config: _getConfig(type),
      data: _getData(type),
      layout: _getLayout(type),
      rendered: false
    };
  };

  /**
   * Get the HTML content for the depth range Slider (filter).
   *
   * @param value {Integer} optional; default is null
   *     Slider's initial setting
   *
   * @return {String}
   */
  _this.getSlider = function (value = null) {
    var depths = _data.depth,
        extent = AppUtil.extent(depths),
        max = Math.ceil(extent[1]) || 9,
        min = Math.floor(extent[0]) || 0;

    // Ensure initial value is in range
    if (Number.isInteger(value)) {
      if (value < min) {
        value = min;
      } else if (value > max) {
        value = max;
      }
    }

    _slider = Slider({
      filter: _this.filter,
      id: _feature.type + '-depth',
      label: 'Filter by depth',
      max: max,
      min: min,
      val: value || min
    });

    return _slider.getContent();
  };

  /**
   * Get the Plotly trace for the given plot type.
   *
   * @param type {String <cumulative|hypocenters|magtime>}
   *
   * @return trace {Object}
   */
  _this.getTrace = function (type) {
    var data = _getTraceData(type),
        trace = {
          eqid: data.eqid,
          featureId: _feature.id,
          hoverinfo: 'text',
          hoverlabel: {
            font: {
              size: 15
            }
          },
          id: type,
          mode: data.mode,
          text: data.text,
          type: data.type,
          x: data.x,
          y: data.y,
          z: data.z
        };

    if (data.mode === 'markers') { // hypocenters, magtime plots
      trace.marker = {
        color: data.color, // fill
        line: {
          color: _COLORS.stroke,
          width: 1
        },
        opacity: 0.85,
        size: data.size,
        sizeref: data.sizeref
      };
    } else { // cumulative plot
      Object.assign(trace, {
        line: {
          color: _COLORS.cumLine,
          width: 2
        },
        marker: {
          color: _COLORS.cumLine, // fill
          line: { // stroke
            color: _COLORS.cumMarker,
            width: 1
          },
          size: 3
        }
      });
    }

    return trace;
  };

  /**
   * Remove event listeners.
   */
  _this.removeListeners = function () {
    _slider?.removeListeners();

    _plots.forEach(plot => {
      if (plot.removeListener && !plot.classList.contains('hypocenters')) {
        plot.removeListener('plotly_click', _openPopup);
      }
    });
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Plots;
