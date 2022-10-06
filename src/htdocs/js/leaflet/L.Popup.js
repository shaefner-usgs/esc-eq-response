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
   *
   * @param e {Event}
   */
  _adjustPan: function (e) {
    if (!this.options.autoPan || this._rendered) { return; }
    if (this._map._panAnim) { this._map._panAnim.stop(); }

    var autoPanPadding = null,
        marginBottom = parseInt(L.DomUtil.getStyle(this._container, 'marginBottom'), 10) || 0,
        containerHeight = this._container.offsetHeight + marginBottom,
        containerWidth = this._containerWidth,
        layerPos = new L.Point(this._containerLeft, -containerHeight - this._containerBottom),
        map = this._map;

    layerPos._add(L.DomUtil.getPosition(this._container));

    if (Object.prototype.hasOwnProperty.call(this.options, 'autoPanPadding')) {
      autoPanPadding = L.point(this.options.autoPanPadding);
    }

    var containerPos = map.layerPointToContainerPoint(layerPos),
        defaults = this._getDefaults(),
        dx = 0,
        dy = 0,
        paddingTL = L.point(this.options.autoPanPaddingTopLeft ||
          autoPanPadding || defaults.topLeft),
        paddingBR = L.point(this.options.autoPanPaddingBottomRight ||
          autoPanPadding || defaults.bottomRight),
        size = map.getSize();

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

    // Flag that popup is already rendered to avoid autoPanning while it's open
    this._rendered = true;
    this._map.on('popupclose', this._setRendered, this);
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
      topLeft: new L.Point(left, top),
      bottomRight: new L.Point(right, bottom),
    };
  },

  /**
   * Event handler that resets _rendered to false.
   */
  _setRendered: function () {
    this._rendered = false;
    this._map.off('popupclose', this._setRendered, this);
  }
});
