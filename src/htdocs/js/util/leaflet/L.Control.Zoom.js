/* global L */
'use strict';


/**
 * This class redefines L.Control.Zoom to zoom from the center point of the
 * visible map area, which varies depending on the header's height and whether
 * or not the sidebar is toggled on.
 */
L.Control.Zoom.include({
  /**
   * Override _zoomIn from L.Control.Zoom.
   *
   * @param e {Event}
   */
  _zoomIn: function (e) {
    var delta = this._map.options.zoomDelta * (e.shiftKey ? 3 : 1),
        zoom = this._map._zoom + delta;

    if (!this._disabled && this._map._zoom < this._map.getMaxZoom()) {
      this._map.setZoomAround(this._map.getVisibleCenter(), zoom);
    }
  },

  /**
   * Override _zoomOut from L.Control.Zoom.
   *
   * @param e {Event}
   */
  _zoomOut: function (e) {
    var delta = this._map.options.zoomDelta * (e.shiftKey ? 3 : 1),
        zoom = this._map._zoom - delta;

    if (!this._disabled && this._map._zoom > this._map.getMinZoom()) {
      this._map.setZoomAround(this._map.getVisibleCenter(), zoom);
    }
  }
});
