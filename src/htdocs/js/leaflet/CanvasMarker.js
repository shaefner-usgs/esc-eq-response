/* global L */
'use strict';


/**
 * This class extends L.Marker to move an existing <canvas> in the DOM to the
 * Marker when the Marker is turned on in the layers control.
 *
 * This is necessary b/c Leaflet dynamically creates/destroys markers when they
 * are turned on/off in the layers control.
 *
 * @return {L.marker}
 */
L.CanvasMarker = L.Marker.extend({
  initialize: function (latlng, options) {
    L.Util.setOptions(this, options);
    L.Marker.prototype.initialize.call(this, latlng, this.options);
  },

  onAdd: function(map) {
    var canvas,
        className,
        marker;

    className = this.id;
    canvas = document.querySelector('#mapPane > canvas.' + className);

    L.Marker.prototype.onAdd.call(this, map);

    if (canvas) {
      marker = document.querySelector('.map .' + className);

      marker.appendChild(canvas); // move <canvas> to Marker
    }
  },

  onRemove: function(map) {
    var canvas,
        className,
        mapPane;

    className = this.options.icon.options.className;
    canvas = document.querySelector('.map canvas.' + className);
    mapPane = document.getElementById('mapPane');

    if (canvas) {
      mapPane.appendChild(canvas); // put <canvas> back
    }

    L.Marker.prototype.onRemove.call(this, map);
  }
});

L.canvasMarker = function(latlng, options) {
  return new L.CanvasMarker(latlng, options);
};


module.exports = L.CanvasMarker;
