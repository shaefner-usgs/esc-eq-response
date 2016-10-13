/* global L */
'use strict';


require('mappane/MouseOverLayer');


/**
 * Factory for Faults overlay
 *
 * @return {L.LayerGroup}
 */
var FaultsLayer = function () {
  var _faults,
      _plates,
      _urlPrefix;

  _urlPrefix = 'http://escweb.wr.usgs.gov/template/functions/tiles/';

  // L.mouseOverLayer is an extended L.layerGroup class that adds utfGrid mouseovers
  _faults = L.mouseOverLayer({
    dataUrl: _urlPrefix + 'faults/{z}/{x}/{y}.grid.json?callback={cb}',
    tileOpts: {
      minZoom: 6,
      maxZoom: 17
    },
    tileUrl: _urlPrefix + 'faults/{z}/{x}/{y}.png',
    tiptext: '{NAME}'
  });

  _plates = L.tileLayer(_urlPrefix + 'plates/{z}/{x}/{y}.png', {
    minZoom: 0,
    maxZoom: 5
  });

  return L.layerGroup([_plates, _faults]);
};


L.faultsLayer = FaultsLayer;

module.exports = FaultsLayer;
