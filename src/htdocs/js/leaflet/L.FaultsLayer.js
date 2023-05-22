/* global L */
'use strict';


require('leaflet-mouseover-layer');


/**
 * Factory for the Faults overlay.
 *
 * @return layer {L.LayerGroup}
 */
L.FaultsLayer = function () {
  var urlPrefix = 'https://escweb.wr.usgs.gov/faults/tiles/',
      faults = L.mouseOverLayer({
        dataUrl: urlPrefix + 'faults/{z}/{x}/{y}.grid.json?callback={cb}',
        tileOpts: {
          className: 'faults',
          maxZoom: 17,
          minZoom: 6,
        },
        tileUrl: urlPrefix + 'faults/{z}/{x}/{y}.png',
        tiptext: '{NAME}'
      }),
      plates = L.tileLayer(urlPrefix + 'plates/{z}/{x}/{y}.png', {
        className: 'plates',
        maxZoom: 5,
        minZoom: 0,
      }),
      layer = L.layerGroup([
        plates,
        faults
      ]);

  return layer;
};


L.faultsLayer = function () {
  return new L.FaultsLayer();
};
