/* global L */
'use strict';


/**
 * This class extends L.Marker to move an existing <canvas> in the DOM to the
 * Marker when the Marker is turned on in the layers control.
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
  },

  onRemove: function (map) {
    var className = this.options.icon.options.className,
        canvas = document.querySelector('.map canvas.' + className),
        contentEl = document.querySelector('#mapPane .content');

    if (canvas) {
      contentEl.appendChild(canvas); // put <canvas> back
    }

    L.Marker.prototype.onRemove.call(this, map);
  }
});


L.marker.canvas = function (latlng, options) {
  return new L.Marker.Canvas(latlng, options);
};
