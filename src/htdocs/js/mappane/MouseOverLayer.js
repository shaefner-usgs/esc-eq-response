/* global L */
'use strict';


require('mappane/Utfgrid');

/**
 * This class enables mouseover labels on Leaflet Map using UtfGrid
 */
L.MouseOverLayer = L.LayerGroup.extend({
  /**
   * @param options {Object}
   *      tileUrl: URL to image tiles
   *      dataUrl: URL to UtfGrid tiles (requires callback={cb})
   *      tileOpts: Options to be used on L.TileLayer for image tiles
   *      dataOpts: Options to be used on L.UtfGrid for grid tiles
   *      tiptext: Template string to be used for auto-tooltipping on hover
   */
  initialize: function (options) {
    var className;

    // Create the two layers
    this._tileLayer = new L.TileLayer(options.tileUrl, options.tileOpts);
    this._dataLayer = new L.UtfGrid(options.dataUrl, options.dataOpts);

    if (typeof options.tiptext === 'string') {
      className = 'leaflet-tooltip leaflet-zoom-animated';

      this._tiptext = options.tiptext;
      this._tooltip = L.DomUtil.create('div', className);

      // hide this placeholder so it doesn't render on load
      this._tooltip.setAttribute('style', 'display: none');

      this.on('mouseover', this._onMouseOver, this);
      this.on('mouseout', this._onMouseOut, this);
    }

    // Call parent constructor
    L.LayerGroup.prototype.initialize.call(this);
    this.addLayer(this._tileLayer);
    if (!L.Browser.mobile) {
      this.addLayer(this._dataLayer);
    }
  },

  // --------------------------------------------------
  // Delegate event handling to the data layer
  // --------------------------------------------------

  on: function (/* types, fn, context */) {
    L.UtfGrid.prototype.on.apply(this._dataLayer, arguments);
  },

  off: function (/* types, fn, context */) {
    L.UtfGrid.prototype.off.apply(this._dataLayer, arguments);
  },

  // --------------------------------------------------
  // Override these methods inherited from LayerGroup
  // --------------------------------------------------

  onAdd: function (map) {
    L.LayerGroup.prototype.onAdd.call(this, map);

    if (this._tooltip) {
      map.getPanes().tooltipPane.appendChild(this._tooltip);
    }
  },

  onRemove: function (map) {
    L.LayerGroup.prototype.onRemove.call(this, map);

    if (this._tooltip) {
      L.DomUtil.remove(this._tooltip);
    }
  },

  // --------------------------------------------------
  // Auto hover tooltip helper methods
  // --------------------------------------------------

  _onMouseOver: function (evt) {
    var centerPoint,
        direction,
        map,
        pos,
        tooltip,
        tooltipPoint;

    map = this._map;
    tooltip = this._tooltip;

    pos = map.latLngToLayerPoint(evt.latlng);
    pos = pos.subtract(L.point(0, 10, true)); // shift tooltip up

    // Update text
    tooltip.innerHTML = L.Util.template(this._tiptext, evt.data);

    // Show the tooltip
    tooltip.style.display = 'block';
    L.DomUtil.setOpacity(tooltip, 0.9);

    // Position tooltip to left / right of cursor
    centerPoint = this._map.latLngToContainerPoint(map.getCenter());
    tooltipPoint = this._map.layerPointToContainerPoint(pos);
    if (tooltipPoint.x < centerPoint.x) { // left side of map, shift right
      direction = 'right';
      pos = pos.add(L.point(8, 0, true));
    } else { // right side of map, shift left
      direction = 'left';
      pos = pos.subtract(L.point(tooltip.offsetWidth + 3, 0, true));
    }

    L.DomUtil.removeClass(tooltip, 'leaflet-tooltip-left');
    L.DomUtil.removeClass(tooltip, 'leaflet-tooltip-right');
    L.DomUtil.addClass(tooltip, 'leaflet-tooltip-' + direction);
    L.DomUtil.setPosition(tooltip, pos);
  },

  _onMouseOut: function (/*evt*/) {
    // Hide the tooltip
    this._tooltip.style.display = 'none';
  }
});

L.mouseOverLayer = function (options) {
  return new L.MouseOverLayer(options);
};

module.exports = L.mouseOverLayer;
