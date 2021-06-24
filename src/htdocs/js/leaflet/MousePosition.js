/* global L */
'use strict';


/**
 * This class displays geographic coordinates of the mouse pointer as it moves.
 *
 * Copyright 2013 Ardhi Lukianto (https://github.com/ardhi/Leaflet.MousePosition)
 */
L.Control.MousePosition = L.Control.extend({
  options: {
    emptyString: '',
    latFormatter: function(n) {
      return [Math.abs(n).toFixed(3), '&deg;', (n<0?'S':'N')].join('');
    },
    lngFirst: false,
    lngFormatter: function(n) {
      return [Math.abs(n).toFixed(3), '&deg;', (n<0?'W':'E')].join('');
    },
    numDigits: 3,
    position: 'bottomleft',
    prefix: '',
    separator: ', '
  },

  onAdd: function (map) {
    this._container = L.DomUtil.create('div', 'leaflet-control-mouseposition');
    this._container.innerHTML = this.options.emptyString;

    L.DomEvent.disableClickPropagation(this._container);

    map.on('mousemove', this._onMouseMove, this);

    return this._container;
  },

  onRemove: function (map) {
    map.off('mousemove', this._onMouseMove);
  },

  _onMouseMove: function (e) {
    var lat,
        lng,
        value;

    lat = this.options.latFormatter(e.latlng.lat);
    lng = this.options.lngFormatter(e.latlng.lng);

    if (this.options.lngFirst) {
      value = lng + this.options.separator + lat;
    } else {
      value = lat + this.options.separator + lng;
    }

    this._container.innerHTML = this.options.prefix + ' ' + value;
  }
});

L.Map.mergeOptions({
  positionControl: false
});

L.Map.addInitHook(function () {
  if (this.options.positionControl) {
    this.positionControl = new L.Control.MousePosition();
    this.addControl(this.positionControl);
  }
});

L.control.mousePosition = function (options) {
  return new L.Control.MousePosition(options);
};


module.exports = L.Control.MousePosition;
