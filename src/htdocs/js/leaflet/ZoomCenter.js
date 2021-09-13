/* global L */
'use strict';


/**
 * Zoom map from center point of visible map area, which varies depending on
 * the header's height and whether or not the sidebar is toggled on.
 */
L.Control.Zoom.Center = L.Control.Zoom.extend({
  _getCenter: function () {
    var offsetX,
        offsetY,
        point,
        sidebar;

    offsetX = document.getElementById('sideBar').offsetWidth / 2;
    offsetY = document.querySelector('header').offsetHeight / 2;
    point = this._map.getSize().divideBy(2).add([0, offsetY]);
    sidebar = document.body.classList.contains('sidebar');

    if (sidebar) {
      point = point.subtract([offsetX, 0]);
    }

    return this._map.containerPointToLatLng(point);
  },

  _zoomIn: function (e) {
    var zoom = this._map._zoom + this._map.options.zoomDelta * (e.shiftKey ? 3 : 1);

    if (!this._disabled && this._map._zoom < this._map.getMaxZoom()) {
      this._map.setZoomAround(this._getCenter(), zoom);
    }
  },

  _zoomOut: function (e) {
    var zoom = this._map._zoom - this._map.options.zoomDelta * (e.shiftKey ? 3 : 1);

    if (!this._disabled && this._map._zoom > this._map.getMinZoom()) {
      this._map.setZoomAround(this._getCenter(), zoom);
    }
  }
});

L.control.zoom.center = function(opts) {
  return new L.Control.Zoom.Center(opts);
};
