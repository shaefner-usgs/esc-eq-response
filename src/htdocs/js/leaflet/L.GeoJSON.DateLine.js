/* global L */
'use strict';


require('leaflet-geojson-dateline');


/**
 * This class redefines L.GeoJSON.DateLine to calculate the center of the map
 * correctly when the SideBar is open.
 *
 * @return center {Number}
 *     longitude value of map's center
 */
L.GeoJSON.DateLine.include({
  _getCenter: function () {
    var delta, lng, offsetX,
        center = this._map.getCenter().lng,
        sidebar = document.body.classList.contains('sidebar');

    if (sidebar) {
      offsetX = document.getElementById('sideBar').offsetWidth / 2;
      lng = this._map.containerPointToLatLng([offsetX, 0]).lng;
      delta = lng - this._map.getBounds().getWest();

      center -= delta;
    }

    return center;
  }
});
