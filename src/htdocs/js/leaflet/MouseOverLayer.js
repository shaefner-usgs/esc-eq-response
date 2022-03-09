/* global L */
'use strict';


require('utfgrid');


/**
 * This class extends L.LayerGroup to enable mouseover labels to track the
 * cursor on a UtfGrid layer.
 *
 * @param options {Object}
 *   {
 *     dataOpts: {Object} Options to be used on L.UtfGrid for grid tiles
 *     dataUrl: {String} URL to UtfGrid tiles (requires 'callback={cb}')
 *     tileOpts: {Object} Options to be used on L.TileLayer for image tiles
 *     tileUrl: {String} URL to image tiles
 *     tiptext: {String} Template used for auto-tooltipping on hover
 *   }
 */
L.MouseOverLayer = L.LayerGroup.extend({
  initialize: function (options) {
    var className;

    // Create the two layers
    this._tileLayer = L.tileLayer(options.tileUrl, options.tileOpts);
    this._dataLayer = L.utfGrid(options.dataUrl, options.dataOpts);

    if (typeof options.tiptext === 'string') {
      className = 'leaflet-tooltip leaflet-zoom-animated';

      this._tiptext = options.tiptext;
      this._tooltip = L.DomUtil.create('div', className);

      this._tooltip.setAttribute('style', 'display: none'); // hide placeholder

      this.on('mouseover', this._onMouseOver, this);
      this.on('mouseout', this._onMouseOut, this);
    }

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
    pos = map.latLngToLayerPoint(evt.latlng);
    pos = pos.subtract(L.point(0, 10, true)); // shift tooltip up
    tooltip = this._tooltip;

    tooltip.innerHTML = L.Util.template(this._tiptext, evt.data);
    tooltip.style.display = 'block';

    L.DomUtil.setOpacity(tooltip, 0.9);

    // Position tooltip to left / right of cursor depending on relative position
    centerPoint = this._map.latLngToContainerPoint(map.getCenter());
    tooltipPoint = this._map.layerPointToContainerPoint(pos);

    if (tooltipPoint.x < centerPoint.x) { // left side of map, shift right
      direction = 'right';
      pos = pos.add(L.point(10, 0, true));
    } else { // right side of map, shift left
      direction = 'left';
      pos = pos.subtract(L.point(tooltip.offsetWidth + 5, 0, true));
    }

    L.DomUtil.addClass(tooltip, 'leaflet-tooltip-' + direction);
    L.DomUtil.removeClass(tooltip, 'leaflet-tooltip-left');
    L.DomUtil.removeClass(tooltip, 'leaflet-tooltip-right');
    L.DomUtil.setPosition(tooltip, pos);
  },

  _onMouseOut: function () {
    this._tooltip.style.display = 'none';
  }
});


L.mouseOverLayer = function (options) {
  return new L.MouseOverLayer(options);
};
