/* global L */
'use strict';


/**
 * This class extends L.Control.Layers to sort the list of map layers based on
 * their stacking order on the map. It also adds the loader, count value, and
 * CSS class to the layer's name.
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

    this._displayNames = {}; // 'display' name includes the loader/count value
    this._names = {}; // 'original' layer name

    L.Control.Layers.prototype.initialize.call(this, baseLayers, overlays, options);
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
   * Override addOverlay from L.Control.Layers.
   *
   * @param feature {Object}
   */
  addOverlay: function (feature) {
    var layer = feature.mapLayer,
        name = feature.name;

    layer.id = feature.id; // need access to id for sorting

    L.Control.Layers.prototype.addOverlay.call(this, layer, name);
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
   * Reset to default state (but retain Catalog Search layer's display name).
   */
  reset: function () {
    this._displayNames = {
      'catalog-search': this._displayNames['catalog-search']
    };
  },

  /**
   * Override _addItem from L.Control.Layers.
   *
   * Include a loader or count value next to the overlay's name.
   *
   * @param obj {Object}
   *
   * @return label {Element}
   */
  _addItem: function (obj) {
    var label = document.createElement('label'),
        checked = this._map.hasLayer(obj.layer),
        input;

    if (obj.overlay) {
      input = document.createElement('input');
      input.type = 'checkbox';
      input.className = 'leaflet-control-layers-selector';
      input.defaultChecked = checked;
    } else {
      input = this._createRadioElement(`leaflet-base-layers_${L.Util.stamp(this)}`, checked);
    }

    this._layerControlInputs.push(input);
    input.layerId = L.Util.stamp(obj.layer);

    L.DomEvent.on(input, 'click', this._onInputClick, this);

    var name = document.createElement('span');
    name.innerHTML = ` ${obj.name}`;

    // Override
    var displayName = this._override(obj, label);
    if (displayName) {
      name.innerHTML = ` ${displayName}`;
    }

    // Helps from preventing layer control flicker when checkboxes are disabled
    // https://github.com/Leaflet/Leaflet/issues/2771
    var holder = document.createElement('span');

    label.appendChild(holder);
    holder.appendChild(input);
    holder.appendChild(name);

    var container = obj.overlay ? this._overlaysList : this._baseLayersList;
    container.appendChild(label);

    this._checkDisabledLayers();
    return label;
  },

  /**
   * Override _onInputClick from L.Control.Layers.
   *
   * Store the Feature's layer status (i.e. on/off) in sessionStorage.
   *
   * @param e {Event}
   */
  _onInputClick: function (e) {
    var id = e.target.closest('label').className || '', // Feature id
        name = id.replace('dd-', '') + '-layer',
        value = e.target.checked;

    if (id) {
      sessionStorage.setItem(name, value);
    }

    L.Control.Layers.prototype._onInputClick.call(this);
  },

  /**
   * Override for _addItem.
   *
   * Store the display name since Leaflet sets it back to its instantiated value
   * (no loader or count value) when the list is sorted.
   *
   * @param obj {Object}
   * @param label {Element}
   *
   * @return displayName {String}
   */
  _override: function (obj, label) {
    var displayName = '',
        id = obj.layer?.id || '';

    if (id) {
      displayName = this._displayNames[id] || '';

      if (!this._names[id]) {
        this._names[id] = obj.name; // store the 'original' name of the overlay
      }

      label.classList.add(id);
    }

    return displayName;
  },

  /**
   * Set the given Feature's display name, which is typically the Feature's
   * name, plus a loader or count value, depending on the state.
   *
   * @param id {String}
   *     Feature id
   */
  _setName: function (id) {
    var el = document.querySelector(`#map-pane label.${id} input + span`);

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
              pane = document.querySelector(`#map-pane .leaflet-${id}-pane`);

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
