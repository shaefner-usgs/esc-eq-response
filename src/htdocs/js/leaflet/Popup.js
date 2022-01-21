/* global L */
'use strict';


/**
 * This class redefines L.Popup to set its default autoPanPadding options to
 * display popups next to (i.e. not under) the map controls, Header or SideBar.
 */
L.Popup.include({
  _adjustPan: function (e) {
    if (!this.options.autoPan) { return; }
    if (this._map._panAnim) { this._map._panAnim.stop(); }

    var map = this._map,
        marginBottom = parseInt(L.DomUtil.getStyle(this._container, 'marginBottom'), 10) || 0,
        containerHeight = this._container.offsetHeight + marginBottom,
        containerWidth = this._containerWidth,
        layerPos = new L.Point(this._containerLeft, -containerHeight - this._containerBottom),
        autoPanPadding = null;

    layerPos._add(L.DomUtil.getPosition(this._container));

    if (Object.prototype.hasOwnProperty.call(this.options, 'autoPanPadding')) {
      autoPanPadding = this._toPoint(this.options.autoPanPadding);
    }

    var containerPos = map.layerPointToContainerPoint(layerPos),
        defaults = this._getDefaults(),
        paddingTL = this._toPoint(this.options.autoPanPaddingTopLeft || autoPanPadding || defaults.topLeft),
        paddingBR = this._toPoint(this.options.autoPanPaddingBottomRight || autoPanPadding || defaults.bottomRight),
        size = map.getSize(),
        dx = 0,
        dy = 0;

    if (containerPos.x + containerWidth + paddingBR.x > size.x) { // right
      dx = containerPos.x + containerWidth - size.x + paddingBR.x;
    }
    if (containerPos.x - dx - paddingTL.x < 0) { // left
      dx = containerPos.x - paddingTL.x;
    }
    if (containerPos.y + containerHeight + paddingBR.y > size.y) { // bottom
      dy = containerPos.y + containerHeight - size.y + paddingBR.y;
    }
    if (containerPos.y - dy - paddingTL.y < 0) { // top
      dy = containerPos.y - paddingTL.y;
    }

    // @namespace Map
    // @section Popup events
    // @event autopanstart: Event
    // Fired when the map starts autopanning when opening a popup.
    if (dx || dy) {
      map
        .fire('autopanstart')
        .panBy([dx, dy], {animate: e && e.type === 'moveend'});
    }
  }
});

/**
 * Add supporting methods to L.Popup.
 */
L.Popup.addInitHook(function() {
  /**
   * Get the default pan padding for a popup, which is based on the size/status
   * of the UI controls (map controls, sidebar open/closed, etc).
   *
   * @return {Object}
   */
  this._getDefaults = function () {
    var bottom = document.querySelector('.leaflet-bottom.leaflet-left').offsetHeight + 10,
        left = document.querySelector('.leaflet-top.leaflet-left').offsetWidth + 10,
        right = document.querySelector('.leaflet-top.leaflet-right').offsetWidth + 10,
        top = document.querySelector('header').offsetHeight + 10;

    return {
      topLeft: new L.Point(left, top),
      bottomRight: new L.Point(right, bottom),
    };
  };

  /**
   * Leaflet's private toPoint method.
   *
   * @return L.Point {Object}
   */
  this._toPoint = function (x, y, round) {
    if (x instanceof L.Point) {
      return x;
    }
    if (L.Util.isArray(x)) {
      return new L.Point(x[0], x[1]);
    }
    if (x === undefined || x === null) {
      return x;
    }
    if (typeof x === 'object' && 'x' in x && 'y' in x) {
      return new L.Point(x.x, x.y);
    }

    return new L.Point(x, y, round);
  };
});