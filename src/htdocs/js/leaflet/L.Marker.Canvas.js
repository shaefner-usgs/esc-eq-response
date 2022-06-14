/* global L */
'use strict';


/**
 * This class extends L.Marker to move an existing <canvas> in the DOM to the
 * Marker when the Marker is turned on in the layers control (it also updates
 * the marker's position to always render in the currently visible map).
 *
 * This is necessary b/c Leaflet dynamically creates/destroys markers when they
 * are turned on/off in the layers control.
 */
L.Marker.Canvas = L.Marker.extend({
  onAdd: function (map) {
    var marker,
        className = this.id,
        canvas = document.querySelector('#mapPane canvas.' + className);

    L.Marker.prototype.onAdd.call(this, map);

    if (canvas) {
      marker = document.querySelector('.map .' + className);

      marker.appendChild(canvas); // move <canvas> to Marker
    }

    map.on('moveend viewreset', this._update, this);

    this._update();
  },

  onRemove: function (map) {
    var className = this.options.icon.options.className,
        canvas = document.querySelector('.map canvas.' + className),
        contentEl = document.querySelector('#mapPane .content');

    if (canvas) {
      contentEl.appendChild(canvas); // put <canvas> back
    }

    L.Marker.prototype.onRemove.call(this, map);

    map.off('moveend viewreset', this._update, this);
  },

  /**
   * Get the map's center, while accounting for the SideBar's current state.
   *
   * @return center {Number}
   *     longitude value of map's center
   */
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
  },

  /**
   * Update the marker's position to be rendered in the visible map area,
   * accounting for copies of "wrapping" maps.
   */
  _update: function () {
    var status,
        center = this._getCenter(),
        latLng = this.getLatLng(),
        options = {
          max: center + 180,
          min: center - 180
        };

    while (latLng.lng <= options.min) {
      latLng.lng += 360;
      status = 'updated';
    }
    while (latLng.lng > options.max) {
      latLng.lng -= 360;
      status = 'updated';
    }

    if (status === 'updated') {
      this.setLatLng(latLng);
    }
  }
});


L.marker.canvas = function (latlng, options) {
  return new L.Marker.Canvas(latlng, options);
};
