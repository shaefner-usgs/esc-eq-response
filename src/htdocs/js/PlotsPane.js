/* global L, Plotly */
'use strict';


/**
 * Create, add, render, resize, update, and remove a Feature's interactive
 * Plotly plots.
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
      _el,

      _isActive,
      _swapButton;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;
    _el = options.el;

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

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add the Plotly parameters for the given Feature's plots. Render the plots
   * if the PlotsPane is active (visible).
   *
   * @param feature {Object}
   */
  _this.addContent = function (feature) {
    var ids, params;

    // Skip the Mainshock (it's included in other Features' plots)
    if (feature.plots && feature.id !== 'mainshock') {
      ids = ['magtime', 'cumulative', 'hypocenters'];
      params = {};

      ids.forEach(id => {
        if (feature.count > 0) {
          if (!(id === 'cumulative' && feature.count === 1)) {
            params[id] = feature.plots.getParams(id);
          }
        }
      });

      _this.params[feature.id] = params;

      if (_isActive()) {
        _this.render();
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
    var html, parent;

    // Skip the Mainshock (it's included in other Features' plots)
    if (feature.plots && feature.id !== 'mainshock') {
      html = L.Util.template(
        '<div class="{id} feature">' +
          '<h2>{name}</h2>' +
          '{placeholder}' +
        '</div>',
        feature
      );
      parent = _el.querySelector('.container');

      parent.insertAdjacentHTML('beforeend', html);
    }
  };

  /**
   * Remove the given Feature and its plots.
   *
   * @param feature {Object}
   */
  _this.removeFeature = function (feature) {
    var plots,
        container = _el.querySelector('.' + feature.id);

    if (container) {
      plots = container.querySelectorAll('.js-plotly-plot');

      plots.forEach(plot => {
        feature.plots.removeListeners(plot);
        Plotly.purge(plot);
      });
      delete _this.params[feature.id];

      container.parentNode.removeChild(container);
    }
  };

  /**
   * Create and render the plots.
   */
  _this.render = function () {
    Object.keys(_this.params).forEach(featureId => {
      var feature = _app.Features.getFeature(featureId),
          params = _this.params[featureId];

      Object.keys(params).forEach(id => { // plot types
        var button,
            plotly = params[id];

        if (!plotly.rendered) {
          Plotly.react(plotly.graphDiv, {
            config: plotly.config,
            data: plotly.data,
            layout: plotly.layout
          });

          if (id === 'hypocenters') {
            button = plotly.graphDiv.querySelector('[data-attr="resetLastSave"]');

            _swapButton(button); // make buttons consistent
          } else { // 2d plot
            feature.plots.addListeners(plotly.graphDiv);
          }

          plotly.rendered = true;
        }
      });
    });

    _this.rendered = true;
  };

  /**
   * Reset to default state.
   */
  _this.reset = function () {
    _el.querySelector('.container').innerHTML = '';

    _this.params = {};
    _this.rendered = false;
  };

  /**
   * Resize the plots: add responsive / fluid sizing.
   */
  _this.resize = function () {
    var plots = _el.querySelectorAll('.js-plotly-plot');

    if (_isActive()) {
      plots.forEach(plot =>
        Plotly.Plots.resize(plot)
      );
    }
  };

  /**
   * Update the 2d plots, rendering them in the currently selected timezone.
   */
  _this.update = function () {
    Object.keys(_this.params).forEach(featureId => {
      var feature = _app.Features.getFeature(featureId),
          params = _this.params[featureId];

      Object.keys(params).forEach(id => {
        if (id !== 'hypocenters') { // skip 3d plots
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
