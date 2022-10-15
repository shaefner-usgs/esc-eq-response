/* global L */
'use strict';


var AppUtil = require('util/AppUtil');


/**
 * This class redefines L.Map.BoxZoom to zoom from the center point of the
 * visible map area, which varies depending on the header's height and whether
 * or not the sidebar is toggled on.
 */
L.Map.BoxZoom.include({
  /**
   * Override _onMouseUp from L.Map.BoxZoom.
   *
   * @param e {Event}
   */
  _onMouseUp: function (e) {
    var bounds, offsetX, offsetY;

    if ((e.which !== 1) && (e.button !== 1)) { return; }

    this._finish();

    if (!this._moved) { return; }
    // Postpone to next JS tick so internal click event handling
    // still see it as "moved".
    this._clearDeferredResetState();
    this._resetStateTimeout = setTimeout(L.Util.bind(this._resetState, this), 0);

    bounds = new L.LatLngBounds(
      this._map.containerPointToLatLng(this._startPoint),
      this._map.containerPointToLatLng(this._point)
    );

    offsetX = 0,
    offsetY = document.querySelector('header').offsetHeight;

    if (AppUtil.getParam('sidebar')) {
      offsetX = document.getElementById('sideBar').offsetWidth;
    }

    this._map
      .fitBounds(bounds, {
        paddingBottomRight: [offsetX, 0],
        paddingTopLeft: [0, offsetY]
      })
      .fire('boxzoomend', {boxZoomBounds: bounds});
  }
});
