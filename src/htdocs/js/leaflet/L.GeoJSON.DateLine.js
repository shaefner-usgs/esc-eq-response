/* global L */
'use strict';


require('leaflet-geojson-dateline');


/**
 * This class redefines L.GeoJSON.DateLine to shift the longitude value of the
 * map's center point when the SideBar is open.
 */
L.GeoJSON.DateLine.include({
  /**
   * Override _getCenter from L.GeoJSON.DateLine.
   *
   * @return {Number}
   *     longitude value
   */
  _getCenter: function () {
    return this._map.getVisibleCenter().lng;
  }
});
