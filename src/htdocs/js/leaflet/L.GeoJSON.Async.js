/* global L */
'use strict';


require('leaflet/L.GeoJSON.DateLine');

var AppUtil = require('util/AppUtil');


/**
 * This class extends L.GeoJSON.DateLine to load a Feature's JSON feed
 * asynchronously and then return and add the fetched content. It accepts all
 * Leaflet GeoJSON options but returns an empty L.FeatureGroup by default, as
 * not all Features include a map layer.
 *
 * Fetched data is returned via the given Feature's addData method.
 *
 * Note: the fetched JSON data doesn't have to be in GeoJSON format if no map
 * layer is being created.
 *
 * @param url {String}
 *     URL of geoJSON data feed
 * @param options {Object}
 *     L.GeoJSON options (optional), plus:
 *
 *     {
 *       app: {Object}
 *       feature: {Object}
 *       host: {String} optional; for DD eqs which fetch via a local php script
 *     }
 */
L.GeoJSON.Async = L.GeoJSON.DateLine.extend({
  initialize: function (url, options) {
    var defaults = {
      pointToLayer: null // only fetch/return JSON data by default
    };

    options = Object.assign({}, defaults, options);

    this._app = options.app;
    this._feature = options.feature;
    this._host = options.host || '';
    this._json = null;
    this._url = new URL(url);

    // Fetch data for Features w/ no map layer (or layer turned 'off' by default)
    if (
      !this._feature.showLayer && // fetched via onAdd() if true
      !this._feature.deferFetch
    ) {
      this._fetch();
    }

    if (this._feature.deferFetch) {
      this._feature.status = 'ready'; // data loaded on demand by user, don't wait
    }

    // Delete non-L.GeoJSON options
    delete options.app;
    delete options.feature;
    delete options.host;

    L.GeoJSON.prototype.initialize.call(this, null, options);
  },

  /**
   * Override onAdd from L.GeoJSON.DateLine.
   *
   * @param map {Object}
   */
  onAdd: function (map) {
    this._fetch(); // fetch data if/when the map layer is turned 'on'

    L.GeoJSON.DateLine.prototype.onAdd.call(this, map);
  },

  /**
   * Add the Feature's content (i.e. the fetched data) to the Map/Plots/
   * SummaryPanes, etc.
   */
  _addContent: function () {
    var feature = this._feature,
        dependencies = this._app.Features.checkDependencies(feature);

    if (dependencies === 'ready') {
      if (feature.addData) {
        feature.addData(this._json);
      }
      if (feature.mapLayer) {
        this.addData(this._json); // L.GeoJSON: add to MapPane

        if (feature.showLayer) {
          this._render(); // L.GeoJSON.DateLine: render on both sides of IDL
        }
      }

      feature.status = 'ready';

      this._app.Features.addContent(feature); // add to Plots/SummaryPanes, etc
      this._deleteProps();
    } else { // dependencies not ready
      setTimeout(() => {
        this._addContent();
      }, 250);
    }

    if (feature.id === 'mainshock') {
      document.body.classList.replace('loading', 'mainshock');
    }
  },

  /**
   * Add a detailed error report in the StatusBar when loading fails.
   *
   * @param error {Object}
   * @param response {Object}
   * @param text {String}
   * @param type {String <notfound|timeout>}
   */
  _addError: function (error, response, text, type) {
    var feature = this._feature,
        host = this._host || this._url.hostname,
        message = `<h4>Error Loading ${feature.name}</h4>`;

    message += '<ul>';

    if (type === 'notfound') {
      message += `<li>Can’t find Event ID (${AppUtil.getParam('eqid')}) in catalog</li>`;
    } else if (type === 'timeout') {
      message += `<li>Request timed out (can’t connect to ${host})</li>`;
    } else {
      if (text.match('limit of 20000')) {
        message += '<li>Modify the parameters to match fewer earthquakes ' +
          '(max 20,000)</li>';
      } else if (text.match('parameter combination')){
        message += '<li>Missing parameters (all fields are required)</li>';
      } else if (response.status !== 200) {
        message += `<li>Error code: ${response.status} (${response.statusText})</li>`;
      } else { // generic error message
        message += `<li>${error.message}</li>`;
      }
    }

    message += '</ul>';

    this._app.StatusBar.addError({
      id: feature.id,
      message: message,
      mode: feature.mode,
      status: response.status
    });
  },

  /**
   * Add a loader next to the Feature's name.
   */
  _addLoader: function () {
    var feature = this._feature,
        els = this._app.Features.getHeaders(feature.id),
        loader = '<span class="breather"><span></span></span>';

    els.forEach(el => el.innerHTML = feature.name + loader);

    this._app.MapPane.layerControl.addLoader(loader, feature.id);

    if (feature.id === 'mainshock') {
      document.body.classList.add('loading');
    }
  },

  /**
   * Delete unneeded 'foreign' (non-Leaflet) properties.
   */
  _deleteProps: function () {
    delete this._app;
    delete this._feature;
    delete this._host;
    delete this._url;
  },

  /**
   * Fetch the JSON data.
   *
   * If Feature.deferFetch is set to true and the Feature's map layer is
   * turned off by default, its data will be fetched on demand when the layer
   * is turned on.
   */
  _fetch: async function () {
    var text, type,
        feature = this._feature,
        response = {};

    if (this._json) return; // only fetch data once

    this._json = {};
    feature.status = 'loading';

    this._app.StatusBar.addItem({
      id: feature.id,
      name: feature.name
    });
    this._addLoader();

    try {
      response = await AppUtil.fetchWithTimeout(this._url.href);
      this._json = await response.clone().json();
      feature.updated = Date.now();

      this._app.StatusBar.removeItem(feature.id);
      this._addContent();
    } catch (error) {
      feature.status = 'error';

      if (error.name === 'AbortError') {
        type = 'timeout';
      } else if (response.status === 404 && feature.id === 'mainshock') {
        type = 'notfound';

        this._app.Features.clearQueue();
      } else {
        text = await response.text();
      }

      this._addError(error, response, text, type);
      this._app.Features.removeFeature(feature);

      console.error(error);
    }
  }
});


L.geoJSON.async = function (url, options) {
  return new L.GeoJSON.Async(url, options);
};
