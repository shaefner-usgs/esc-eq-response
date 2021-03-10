/* global L */
'use strict';


/**
 * This class displays geographic coordinates of the mouse pointer as it moves
 *
 * Copyright 2013 Ardhi Lukianto (https://github.com/ardhi/Leaflet.MousePosition)
 */
L.Control.MousePosition = L.Control.extend({
  options: {
    position: 'bottomleft',
    separator: ', ',
    emptyString: '',
    lngFirst: false,
    numDigits: 3,
    lngFormatter: function(n) {
      return [Math.abs(n).toFixed(3), '&deg;', (n<0?'W':'E')].join('');
    },
    latFormatter: function(n) {
      return [Math.abs(n).toFixed(3), '&deg;', (n<0?'S':'N')].join('');
    },
    prefix: ''
  },

  onAdd: function (map) {
    this._container = L.DomUtil.create('div', 'leaflet-control-mouseposition');
    L.DomEvent.disableClickPropagation(this._container);
    map.on('mousemove', this._onMouseMove, this);
    this._container.innerHTML=this.options.emptyString;

    return this._container;
  },

  onRemove: function (map) {
    map.off('mousemove', this._onMouseMove);
  },

  _onMouseMove: function (e) {
    var lng = L.Util.formatNum(e.latlng.lng, this.options.numDigits);
    // need to correct for rollover of map if user scrolls
    if (lng >= 0) {
      lng = ((lng + 180)%360) - 180;
    } else {
      lng = (((lng + 180) + (Math.ceil(Math.abs(lng + 180)/360)*360))%360) - 180;
    }
    if (this.options.lngFormatter) {
      lng = this.options.lngFormatter(lng);
    }
    var lat = L.Util.formatNum(e.latlng.lat, this.options.numDigits);
    if (this.options.latFormatter) {
      lat = this.options.latFormatter(lat);
    }
    var value = this.options.lngFirst ? lng + this.options.separator + lat : lat + this.options.separator + lng;
    var prefixAndValue = this.options.prefix + ' ' + value;

    this._container.innerHTML = prefixAndValue;
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
