/* global L */
'use strict';


L.CanvasMarker = L.Marker.extend({
  initialize: function (latlng, options) {
    L.Util.setOptions(this, options);
    L.Marker.prototype.initialize.call(this, latlng, this.options);
  },

  onAdd: function(map) {
    var canvas,
        className,
        markerDiv;

    // Call L.Marker's onAdd method first
    L.Marker.prototype.onAdd.call(this, map);

    // Move canvas element from below map to marker
    //   Added to DOM when it's created, but marker doesn't exist yet.
    className = this.options.icon.options.className;
    canvas = document.querySelector('#mapPane canvas.' + className);
    markerDiv = document.querySelector('.leaflet-marker-icon.' + className + ' div');

    markerDiv.appendChild(canvas);
  },

  onRemove: function(map) {
    var canvas,
        className;

    className = this.options.icon.options.className;
    canvas = document.querySelector('.leaflet-marker-icon.' + className + ' canvas');

    // Move canvas element back to below map
    document.querySelector('#mapPane').appendChild(canvas);

    // Call L.Marker's onRemove method last
    L.Marker.prototype.onRemove.call(this, map);
  }
});

L.canvasMarker = function(latlng, options) {
  return new L.CanvasMarker(latlng, options);
};

module.exports = L.CanvasMarker;
