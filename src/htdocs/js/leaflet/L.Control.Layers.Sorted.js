/* global L */
'use strict';


var AppUtil = require('util/AppUtil');


/**
 * This class extends L.Control.Layers to sort the list of map layers based on
 * their stacking order on the map. It also adds (and preserves) the loaders and
 * count values next to a Feature's name as well as its CSS classes, which are
 * attached to its <label>.
 *
 * Note: stacking order is controlled by setting the z-index value of the
 * Feature's custom [Leaflet map pane](https://leafletjs.com/reference.html#map-pane).
 *
 * @param baseLayers {Object}
 * @param overlays {Object}
 * @param options {Object}
 *     L.Control.Layers options
 */
L.Control.Layers.Sorted = L.Control.Layers.extend({
  initialize: function (baseLayers, overlays, options) {
    L.setOptions(this, {
      sortFunction: this._sort,
      sortLayers: true
    });

    this._classNames = {};
    this._displayNames = {}; // 'display' name includes the loader/count value
    this._names = {}; // 'original' layer name

    L.Control.Layers.prototype.initialize.call(this, baseLayers, overlays, options);
  },

  /**
   * Add a CSS class name, which is attached to the given Feature's <label>.
   *
   * @param className {String}
   * @param id {String}
   *     Feature id
   */
  addClass: function (className, id) {
    var label = document.querySelector('#mapPane .' + id);

    if (!this._classNames[id]) {
      this._classNames[id] = [];
    }

    label.classList.add(className);
    this._classNames[id].push(className); // store class to re-add when sorting
  },

  /**
   * Add the count value next to the given Feature's name (which replaces the
   * loader).
   *
   * @param count {String}
   * @param id {String}
   *     Feature id
   */
  addCount: function (count, id) {
    if (this._names[id]) {
      this._displayNames[id] = this._names[id] + count;
      this._setName(id);
    }
  },

  /**
   * Add a loader next to the given Feature's name.
   *
   * @param loader {String}
   * @param id {String}
   *     Feature id
   */
  addLoader: function (loader, id) {
    if (this._names[id]) {
      this._displayNames[id] = this._names[id] + loader;
      this._setName(id);
    }
  },

  /**
   * Override removeLayer from L.Control.Layers.
   *
   * Suppresses 'listener not found' warnings by ignoring alternate catalog's
   * Features that were already removed from the layer control.
   *
   * @param layer {Object}
   *
   * @return {Mixed}
   */
  removeLayer: function (layer) {
    var catalog = AppUtil.getParam('catalog') || 'comcat',
        mode = layer._feature?.mode || '';

    if ((mode === 'comcat' || mode === 'dd') && mode !== catalog) {
      return; // ignore alt-catalog Features
    }

    L.Control.Layers.prototype.removeLayer.call(this, layer);
  },

  /**
   * Remove the loader next to the given Feature's name.
   *
   * @param id {String}
   *     Feature id
   */
  removeLoader: function (id) {
    if (this._names[id]) {
      this._displayNames[id] = this._names[id];
      this._setName(id);
    }
  },

  /**
   * Reset to default state (but retain the Catalog Search layer's count value).
   */
  reset: function () {
    var search = this._displayNames.search;

    this._displayNames = {};
    this._displayNames.search = search;
  },

  /**
   * Override _addItem from L.Control.Layers.
   *
   * @param obj {Object}
   *
   * @return label {Element}
   */
  _addItem: function (obj) {
    var container, holder, input,
        checked = this._map.hasLayer(obj.layer),
        id = '',
        label = document.createElement('label'),
        name = obj.name, // default
        span = document.createElement('span');

    if (obj.overlay) {
      id = obj.layer.id || '';
      input = document.createElement('input');
      input.className = 'leaflet-control-layers-selector';
      input.defaultChecked = checked;
      input.type = 'checkbox';

      if (id) {
        if (!this._names[id]) {
          this._names[id] = obj.name; // store the 'original' name of the overlay
        }

        // Add CSS classes
        if (this._classNames[id]) {
          label.classList.add(this._classNames[id].join(','));
        }

        label.classList.add(id);
      }
    } else {
      input = this._createRadioElement('leaflet-base-layers_' + L.Util.stamp(this), checked);
    }

    this._layerControlInputs.push(input);
    input.layerId = L.Util.stamp(obj.layer);

    L.DomEvent.on(input, 'click', this._onInputClick, this);

    if (this._displayNames[id]) {
      name = this._displayNames[id];
    }
    span.innerHTML = ' ' + name;

    // Helps from preventing layer control flicker when checkboxes are disabled
    // https://github.com/Leaflet/Leaflet/issues/2771
    holder = document.createElement('span');

    label.appendChild(holder);
    holder.appendChild(input);
    holder.appendChild(span);

    container = obj.overlay ? this._overlaysList : this._baseLayersList;

    container.appendChild(label);
    this._checkDisabledLayers();

    return label;
  },

  /**
   * Set the given Feature's display name, which is typically the Feature's
   * name, plus either a loader or count value, depending on the status.
   *
   * Note: this is necessary to override Leaflet resetting the name to its
   * instantiated value (its name only) every time the list is sorted.
   *
   * @param id {String}
   *     Feature id
   */
  _setName: function (id) {
    var el = document.querySelector(`#mapPane label.${id} input + span`);

    if (el) {
      el.innerHTML = ' ' + this._displayNames[id];
    }
  },

  /**
   * Comparison function to sort the overlays based on the z-index values of the
   * layers' custom map panes.
   *
   * @params layerA, layerB {L.Layer}
   *
   * @return {Integer}
   */
  _sort: function (layerA, layerB) {
    var getOrder = function (layer) {
          var style,
              id = layer.id || '',
              order = 1, // default (baselayer)
              pane = document.querySelector(`#mapPane .leaflet-${id}-pane`);

          if (pane) { // custom map pane (overlay)
            style = window.getComputedStyle(pane);
            order = Number(style.getPropertyValue('z-index'));
          }

          return order;
        },
        order = [
          getOrder(layerA),
          getOrder(layerB)
        ];

    if (order[0] < order[1]) {
      return 1;
    } else if (order[0] > order[1]) {
      return -1;
    }

    return 0;
  }
});


L.control.layers.sorted = function (baseLayers, overlays, options) {
  return new L.Control.Layers.Sorted(baseLayers, overlays, options);
};
