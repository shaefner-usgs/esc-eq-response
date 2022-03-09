/* global L */
'use strict';


require('leaflet/MouseOverLayer');


/**
 * Factory for Faults overlay.
 *
 * @return layer {L.layerGroup}
 */
L.FaultsLayer = function () {
  var faults,
      layer,
      plates,
      urlPrefix;

  urlPrefix = 'https://bayquakealliance.org/faults/tiles/';
  faults = L.mouseOverLayer({
    dataUrl: urlPrefix + 'faults/{z}/{x}/{y}.grid.json?callback={cb}',
    tileOpts: {
      maxZoom: 17,
      minZoom: 6,
      pane: 'faults' // put map tiles in custom Leaflet map pane
    },
    tileUrl: urlPrefix + 'faults/{z}/{x}/{y}.png',
    tiptext: '{NAME}'
  });
  plates = L.tileLayer(urlPrefix + 'plates/{z}/{x}/{y}.png', {
    minZoom: 0,
    maxZoom: 5
  });
  layer = L.layerGroup([
    plates,
    faults
  ]);

  // Set id value used by CSS for stacking order of overlays on Leaflet map
  layer.id = 'faults';

  return layer;
};


L.faultsLayer = function () {
  return new L.FaultsLayer();
};
