/* global Plotly */
'use strict';


/**
 * Create interactive plots using Plotly. Add/remove/render a Feature's plots
 * when they are created/updated using external feed data.
 *
 * @param options {Object}
 *   {
 *     app: {Object} Application
 *     el: {Element}
 *   }
 *
 * @return _this {Object}
 *   {
 *     addFeature: {Function}
 *     addLoader: {Function}
 *     getPlots: {Function}
 *     removeFeature: {Function}
 *     render: {Function}
 *     rendered: {Boolean}
 *     reset: {Function}
 *     resize: {Function}
 *   }
 */
var PlotsPane = function (options) {
  var _this,
      _initialize,

      _app,
      _contentEl,
      _el,
      _plots,

      _addContainer,
      _addCount,
      _addListeners,
      _getPlotlyParams,
      _isActive;


  _this = {};

  _initialize = function (options) {
    options = options || {};

    _app = options.app;
    _el = options.el || document.createElement('section');
    _contentEl = _el.querySelector('.content');
    _plots = {};

    _this.rendered = false;

    // Make plots responsive
    window.onresize = function () {
      _this.resize();
    };
  };

  /**
   * Add a plot's container and name to the DOM.
   *
   * @param id {String <cumulative|hypocenters|magtime>}
   * @param featureId {String}
   *
   * @return container {Element}
   */
  _addContainer = function (id, featureId) {
    var container = document.createElement('div'),
        h3 = document.createElement('h3'),
        names = {
          cumulative: 'Cumulative Earthquakes',
          hypocenters: '3D Hypocenters',
          magtime: 'Magnitude vs. Time'
        },
        parent = _contentEl.querySelector('.' + featureId + ' .bubble');

    h3.innerHTML = names[id];

    container.classList.add(id);
    parent.appendChild(h3);
    parent.appendChild(container);

    return container;
  };

  /**
   * Add the count value to the Feature's name and hide the 'loader'.
   *
   * @param feature {Object}
   * @param div {Element}
   */
  _addCount = function (feature, div) {
    var count,
        loader = div.querySelector('.breather');

    if (loader) {
      loader.classList.add('hide');
    }

    if (Object.prototype.hasOwnProperty.call(feature, 'count')) {
      count = document.createElement('span');

      count.classList.add('count', 'hide');
      count.textContent = feature.count;

      div.querySelector('h2').appendChild(count);

      // Trigger a reflow (to enable CSS transition), then unhide
      count.focus();
      count.classList.remove('hide');
    }
  };

  /**
   * Add event listeners.
   *
   * @param plot {Element}
   */
  _addListeners = function (plot) {
    var eqids, featureId, id, index, point;

    // Show the map and open a popup when the user clicks an eq on a 2d plot
    plot.on('plotly_click', data => {
      point = data.points[0];
      eqids = point.data.eqid;
      featureId = point.data.feature;
      index = point.pointNumber;
      id = point.data.id;

      // The first point (index 0) on cumulative aftershocks curve is Mainshock
      if (index === 0 && id === 'cumulative' && featureId === 'aftershocks') {
        featureId = 'mainshock';
      }

      _app.MapPane.openPopup(eqids[index], featureId);
    });
  };

  /**
   * Get the Plotly parameters that are used to instantiate a new plot.
   *
   * @param id {String <cumulative|hypocenters|magtime>}
   * @param feature {Object}
   *
   * @return {Object}
   *     parameters for Plotly.newPlot()
   */
  _getPlotlyParams = function (id, feature) {
    var container = _addContainer(id, feature.id);

    return {
      graphDiv: container,
      options: feature.plots.getOptions(id)
    };
  };

  /**
   * Check if PlotsPane is currently active.
   *
   * @return {Boolean}
   */
  _isActive = function () {
    if (location.hash === '#plotsPane') {
      return true;
    }

    return false;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add a Feature's plots. Plots are created and rendered when the PlotsPane is
   * first viewed by the user.
   *
   * @param feature {Object}
   */
  _this.addFeature = function (feature) {
    var div, html, params,
        plots = ['magtime', 'cumulative', 'hypocenters'];

    // Skip Mainshock (it's included in other Features' plots)
    if (feature.plots && feature.id !== 'mainshock') {
      div = _el.querySelector('div.' + feature.id);
      html = `<div class="bubble">${feature.description}</div>`;
      params = {};

      // Inserting node this way preserves CSS transitions
      div.insertAdjacentHTML('beforeend', html);

      plots.forEach(id => {
        if (feature.plots.getTrace(id)) { // null if no data
          if (!(id === 'cumulative' && feature.count === 1)) { // skip cumul. plot w/ 1eq
            params[id] = _getPlotlyParams(id, feature);
          }
        }
      });

      _plots[feature.id] = {
        params: params,
        rendered: false
      };

      _addCount(feature, div);

      if (_isActive()) {
        _this.render();
      }
    }
  };

  /**
   * Add a Feature's container, name and 'loader'.
   *
   * @param feature {Object}
   */
  _this.addLoader = function (feature) {
    var div;

    // Mainshock is included in other Features' plots, but not on its own
    if (Object.prototype.hasOwnProperty.call(feature, 'plots') &&
      feature.id !== 'mainshock'
    ) {
      div = document.createElement('div');
      div.innerHTML = '<h2>' + feature.name + '<span class="breather">' +
        '<span></span></span></h2>';

      div.classList.add(feature.id, 'feature');

      _contentEl.appendChild(div);
    }
  };

  /**
   * Get Plotly params for all Features that have plots.
   *
   * @return _plots {Object}
   */
  _this.getPlots = function () {
    return _plots;
  };

  /**
   * Remove a Feature's plots.
   *
   * @param feature {Object}
   */
  _this.removeFeature = function (feature) {
    var plots,
        el = _el.querySelector('.' + feature.id);

    if (el) {
      plots = el.querySelectorAll('.js-plotly-plot');

      plots.forEach(plot =>
        Plotly.purge(plot)
      );

      el.parentNode.removeChild(el);
    }
  };

  /**
   * Render the plots.
   */
  _this.render = function () {
    var graphDiv, params, path, rendered, resetButton;

    // Loop thru plots by Feature
    Object.keys(_plots).forEach(featureId => {
      params = _plots[featureId].params;
      rendered = _plots[featureId].rendered;

      if (!rendered) {
        // Loop thru plot types
        Object.keys(params).forEach(id => {
          graphDiv = params[id].graphDiv;

          Plotly.newPlot(graphDiv, params[id].options);

          if (id !== 'hypocenters') { // skip click events on 3d plots
            _addListeners(graphDiv);
          }
        });

        _plots[featureId].rendered = true;

        // Change 'reset camera' button -> 'autoscale' for consistency w/ other plots
        if (params.hypocenters) {
          resetButton = params.hypocenters.graphDiv.querySelector(
            '[data-attr="resetLastSave"]'
          );
          path = resetButton.querySelector('path');

          path.setAttribute('d', 'm250 850l-187 0-63 0 0-62 0-188 63 0 0 188 ' +
            '187 0 0 62z m688 0l-188 0 0-62 188 0 0-188 62 0 0 188 0 62-62 ' +
            '0z m-875-938l0 188-63 0 0-188 0-62 63 0 187 0 0 62-187 0z m875 ' +
            '188l0-188-188 0 0-62 188 0 62 0 0 62 0 188-62 0z m-125 188l-1 ' +
            '0-93-94-156 156 156 156 92-93 2 0 0 250-250 0 0-2 93-92-156-156-156 ' +
            '156 94 92 0 2-250 0 0-250 0 0 93 93 157-156-157-156-93 94 0 0 ' +
            '0-250 250 0 0 0-94 93 156 157 156-157-93-93 0 0 250 0 0 250z');
          resetButton.setAttribute('data-title', 'Autoscale');
        }
      }
    });

    _this.rendered = true;
  };

  /**
   * Reset to default state.
   */
  _this.reset = function () {
    _plots = {};

    _contentEl.innerHTML = '';
    _this.rendered = false;
  };

  /**
   * Resize plots: adds responsive / fluid sizing.
   */
  _this.resize = function () {
    var plots = _el.querySelectorAll('.js-plotly-plot');

    if (_isActive()) {
      plots.forEach(plot =>
        Plotly.Plots.resize(plot)
      );
    }
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = PlotsPane;
