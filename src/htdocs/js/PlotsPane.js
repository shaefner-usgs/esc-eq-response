/* global L, Plotly */
'use strict';


var AppUtil = require('util/AppUtil');


/**
 * Create, add, refresh, render, resize, update, and remove a Feature's
 * interactive Plotly plots.
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
 *       names: {Object}
 *       params: {Object}
 *       removeFeature: {Function}
 *       render: {Function}
 *       rendered: {Boolean}
 *       reset: {Function}
 *       resize: {Function}
 *       update: {Function}
 *     }
 */
var PlotsPane = function (options) {
  var _this,
      _initialize,

      _app,
      _configured,
      _el,
      _ids,
      _isRefreshing,

      _configPlots,
      _getParams,
      _isActive,
      _refresh,
      _swapButton,
      _toggleFilter,
      _togglePlot,
      _updateFilter,
      _updateParams;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;
    _configured = {};
    _el = options.el;
    _ids = [
      'magtime',
      'cumulative',
      'hypocenters'
    ];
    _isRefreshing = {};

    _this.names = {
      cumulative: 'Cumulative Earthquakes',
      hypocenters: '3D Hypocenters',
      magtime: 'Magnitude vs. Time'
    };
    _this.params = {};
    _this.rendered = false;

    // Make plots responsive
    window.onresize = function () {
      _this.resize();
    };
  };

  /**
   * Configure the plots: add listeners and swap the 'resetLastSave' button on
   * the hypocenters plot.
   *
   * @param featureId {String}
   */
  _configPlots = function (featureId) {
    var button, div, feature, params;

    if (!_configured[featureId]) {
      params = _this.params[featureId];
      div = params.hypocenters.graphDiv;
      button = div.querySelector('[data-attr="resetLastSave"]');
      feature = _app.Features.getFeature(featureId);

      feature.plots.addListeners(params);
      _swapButton(button);

      _configured[featureId] = true;
    }
  };

  /**
   * Get the Plotly parameters for either the given Feature, or all the selected
   * catalog's Features.
   *
   * @param feature {Object} optional; default is null
   *
   * @return params {Object}
   */
  _getParams = function (feature = null) {
    var catalog = AppUtil.getParam('catalog') || 'comcat',
        params = {};

    if (feature) {
      params[feature.id] = _this.params[feature.id];
    } else {
      Object.keys(_this.params).forEach(featureId => {
        if (
          (catalog === 'comcat' && !featureId.includes('dd-')) ||
          (catalog === 'dd' && featureId.includes('dd-'))
        ) {
          params[featureId] = _this.params[featureId];
        }
      });
    }

    return params;
  };

  /**
   * Check if the PlotsPane is currently active.
   *
   * @return {Boolean}
   */
  _isActive = function () {
    if (location.hash === '#plotsPane') {
      return true;
    }

    return false;
  };

  /**
   * Refresh the given Feature's plots with the newly fetched data.
   *
   * @param feature {Object}
   */
  _refresh = function (feature) {
    var mainshock = _app.Features.getFeature('mainshock');

    _ids.forEach(id => {
      var params = _this.params[feature.id][id];

      Object.assign(params, {
        data: [feature.plots.getTrace(id)],
        rendered: false
      });

      if (id !== 'cumulative') {
        params.data.push(mainshock.plots.getTrace(id));
      }

      _togglePlot(id, feature);
    });

    _updateFilter(feature);
    _updateParams(feature);
    feature.plots.addListeners(_this.params[feature.id]);

    _isRefreshing[feature.id] = false;
  };

  /**
   * Change the 'Reset camera' button to 'Autoscale' for consistency between
   * plots.
   *
   * @param button {Element}
   */
  _swapButton = function (button) {
    var path = button.querySelector('path');

    path.setAttribute('d', 'm250 850l-187 0-63 0 0-62 0-188 63 0 0 188 187 0 ' +
      '0 62z m688 0l-188 0 0-62 188 0 0-188 62 0 0 188 0 62-62 0z ' +
      'm-875-938l0 188-63 0 0-188 0-62 63 0 187 0 0 62-187 0z m875 ' +
      '188l0-188-188 0 0-62 188 0 62 0 0 62 0 188-62 0z m-125 188l-1 ' +
      '0-93-94-156 156 156 156 92-93 2 0 0 250-250 0 0-2 93-92-156-156-156 ' +
      '156 94 92 0 2-250 0 0-250 0 0 93 93 157-156-157-156-93 94 0 0 0-250 ' +
      '250 0 0 0-94 93 156 157 156-157-93-93 0 0 250 0 0 250z');
    button.setAttribute('data-title', 'Autoscale');
  };

  /**
   * Toggle the visibility to hide the hypocenters' filter when there's less
   * than 2 eqs.
   *
   * @param feature {Object}
   */
  _toggleFilter = function (feature) {
    var el = _el.querySelector(`.${feature.id} .filter`);

    if (feature.count < 2) {
      el.classList.add('hide');
    } else {
      el.classList.remove('hide');
    }
  };

  /**
   * Toggle the visibility to hide an 'empty' plot (i.e. no eqs).
   *
   * @param id {String <cumulative|hypocenters|magtime>}
   * @param feature {Object}
   */
  _togglePlot = function (id, feature) {
    var els = _el.querySelectorAll(`.${feature.id} .${id}`); // plot + header

    if (feature.count === 0 || (id === 'cumulative' && feature.count === 1)) {
      els.forEach(el => el.classList.add('hide'));
    } else {
      els.forEach(el => el.classList.remove('hide'));
    }

    _this.resize(); // ensure plots render full-width
  };

  /**
   * Update (replace) the given Feature's depth filter. Also filter the new data
   * based on its current setting.
   *
   * @param feature {Object}
   */
  _updateFilter = function (feature) {
    var slider, value,
        el = _el.querySelector(`.${feature.id} .filter`),
        input = el.querySelector('input'); // existing (previous) input

    if (input.value !== input.min) {
      value = Number(input.value); // user-set Slider value
    }
    slider = feature.plots.getSlider(value || null);

    el.insertAdjacentHTML('beforebegin', slider);
    el.remove();

    input = document.getElementById(feature.id + '-depth'); // new input

    feature.plots.filter.call(input);
  };

  /**
   * Update the given Feature's parameters in its description.
   *
   * @param feature {Object}
   */
  _updateParams = function (feature) {
    var description = feature.placeholder?.match(/<p[^>]+>(.*)<\/p>/)[1],
        el = _el.querySelector(`.${feature.id} .description`);

    if (el) {
      el.innerHTML = description; // replace description
    }
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add the given Feature's plots and render them if the PlotsPane is active
   * (visible). If the Feature is being refreshed, update the existing plots.
   *
   * @param feature {Object}
   */
  _this.addContent = function (feature) {
    var params = {};

    // Skip the Mainshock (it's included in other Features' plots)
    if (feature.plots && feature.id !== 'mainshock') {
      if (_isRefreshing[feature.id]) {
        _refresh(feature);
      } else {
        _ids.forEach(id => {
          params[id] = feature.plots.getParams(id); // adds headers, containers

          _togglePlot(id, feature);
        });

        _this.params[feature.id] = params; // add plot data
        _configured[feature.id] = false;
      }

      _toggleFilter(feature);

      if (_isActive()) {
        _this.render(feature);
      }
    }
  };

  /**
   * Add the given Feature's placeholder to the DOM. Plots are added when the
   * fetched data is ready.
   *
   * @param feature {Object}
   */
  _this.addFeature = function (feature) {
    var el, html;

    if (!_isRefreshing[feature.id]) {
      // Skip the Mainshock (it's included in other Features' plots)
      if (feature.plots && feature.id !== 'mainshock') {
        el = _el.querySelector('.container');
        html = L.Util.template(
          '<div class="{id} feature">' +
            '<h2>{name}</h2>' +
            '{placeholder}' +
          '</div>',
          feature
        );

        el.insertAdjacentHTML('beforeend', html);
      }
    }
  };

  /**
   * Remove the given Feature. If the Feature is being refreshed, leave it
   * intact, but remove its listeners.
   *
   * @param feature {Object}
   */
  _this.removeFeature = function (feature) {
    var plots,
        el = _el.querySelector('.' + feature.id);

    _isRefreshing[feature.id] = (feature.status === 'refreshing') ? true : false;

    if (el) {
      plots = el.querySelectorAll('.js-plotly-plot');

      plots.forEach(plot => {
        feature.plots.removeListeners(plot);

        if (!_isRefreshing[feature.id]) {
          Plotly.purge(plot);
        }
      });

      if (!_isRefreshing[feature.id]) {
        el.parentNode.removeChild(el);
      }
    }
  };

  /**
   * Create and render either the given Feature's plots, or all plots.
   *
   * Note: subsequent calls re-render existing plots.
   *
   * @param feature {Object} optional; default is null
   */
  _this.render = function (feature = null) {
    Object.keys(_getParams(feature)).forEach(featureId => { // Features
      var params = _this.params[featureId];

      Object.keys(params).forEach(id => { // plot types
        var plotly = params[id];

        if (!plotly.rendered) {
          Plotly.react(plotly.graphDiv, {
            config: plotly.config,
            data: plotly.data,
            layout: plotly.layout
          });

          plotly.rendered = true;
        }
      });

      _configPlots(featureId);
    });

    _this.rendered = true;
  };

  /**
   * Reset to default state.
   */
  _this.reset = function () {
    _el.querySelector('.container').innerHTML = '';

    _configured = {};
    _isRefreshing = {};

    _this.params = {};
    _this.rendered = false;
  };

  /**
   * Resize the plots: add responsive / fluid sizing.
   */
  _this.resize = function () {
    var plots = _el.querySelectorAll('.js-plotly-plot');

    if (_isActive()) {
      plots.forEach(plot => {
        if (!plot.classList.contains('hide')) {
          Plotly.Plots.resize(plot);
        }
      });
    }
  };

  /**
   * Update the 2d plots, rendering them in the currently selected timezone. 3d
   * plots don't need to be re-rendered b/c there's no time axis.
   */
  _this.update = function () {
    Object.keys(_getParams()).forEach(featureId => { // Features
      var feature = _app.Features.getFeature(featureId),
          params = _this.params[featureId];

      Object.keys(params).forEach(id => { // plot types
        if (id !== 'hypocenters') {
          params[id] = feature.plots.getParams(id);
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
