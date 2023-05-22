/* global Plotly */
'use strict';


var AppUtil = require('util/AppUtil'),
    Slider = require('util/controls/Slider');


/**
 * Supply the Plotly parameters that are used to create the plots for the
 * Mainshock, Aftershocks, and Historical Seismicity Features.
 *
 * @param options {Object}
 *     {
 *       app: {Object}
 *       data: {Array}
 *       featureId: {String}
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
      _data,
      _featureId,
      _mainshock,
      _plots,
      _slider,
      _zRatio,

      _addContainer,
      _addMainshock,
      _formatData,
      _getConfig,
      _getData,
      _getLayout,
      _getRatio,
      _getTraceData,
      _openPopup,
      _update;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;
    _data = _formatData(options.data);
    _featureId = options.featureId;
    _mainshock = _app.Features.getFeature('mainshock');
  };

  /**
   * Add the given plot type's container, header, and filter (3d plots only) to
   * the DOM, if they don't already exist.
   *
   * @param id {String <cumulative|hypocenters|magtime>}
   *
   * @return container {Element}
   */
  _addContainer = function (id) {
    var h3,
        el = document.getElementById('plotsPane'),
        parent = el.querySelector(`.${_featureId} .bubble`),
        container = parent.querySelector('div.' + id);

    if (!container) {
      container = document.createElement('div');
      h3 = `<h3 class="${id}">${_app.PlotsPane.names[id]}</h3>`;

      parent.appendChild(container);
      container.classList.add(id);
      container.insertAdjacentHTML('beforebegin', h3);

      if (id === 'hypocenters') {
        container.insertAdjacentHTML('afterend', _this.getSlider());
      }
    }

    return container;
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

    if (_featureId.includes('aftershocks')) {
      data.eqid.unshift(eq.id);
      data.title.unshift(eq.title);
      data.userTime.unshift(eq.userTimeDisplay);
      data.utcTime.unshift(eq.utcTimeDisplay);
      data.x.unshift(x);
      data.y.unshift(0);
    } else if (_featureId.includes('historical')) {
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
   * @param id {String <cumulative|hypocenters|magtime>}
   *
   * @return {Object}
   */
  _getConfig = function (id) {
    var eqid = AppUtil.getParam('eqid');

    return {
      displaylogo: false,
      modeBarButtonsToAdd: [{
        click: gd => {
          var opts = {
            filename: eqid + '-' + _featureId + '-' + id,
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
   * Get the Plotly data parameter for the given plot type. Add the Mainshock's
   * trace to the hypocenters and magtime plots and set the Z ratio for the
   * hypocenters plot.
   *
   * @param id {String <cumulative|hypocenters|magtime>}
   *
   * @return data {Array}
   */
  _getData = function (id) {
    var trace = _this.getTrace(id),
        data = [trace];

    if (id !== 'cumulative') {
      data.push(_mainshock.plots.getTrace(id));
    }

    // Set the 3d plot's Z ratio now that its trace is ready
    if (id === 'hypocenters') {
      _zRatio = _getRatio(trace);
    }

    return data;
  };

  /**
   * Get the Plotly layout parameter for the given plot type.
   *
   * @param id {String <cumulative|hypocenters|magtime>}
   *
   * @return layout {Object}
   */
  _getLayout = function (id) {
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
        sel = document.querySelector('nav a.selected'),
        spikecolor = getComputedStyle(sel).getPropertyValue('background-color'),
        timezone = AppUtil.getParam('timezone') || 'utc',
        zoneDisplay = 'UTC';

    if (timezone === 'user') {
      zoneDisplay = 'User';
    }

    if (id === 'hypocenters') {
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
    } else { // cumulative, magtime
      layout.xaxis = {
        title: {
          font: {
            color: color
          },
          text: `Time (${zoneDisplay})`
        }
      };

      if (id === 'cumulative') {
        layout.yaxis = {
          title: {
            font: {
              color: color
            },
            text: 'Earthquakes'
          }
        };
      } else {
        layout.yaxis = {
          title: {
            font: {
              color: color
            },
            text: 'Magnitude'
          }
        };
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
   * Get the Plotly trace data for the given plot type.
   *
   * @param id {String <cumulative|hypocenters|magtime>}
   *
   * @return data {Object}
   */
  _getTraceData = function (id) {
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

    if (id === 'cumulative') {
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
            (i === 0 && _featureId.includes('aftershocks')) ||
            (i === data.y.length - 1 && _featureId.includes('historical'))
          ) {
            val = 'Mainshock'; // overrides cumulative count value
          }

          return `${data.title[i]} (${val})<br>` +
            `<span>${data.userTime[i]}</span><span>${data.utcTime[i]}</span>`;
        })
      });
    } else { // hypocenters, magtime
      Object.assign(data, {
        eqid: _data.eqid,
        text: _data.text
      });

      if (id === 'hypocenters') {
        Object.assign(data, {
          sizeref: 0.79, // adjust eq size for consistency with magtime plot
          type: 'scatter3d',
          x: _data.lon,
          y: _data.lat,
          z: _data.depth
        });
      } else { // magtime
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
        count = _app.Features.getFeature(featureId).count,
        eqids = point.data.eqid,
        id = point.data.id,
        index = point.pointNumber;

    // The first/last point on cumulative aftershocks/historical curve is Mainshock
    if (id === 'cumulative' &&
      (featureId.includes('aftershocks') && index === 0) ||
      (featureId.includes('historical') === count)
    ) {
      featureId = 'mainshock';
    }

    location.href = '#mapPane';

    // setTimeout insures location.href setting is applied first
    setTimeout(() => _app.MapPane.openPopup(eqids[index], featureId));
  };

  /**
   * Update the hypocenters plot with the given (filtered) trace data.
   *
   * @param trace {Object}
   */
  _update = function (trace) {
    var params = _app.PlotsPane.params[_featureId].hypocenters;

    Object.assign(params, {
      data: [
        trace,
        _mainshock.plots.getTrace('hypocenters')
      ],
      rendered: false
    });

    _app.PlotsPane.render();
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add event listeners.
   */
  _this.addListeners = function () {
    var div = document.querySelector('#plotsPane .' + _featureId),
        input = document.getElementById(_featureId + '-depth');

    _plots = div.querySelectorAll('.js-plotly-plot');

    _plots.forEach(plot => {
      if (!plot.classList.contains('hypocenters')) { // 2d plots only
        plot.on('plotly_click', _openPopup);
      }
    });

    _slider.addListeners(input);
    _slider.setValue(); // also set the initial state
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    if (_slider) {
      _slider.destroy();
    }

    _initialize = null;

    _app = null;
    _data = null;
    _featureId = null;
    _mainshock = null;
    _plots = null;
    _slider = null;
    _zRatio = null;

    _addContainer = null;
    _addMainshock = null;
    _formatData = null;
    _getConfig = null;
    _getData = null;
    _getLayout = null;
    _getRatio = null;
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
        data = params.data.find(trace => trace.featureId === _featureId),
        depth = this.value, // Slider's current value
        filtered = {},
        keep = [];

    data.z.filter((value, index) => {
      if (value > depth) {
        keep.push(index); // array indices of values to keep
      }
    });

    ['eqid', 'text', 'x', 'y', 'z'].forEach(key => {
      filtered[key] = [];

      keep.forEach(index =>
        filtered[key].push(data[key][index])
      );

      data[key] = filtered[key];
    });

    _update(data);
  };

  /**
   * Get the Plotly parameters for the given plot type.
   *
   * @param id {String <cumulative|hypocenters|magtime>}
   *
   * @return {Object}
   */
  _this.getParams = function (id) {
    var container = _addContainer(id, _featureId);

    return {
      config: _getConfig(id),
      data: _getData(id),
      graphDiv: container,
      layout: _getLayout(id),
      rendered: false
    };
  };

  /**
   * Get the HTML content for the depth range Slider (filter).
   *
   * @param value {Integer} default is null
   *     Slider's initial setting
   *
   * @return {String}
   */
  _this.getSlider = function (value = null) {
    var depths = _data.depth,
        extent = AppUtil.extent(depths),
        max = Math.ceil(extent[1]) || 9,
        min = Math.floor(extent[0]) || 0;

    if (Number.isInteger(value) && value < min) {
      value = min;
    } else if (Number.isInteger(value) && value > max) {
      value = max;
    }

    _slider = Slider({
      filter: _this.filter,
      id: _featureId + '-depth',
      label: 'Filter by depth',
      max: max,
      min: min,
      val: value || min
    });

    return _slider.getHtml();
  };

  /**
   * Get the Plotly trace for the given plot type.
   *
   * @param id {String <cumulative|hypocenters|magtime>}
   *
   * @return trace {Object}
   */
  _this.getTrace = function (id) {
    var data = _getTraceData(id),
        trace = {
          eqid: data.eqid,
          featureId: _featureId,
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
        color: data.color, // fill
        line: { // stroke
          color: 'rgb(65, 65, 65)',
          width: 1
        },
        opacity: 0.85,
        size: data.size,
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

  /**
   * Remove event listeners.
   */
  _this.removeListeners = function () {
    if (_plots) {
      _plots.forEach(plot => {
        if (
          plot.removeListener && // plot is rendered
          !plot.classList.contains('hypocenters') // 2d plots only
        ) {
          plot.removeListener('plotly_click', _openPopup);
        }
      });
    }

    _slider.removeListeners();
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = Plots;
