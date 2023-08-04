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
    if ((e.which !== 1) && (e.button !== 1)) { return; }

    this._finish();

    if (!this._moved) { return; }
    // Postpone to next JS tick so internal click event handling
    // still see it as "moved".
    this._clearDeferredResetState();
    this._resetStateTimeout = setTimeout(this._resetState.bind(this), 0);

    var bounds = new L.LatLngBounds(
      this._map.containerPointToLatLng(this._startPoint),
      this._map.containerPointToLatLng(this._point));

    this._map
      .fitBounds(bounds, this._override()) // override
      .fire('boxzoomend', {boxZoomBounds: bounds});
  },

  /**
   * Override for _onMouseUp.
   *
   * @return padding {Object}
   */
  _override: function () {
    var offsetX, offsetY,
        main = this._container.closest('main'),
        padding = { // default
          padding: [0, 0]
        };

    if (main) { // 'main' map (MapPane)
      offsetX = 0;
      offsetY = document.querySelector('header').offsetHeight;

      if (AppUtil.getParam('sidebar')) {
        offsetX = document.getElementById('sidebar').offsetWidth;
      }

      padding = {
        paddingBottomRight: [offsetX, 0],
        paddingTopLeft: [0, offsetY]
      };
    }

    return padding;
  },
});
