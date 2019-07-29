/* global L */
'use strict';


// Extend Map._initControlPos to create a bottom-center container
L.Map.prototype._initControlPos = (function (_initControlPos) {
  return function () {
    _initControlPos.apply(this, arguments); // original method

    // Add new control-container
    this._controlCorners.bottomcenter = L.DomUtil.create(
      'div',
      'leaflet-bottom leaflet-center',
      this._controlContainer
    );
  };
}(L.Map.prototype._initControlPos));
