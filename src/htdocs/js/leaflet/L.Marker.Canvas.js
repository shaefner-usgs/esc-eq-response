/* global L */
'use strict';


/**
 * This class extends L.Marker to move an existing <canvas> in the DOM to the
 * Marker when the Marker is turned on in the layers control. It also updates
 * the marker's position when the map wraps around the dateline.
 *
 * Note: it is necessary to move the <canvas> in the DOM b/c Leaflet dynamically
 * creates/destroys markers when they are turned on/off in the layers control.
 */
L.Marker.Canvas = L.Marker.extend({
  /**
   * Override onAdd from L.Marker.
   *
   * @param map {Object}
   */
  onAdd: function (map) {
    var marker,
        className = this.id,
        canvas = document.querySelector(`#mapPane span.${className}`);

    L.Marker.prototype.onAdd.call(this, map);

    if (canvas) {
      marker = document.querySelector('.map .' + className);

      marker.appendChild(canvas); // move <canvas> container to Marker
    }

    map.on('moveend viewreset', this._update, this);
    this._update();
  },

  /**
   * Override onRemove from L.Marker.
   *
   * @param map {Object}
   */
  onRemove: function (map) {
    var className = this.options.icon.options.className,
        canvas = document.querySelector(`#mapPane span.${className}`),
        container = document.querySelector('#mapPane .container');

    if (canvas) {
      container.appendChild(canvas); // put <canvas> container back
    }

    L.Marker.prototype.onRemove.call(this, map);

    map.off('moveend viewreset', this._update, this);
  },

  /**
   * Update the marker's position to render it in the visible map area,
   * accounting for copies of "wrapping" maps across the IDL.
   */
  _update: function () {
    var status,
        center = this._map.getVisibleCenter(),
        latLng = this.getLatLng(),
        lng = {
          max: center.lng + 180,
          min: center.lng - 180
        };

    while (latLng.lng <= lng.min) {
      latLng.lng += 360;
      status = 'updated';
    }
    while (latLng.lng > lng.max) {
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
