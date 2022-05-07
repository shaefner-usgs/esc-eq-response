/* global L */
'use strict';


require('utfgrid');


/**
 * This class extends L.LayerGroup to enable mouseover tooltips to track the
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
    var classNames = 'leaflet-tooltip leaflet-zoom-animated';

    // Create the data and tile layers
    this._dataLayer = L.utfGrid(options.dataUrl, options.dataOpts);
    this._tileLayer = L.tileLayer(options.tileUrl, options.tileOpts);

    if (typeof options.tiptext === 'string') {
      this._tiptext = options.tiptext;
      this._tooltip = L.DomUtil.create('div', classNames);

      this._tooltip.setAttribute('style', 'display: none'); // hide placeholder
    }

    L.LayerGroup.prototype.initialize.call(this);

    this.addLayer(this._tileLayer);
    if (!L.Browser.mobile) {
      this.addLayer(this._dataLayer);
    }
  },

  // --------------------------------------------------
  // Override onAdd, onRemove methods from L.LayerGroup
  // --------------------------------------------------

  onAdd: function (map) {
    L.LayerGroup.prototype.onAdd.call(this, map);

    if (this._tooltip) {
      map.getPanes().tooltipPane.appendChild(this._tooltip);

      this._dataLayer.on('mouseover', this._onMouseOver, this);
      this._dataLayer.on('mouseout', this._onMouseOut, this);
    }
  },

  onRemove: function (map) {
    L.LayerGroup.prototype.onRemove.call(this, map);

    if (this._tooltip) {
      L.DomUtil.remove(this._tooltip);

      this._dataLayer.off('mouseover', this._onMouseOver, this);
      this._dataLayer.off('mouseout', this._onMouseOut, this);
    }
  },

  /**
   * Show the tooltip.
   *
   * @param e {Event}
   */
  _onMouseOver: function (e) {
    var centerPoint,
        direction,
        pos,
        tooltipPoint;

    centerPoint = this._map.latLngToContainerPoint(this._map.getCenter());
    pos = this._map.latLngToLayerPoint(e.latlng)
      .subtract(L.point(0, 10, true)); // shift tooltip up
    tooltipPoint = this._map.layerPointToContainerPoint(pos);

    if (document.body.classList.contains('sidebar')) {
      centerPoint.x -= 200;
    }

    this._tooltip.innerHTML = L.Util.template(this._tiptext, e.data);
    this._tooltip.style.display = 'block';

    if (tooltipPoint.x < centerPoint.x) { // left side of map; show on right
      direction = 'right';
      pos = pos.add(L.point(10, 0, true));
    } else { // right side of map; show on left
      direction = 'left';
      pos = pos.subtract(L.point(this._tooltip.offsetWidth + 5, 0, true));
    }

    L.DomUtil.removeClass(this._tooltip, 'leaflet-tooltip-left');
    L.DomUtil.removeClass(this._tooltip, 'leaflet-tooltip-right');
    L.DomUtil.addClass(this._tooltip, 'leaflet-tooltip-' + direction);
    L.DomUtil.setPosition(this._tooltip, pos);
  },

  /**
   * Hide the tooltip.
   */
  _onMouseOut: function () {
    this._tooltip.style.display = 'none';
  }
});


L.mouseOverLayer = function (options) {
  return new L.MouseOverLayer(options);
};
