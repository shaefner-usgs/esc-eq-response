/* global L */
'use strict';


/**
 * This class redefines L.Tooltip to set the position of the Tooltip to the left
 * or right side of the mouse cursor, depending on the mouse's position on
 * screen and whether or not the SideBar is currently open.
 */
L.Tooltip.include({
  /**
   * Override for _setPosition.
   *
   * @return L.Point {Object}
   */
  _override: function () {
    var map = this._map;

    return map.latLngToContainerPoint(map.getVisibleCenter());
  },

  /**
   * Override _setPosition from L.Tooltip.
   *
   * @param pos L.Point {Object}
   */
  _setPosition: function (pos) {
    var subX, subY,
        map = this._map,
        container = this._container,
        centerPoint = map.latLngToContainerPoint(map.getCenter()),
        tooltipPoint = map.layerPointToContainerPoint(pos),
        direction = this.options.direction,
        tooltipWidth = container.offsetWidth,
        tooltipHeight = container.offsetHeight,
        offset = L.point(this.options.offset),
        anchor = this._getAnchor();

    centerPoint = this._override(); // override

    if (direction === 'top') {
      subX = tooltipWidth / 2;
      subY = tooltipHeight;
    } else if (direction === 'bottom') {
      subX = tooltipWidth / 2;
      subY = 0;
    } else if (direction === 'center') {
      subX = tooltipWidth / 2;
      subY = tooltipHeight / 2;
    } else if (direction === 'right') {
      subX = 0;
      subY = tooltipHeight / 2;
    } else if (direction === 'left') {
      subX = tooltipWidth;
      subY = tooltipHeight / 2;
    } else if (tooltipPoint.x < centerPoint.x) {
      direction = 'right';
      subX = 0;
      subY = tooltipHeight / 2;
    } else {
      direction = 'left';
      subX = tooltipWidth + (offset.x + anchor.x) * 2;
      subY = tooltipHeight / 2;
    }

    pos = pos.subtract(L.point(subX, subY, true)).add(offset).add(anchor);

    L.DomUtil.removeClass(container, 'leaflet-tooltip-right');
    L.DomUtil.removeClass(container, 'leaflet-tooltip-left');
    L.DomUtil.removeClass(container, 'leaflet-tooltip-top');
    L.DomUtil.removeClass(container, 'leaflet-tooltip-bottom');
    L.DomUtil.addClass(container, 'leaflet-tooltip-' + direction);
    L.DomUtil.setPosition(container, pos);
  },
});
