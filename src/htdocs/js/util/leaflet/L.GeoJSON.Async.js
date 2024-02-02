/* global L */
'use strict';


require('util/leaflet/L.GeoJSON.DateLine');

var AppUtil = require('util/AppUtil');


var _DEFAULTS = {
  host: '',
  pointToLayer: null // only fetch and return JSON data by default
};


/**
 * This class extends L.GeoJSON.DateLine to load a Feature's JSON feed
 * asynchronously and then add the fetched data. It accepts all Leaflet
 * GeoJSON options but returns an empty L.GeoJSON layer by default, as not all
 * Features include a map layer.
 *
 * Note: if no map layer is being created, it's not necessary for the fetched
 * JSON data to be in GeoJSON format.
 *
 * @param url {String}
 *     URL of JSON data feed
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
    options = Object.assign({}, _DEFAULTS, options);

    this._app = options.app;
    this._feature = options.feature;
    this._fetched = false;
    this._host = options.host;
    this._json = {};
    this._url = new URL(url);

    if (!this._feature.deferFetch) {
      this._fetch();
    }

    // Delete internal, non-L.GeoJSON options
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
    var feature = this._feature;

    if (feature.deferFetch && feature.status !== 'loading') {
      this._fetch(); // fetch data on demand when map layer is turned on
    }

    L.GeoJSON.DateLine.prototype.onAdd.call(this, map);
  },

  /**
   * Add the count value next to the Feature's name (if applicable).
   *
   * @param feature {Object} optional; default is this._feature
   */
  addCount: function (feature = this._feature) {
    var value,
        count = '', // default (removes the loader)
        els = this._getHeaders();

    if (Object.hasOwn(feature, 'count')) {
      value = AppUtil.addCommas(feature.count);
      count = `<span class="count">${value}</span>`;
    }

    els.forEach(el => el.innerHTML = feature.name + count);

    this._app.MapPane.layerControl.addCount(count, feature.id);
    this._flagCount(feature.id, els);
  },

  /**
   * Add the fetched data (via the Feature's render method) and also store the
   * Feature. Also remove the previous Feature if refreshing.
   */
  _addData: function () {
    var feature = this._feature,
        dependencies = this._app.Features.checkDependencies(feature),
        prevFeature = this._app.Features.getFeature(feature.id);

    if (dependencies === 'ready') {
      feature.updated = this._getUpdated();

      if (feature.isRefreshing) { // replace existing Feature
        prevFeature.isRefreshing = true;

        feature.add();
        prevFeature.remove();
        prevFeature.destroy();
      }

      this._app.Features.storeFeature(feature);

      if (feature.render) {
        feature.render(this._json);
        this.addCount();
      }

      feature.isRefreshing = false;
    } else { // dependencies not ready
      setTimeout(() => this._addData(), 100);
    }
  },

  /**
   * Add a detailed error message in the StatusBar and console when loading
   * fails.
   *
   * @param error {Object}
   * @param response {Object}
   * @param text {String} optional; default is ''
   * @param type {String <network|notfound|timeout>} optional; default is ''
   */
  _addError: function (error, response, text = '', type = '') {
    var eqid, number,
        feature = this._feature,
        host = this._host || this._url.hostname,
        message = `<h4>Error Loading ${feature.name}</h4>`;

    message += '<ul>';

    if (type === 'notfound') {
      eqid = AppUtil.getParam('eqid');
      message += `<li>Can’t find Event ID (${eqid}) in catalog</li>`;
    } else if (type === 'timeout') {
      message += `<li>Request timed out (can’t connect to ${host})</li>`;
    } else if (type === 'network') {
      message += '<li>Network error</li>';
    } else {
      if (text.includes('limit of 20000')) {
        number = text.match(/(\d+) matching events/)[1];
        message += '<li>The <a href="#">current settings</a> matched ' +
          AppUtil.addCommas(number) + ' earthquakes (max 20,000).</li>';
      } else if (text.includes('parameter combination')){
        message += '<li><a href="#">Required settings</a> are missing.</li>';
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

    console.error(error);
  },

  /**
   * Add a loader next to the Feature's name (if applicable).
   */
  _addLoader: function () {
    var els = this._getHeaders(),
        feature = this._feature,
        loader = '<span class="breather"><span></span></span>';

    els.forEach(el => el.innerHTML = feature.name + loader);

    this._app.MapPane.layerControl.addLoader(loader, feature.id);
  },

  /**
   * Clean up after a failed fetch request.
   */
  _cleanup: function () {
    var prevFeature,
        feature = this._feature;

    if (feature.id.includes('mainshock')) {
      this._app.Features.clearQueue();
      document.body.classList.remove('loading');
    }

    if (feature.isRefreshing) {
      prevFeature = this._app.Features.getFeature(feature.id);

      this.addCount(prevFeature);
    } else {
      if (feature.remove) {
        feature.remove();
      }

      this._app.Features.deleteFeature(feature.id);
      this._removeLoader(); // loader in SettingsBar
    }

    feature.destroy();
    this._app.SearchBar.setButton();
    this._app.SettingsBar.setStatus(feature, 'enabled');
  },

  /**
   * Fetch the JSON data and display the loading status. Also set the error type
   * on failure.
   */
  _fetch: async function () {
    var text, type, url,
        feature = this._feature,
        options = {},
        response = {};

    if (this._fetched) return; // only fetch data once

    feature.status = 'loading';
    url = this._url.href;

    if (url.includes('php/fdsn/search.json.php')) {
      options.timeout = 120000; // increase for DD catalog search (it's slooow)
    }

    this._app.SettingsBar.setStatus(feature, 'disabled');
    this._app.StatusBar.addItem({
      id: feature.id,
      name: feature.name
    });
    this._addLoader();

    try {
      response = await AppUtil.fetchWithTimeout(url, options);
      this._json = await response.clone().json();
      this._fetched = true;

      this._app.StatusBar.removeItem(feature.id);
      this._addData();
    } catch (error) {
      feature.status = 'error';

      if (error.name === 'AbortError') {
        type = 'timeout';
      } else if (error.name === 'TypeError') {
        type = 'network';
      } else if ( // DD catalog sometimes returns error 400 for failed MS query
        feature.id.includes('mainshock') &&
        (response.status === 400 || response.status === 404)
      ) {
        type = 'notfound';
      } else {
        text = await response.text();
      }

      this._addError(error, response, text, type);
      this._cleanup();
    }
  },

  /**
   * Add a flag to the given Feature's count value so its animation is played
   * only once.
   *
   * @param id {String}
   *     Feature id
   * @param headers {Array}
   */
  _flagCount: function (id, headers) {
    var subheaders = document.querySelectorAll(`#summary-pane .${id} h3`),
        els = Array.from(headers).concat(Array.from(subheaders));

    setTimeout(() => { // allow animation to complete
      els.forEach(el => {
        var count = el.querySelector('.count');

        if (count) {
          count.classList.add('played');
        }
      });
    }, 500);
  },

  /**
   * Get the Feature's header elements.
   *
   * @return els {Array}
   */
  _getHeaders: function () {
    var els = [],
        id = this._feature.id,
        type = this._feature.type,
        selectors = [
          `#plots-pane .${id} h2`,
          `#settings-bar .${type} h3`,
          `#summary-pane .${id} h2`
        ];

    selectors.forEach(selector => {
      var el = document.querySelector(selector);

      if (el) {
        els.push(el);
      }
    });

    return els;
  },

  /**
   * Get the updated time.
   *
   * @return millisecs {Integer}
   */
  _getUpdated: function () {
    var generated = this._json.metadata?.generated,
        millisecs = Date.now(); // default

    if (generated) { // use feed's generated time
      millisecs = parseInt(generated, 10);
    }

    return millisecs;
  },

  /**
   * Remove the loader next to the Feature's name (if applicable).
   */
  _removeLoader: function () {
    var feature = this._feature,
        els = this._getHeaders(feature.id);

    els.forEach(el => el.innerHTML = feature.name);
  }
});


L.geoJSON.async = function (url, options) {
  return new L.GeoJSON.Async(url, options);
};
