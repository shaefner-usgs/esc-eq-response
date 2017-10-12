/* global L */
'use strict';


require('mappane/Utfgrid');

var CLASSES = 'leaflet-mouseover-tooltip';

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

    // Create the two layers
    this._tileLayer = new L.TileLayer(options.tileUrl, options.tileOpts);
    this._dataLayer = new L.UtfGrid(options.dataUrl, options.dataOpts);

    if (typeof options.tiptext === 'string') {
      this._tiptext = options.tiptext;
      this._tooltip = L.DomUtil.create('span', CLASSES);
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
        pos,
        tooltipPoint;

    // Update text
    this._tooltip.innerHTML = L.Util.template(this._tiptext, evt.data);

    // Position tooltip to right of cursor by default
    pos = this._map.latLngToLayerPoint(evt.latlng);

    // Show the tooltip
    this._tooltip.style.display = 'block';

    // Position tooltip to left of cursor on the right side of map
    centerPoint = this._map.latLngToContainerPoint(this._map.getCenter());
    tooltipPoint = this._map.layerPointToContainerPoint(pos);
    if (tooltipPoint.x > centerPoint.x) {
      pos = pos.subtract(L.point(this._tooltip.offsetWidth + 18, 3, true));
    }

    L.DomUtil.setPosition(this._tooltip, pos);
  },

  _onMouseOut: function (/*evt*/) {
    // Hide the tooltip
    this._tooltip.style.display = '';
  }
});

L.mouseOverLayer = function (options) {
  return new L.MouseOverLayer(options);
};

module.exports = L.mouseOverLayer;
