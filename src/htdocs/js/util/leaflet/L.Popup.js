/* global L */
'use strict';


/**
 * This class redefines L.Popup to set its default autoPanPadding options to
 * display just-opened popups next to (i.e. not under) the map controls, Header
 * or SideBar.
 */
L.Popup.include({
  /**
   * Override _adjustPan from L.Popup.
   */
  _adjustPan: function () {
    if (!this.options.autoPan) { return; }
    if (this._map._panAnim) { this._map._panAnim.stop(); }

    // We can endlessly recurse if keepInView is set and the view resets.
    // Let's guard against that by exiting early if we're responding to our own autopan.
    if (this._autopanning) {
      this._autopanning = false;
      return;
    }

    var map = this._map,
        marginBottom = parseInt(L.DomUtil.getStyle(this._container, 'marginBottom'), 10) || 0,
        containerHeight = this._container.offsetHeight + marginBottom,
        containerWidth = this._containerWidth,
        layerPos = new L.Point(this._containerLeft, -containerHeight - this._containerBottom);

    layerPos._add(L.DomUtil.getPosition(this._container));

    var containerPos = map.layerPointToContainerPoint(layerPos),
        padding = L.point(this.options.autoPanPadding),
        paddingTL = L.point(this.options.autoPanPaddingTopLeft || padding),
        paddingBR = L.point(this.options.autoPanPaddingBottomRight || padding),
        size = map.getSize(),
        dx = 0,
        dy = 0;

    // Override
    var override = this._override();
    paddingTL = override.paddingTL;
    paddingBR = override.paddingBR;

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
      // Track that we're autopanning, as this function will be re-ran on moveend
      if (this.options.keepInView) {
        this._autopanning = true;
      }

      map
        .fire('autopanstart')
        .panBy([dx, dy]);
    }
  },

  /**
   * Get the default values for L.Popup's autoPanPadding option.
   *
   * @return {Object}
   */
  _getDefaults: function () {
    var bottom = document.querySelector('.leaflet-bottom.leaflet-left').offsetHeight + 10,
        left = document.querySelector('.leaflet-top.leaflet-left').offsetWidth + 10,
        right = document.querySelector('.leaflet-top.leaflet-right').offsetWidth + 10,
        top = document.querySelector('header').offsetHeight + 10;

    // Default values account for Header, SideBar and map controls
    return {
      paddingBR: L.point(right, bottom),
      paddingTL: L.point(left, top)
    };
  },

  /**
   * Override for _adjustPan.
   *
   * @return {Object}
   */
  _override: function () {
    var defaults = this._getDefaults(),
        options = {
          paddingBR: this.options.autoPanPaddingBottomRight,
          paddingTL: this.options.autoPanPaddingTopLeft
        },
        padding = null;

    if (Object.hasOwn(this.options, 'autoPanPadding')) {
      padding = L.point(this.options.autoPanPadding);
    }

    return {
      paddingBR: L.point(options.paddingBR || padding || defaults.paddingBR),
      paddingTL: L.point(options.paddingTL || padding || defaults.paddingTL)
    };
  },
});
