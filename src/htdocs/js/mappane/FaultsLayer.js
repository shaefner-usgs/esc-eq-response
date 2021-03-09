/* global L */
'use strict';


require('mappane/MouseOverLayer');


/**
 * Factory for Faults overlay
 *
 * @return {L.LayerGroup}
 */
L.FaultsLayer = function () {
  var _faults,
      _layer,
      _plates,
      _urlPrefix;

  _urlPrefix = 'https://bayquakealliance.org/faults/tiles/';

  // L.mouseOverLayer is an extended L.layerGroup class that adds utfGrid mouseovers
  _faults = L.mouseOverLayer({
    dataUrl: _urlPrefix + 'faults/{z}/{x}/{y}.grid.json?callback={cb}',
    tileOpts: {
      minZoom: 6,
      maxZoom: 17,
      pane: 'faults' // put map tiles in custom Leaflet map pane
    },
    tileUrl: _urlPrefix + 'faults/{z}/{x}/{y}.png',
    tiptext: '{NAME}'
  });

  _plates = L.tileLayer(_urlPrefix + 'plates/{z}/{x}/{y}.png', {
    minZoom: 0,
    maxZoom: 5
  });

  _layer = L.layerGroup([_plates, _faults]);

  // Set id value used by CSS for stacking order of overlays on Leaflet map
  _layer.id = 'faults';

  return _layer;
};


L.faultsLayer = function () {
  return new L.FaultsLayer();
};

module.exports = L.FaultsLayer;
