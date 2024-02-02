/* global L, Plotly */
'use strict';


var AppUtil = require('util/AppUtil');


var _TYPES = [ // plot types, in rendering order
  'magtime',
  'cumulative',
  'hypocenters'
];


/**
 * Create, add, configure, refresh, render, resize, update, and remove a
 * Feature's interactive Plotly plots.
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *       el: {Element}
 *     }
 *
 * @return _this {Object}
 *     {
 *       addContent: {Function}
 *       addFeature: {Function}
 *       params: {Object}
 *       plotDivs: {Object}
 *       removeFeature: {Function}
 *       render: {Function}
 *       reset: {Function}
 *       resize: {Function}
 *       update: {Function}
 *     }
 */
var PlotsPane = function (options) {
  var _this,
      _initialize,

      _app,
      _el,

      _addContainer,
      _addFilter,
      _addPlots,
      _getFeatures,
      _refresh,
      _swapButton,
      _togglePlots;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;
    _el = options.el;

    _this.params = {};
    _this.plotDivs = {};

    // Make plots responsive
    window.onresize = function () {
      _this.resize();
    };
  };

  /**
   * Add the given Feature/plot type's container (and header).
   *
   * @param feature {Object}
   * @param type {String <cumulative|hypocenters|magtime>}
   * @param params {Object}
   *
   * @return container {Element}
   */
  _addContainer = function (feature, type, params) {
    var container = document.createElement('div'),
        h3 = `<h3 class="${type}">${params.layout.name}</h3>`,
        parent = _el.querySelector(`.${feature.id} .bubble`);

    parent.appendChild(container);
    container.classList.add(type);
    container.insertAdjacentHTML('beforebegin', h3);

    return container;
  };

  /**
   * Add the given Feature's hypocenters plot filter if there's at least 2 eqs
   * and there is a range in depth values.
   *
   * @param feature {Object}
   */
  _addFilter = function (feature) {
    var el, html, value,
        depths = _this.params[feature.id].hypocenters.data[0].z,
        hasRange = !depths.every((val, i, arr) =>
          Math.ceil(Math.round(10 * val) / 10) ===
          Math.ceil(Math.round(10 * arr[0]) / 10)
        ),
        id = feature.type + '-depth';

    if (feature.count >= 2 && hasRange) {
      el = _el.querySelector(`.${feature.id} div.hypocenters`);
      value = parseInt(sessionStorage.getItem(id));
      html = feature.plots.getSlider(value);

      el.insertAdjacentHTML('afterend', html);

      feature.plots.filter.call(document.getElementById(id)); // filter data
    }
  };

  /**
   * Add the given Feature's plots (i.e. add the framework and store their data).
   *
   * @param feature {Object}
   */
  _addPlots = function (feature) {
    var el = _el.querySelector(`.${feature.id} .bubble`),
        timestamp = _app.Features.getTimeStamp(feature.data),
        html = `<dl class="props timestamp">${timestamp}</dl>`,
        params = {},
        plotDivs = {};

    _TYPES.forEach(type => {
      params[type] = feature.plots.getParams(type);
      plotDivs[type] = _addContainer(feature, type, params[type]);
    });

    _this.params[feature.id] = params;
    _this.plotDivs[feature.id] = plotDivs;

    el.insertAdjacentHTML('beforeend', html);
  };

  /**
   * Get the current catalog's Features that have plots (but skip the Mainshock
   * which does not have its own standalone plot).
   *
   * @return {Object}
   */
  _getFeatures = function () {
    var catalog = AppUtil.getParam('catalog') || 'comcat',
        features = _app.Features.getFeatures(catalog),
        array = Object.entries(features),
        filtered = array.filter(([id, feature]) => {
          if (
            !id.includes('mainshock') &&
            feature.plots && !AppUtil.isEmpty(feature.plots)
          ) return true;
        });

    return Object.fromEntries(filtered);
  };

  /**
   * Refresh the given Feature's existing plots.
   *
   * @param feature {Object}
   */
  _refresh = function (feature) {
    var description = _el.querySelector(`.${feature.id} .description`),
        filter = _el.querySelector(`.${feature.id} .filter`),
        text = feature.placeholder?.match(/<p[^>]+>(.*)<\/p>/)[1],
        timestamp = _el.querySelector(`.${feature.id} .timestamp`);

    filter?.remove(); // previous depth filter

    description.innerHTML = text;
    timestamp.innerHTML = _app.Features.getTimeStamp(feature.data);

    _TYPES.forEach(type => {
      var params = _this.params[feature.id][type];

      Object.assign(params, {
        data: feature.plots.getParams(type).data,
        rendered: false
      });
    });
  };

  /**
   * Change the 'Reset camera' button to 'Autoscale' for consistency between
   * plots.
   *
   * @param id {String}
   *     Feature id
   */
  _swapButton = function (id) {
    var plot = _el.querySelector(`.${id} div.hypocenters`),
        button = plot.querySelector('[data-attr="resetLastSave"]'),
        path = button.querySelector('path');

    if (button.getAttribute('data-title') !== 'Autoscale') {
      button.setAttribute('data-title', 'Autoscale');
      path.setAttribute('d', 'm250 850l-187 0-63 0 0-62 0-188 63 0 0 188 187 0 ' +
        '0 62z m688 0l-188 0 0-62 188 0 0-188 62 0 0 188 0 62-62 0z ' +
        'm-875-938l0 188-63 0 0-188 0-62 63 0 187 0 0 62-187 0z m875 ' +
        '188l0-188-188 0 0-62 188 0 62 0 0 62 0 188-62 0z m-125 188l-1 ' +
        '0-93-94-156 156 156 156 92-93 2 0 0 250-250 0 0-2 93-92-156-156-156 ' +
        '156 94 92 0 2-250 0 0-250 0 0 93 93 157-156-157-156-93 94 0 0 0-250 ' +
        '250 0 0 0-94 93 156 157 156-157-93-93 0 0 250 0 0 250z');
    }
  };

  /**
   * Toggle the visibility so that 'empty' plots (i.e. no eqs) are hidden.
   *
   * @param feature {Object}
   */
  _togglePlots = function (feature) {
    var count = feature.count;

    _TYPES.forEach(type => {
      var els = _el.querySelectorAll(`.${feature.id} .${type}`); // plot + header

      if (
        count === 0 ||
        (type === 'cumulative' && count === 1)
      ) {
        els.forEach(el => el.classList.add('hide'));
      } else {
        els.forEach(el => el.classList.remove('hide'));
      }
    });

    _this.resize(); // ensure plots render full-width
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add or refresh the given Feature's plots and render them. If refreshing,
   * update the existing plots.
   *
   * @param feature {Object}
   */
  _this.addContent = function (feature) {
    if (AppUtil.isEmpty(feature.plots)) return;

    if (feature.isRefreshing) {
      _refresh(feature);
    } else {
      _addPlots(feature);
    }

    _addFilter(feature);
    _togglePlots(feature);

    _this.render(feature);
  };

  /**
   * Add the given Feature's placeholder. Plots are added separately when the
   * fetched data is ready.
   *
   * @param feature {Object}
   */
  _this.addFeature = function (feature) {
    var el = _el.querySelector('.container'),
        html = L.Util.template(
          '<div class="{id} feature">' +
            '<h2>{name}</h2>' +
            '{placeholder}' +
          '</div>',
          feature
        );

    el.insertAdjacentHTML('beforeend', html);
  };

  /**
   * Remove the given Feature.
   *
   * @param feature {Object}
   */
  _this.removeFeature = function (feature) {
    var plots,
        el = _el.querySelector('.' + feature.id);

    if (el) {
      plots = el.querySelectorAll('.js-plotly-plot');

      plots.forEach(plot => Plotly.purge(plot));
      el.parentNode.removeChild(el);
    }
  };

  /**
   * Render either the given Feature's plots, or all plots.
   *
   * Note: subsequent calls re-render existing plots if their 'rendered' flag is
   *       set to false.
   *
   * @param feature {Object} optional; default is null
   */
  _this.render = function (feature = null) {
    var features = {};

    if (feature) {
      features[feature.id] = feature;
    } else {
      features = _getFeatures();
    }

    Object.keys(features).forEach(id => {
      _TYPES.forEach(type => {
        var plotly = _this.params[id][type];

        if (!plotly.rendered) {
          Plotly.react(_this.plotDivs[id][type], {
            config: plotly.config,
            data: plotly.data,
            layout: plotly.layout
          });

          plotly.rendered = true;
        }
      });

      _swapButton(id);
    });
  };

  /**
   * Reset to default state.
   */
  _this.reset = function () {
    _el.querySelector('.container').innerHTML = '';

    _this.params = {};
    _this.plotDivs = {};
  };

  /**
   * Resize plots: add responsive/fluid sizing.
   */
  _this.resize = function () {
    var plots = _el.querySelectorAll('.js-plotly-plot');

    plots.forEach(plot => {
      if (!plot.classList.contains('hide')) {
        Plotly.Plots.resize(plot);
      }
    });
  };

  /**
   * Update plots to reflect the selected timezone.
   */
  _this.update = function () {
    Object.keys(_getFeatures()).forEach(id => {
      var feature = _app.Features.getFeature(id);

      _TYPES.forEach(type => {
        var params = _this.params[id][type];

        if (type !== 'hypocenters') { // no time axis to update
          var plotly = feature.plots.getParams(type);

          Object.assign(params, {
            data: plotly.data,
            layout: plotly.layout,
            rendered: false
          });
        }
      });
    });

    _this.render();
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = PlotsPane;
