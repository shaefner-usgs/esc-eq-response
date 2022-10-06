/* global L */
'use strict';


var AppUtil = require('util/AppUtil');


/**
 * This class redefines L.Map to enable getting the visible map area's center,
 * accounting for the header and status of the SideBar (i.e. open or closed).
 */
L.Map.include({
  /**
   * Get the geographical center of the visible area of the map view.
   *
   * @return center {L.LatLng}
   */
  getVisibleCenter: function () {
    var center = this.getCenter(), // default - ancillary map (SideBar)
        main = this._container.closest('main'),
        offsetX = document.getElementById('sideBar').offsetWidth / 2,
        offsetY = document.querySelector('header').offsetHeight / 2,
        point = this.getSize().divideBy(2).add([0, offsetY]);

    if (main) { // 'main' map (MapPane)
      if (AppUtil.getParam('sidebar')) {
        point = point.subtract([offsetX, 0]);
      }

      center = this.containerPointToLatLng(point);
    }

    return center;
  }
});
