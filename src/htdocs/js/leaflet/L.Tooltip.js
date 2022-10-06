/* global L */
'use strict';


var AppUtil = require('util/AppUtil');


/**
 * This class redefines L.Tooltip to set the position of the Tooltip to the left
 * or right side of the mouse cursor, depending on the mouse's position on
 * screen and whether or not the SideBar is currently open.
 */
L.Tooltip.include({
  /**
   * Override _setPosition from L.Tooltip.
   */
  _setPosition: function (pos) {
    var subX, subY,
        anchor = this._getAnchor(),
        map = this._map,
        centerPoint = map.latLngToContainerPoint(map.getCenter()),
        container = this._container,
        direction = this.options.direction,
        offset = L.point(this.options.offset),
        offsetX = document.getElementById('sideBar').offsetWidth / 2,
        sidebar = AppUtil.getParam('sidebar'),
        tooltipHeight = container.offsetHeight,
        tooltipPoint = map.layerPointToContainerPoint(pos),
        tooltipWidth = container.offsetWidth;

    if (sidebar) {
      centerPoint.x -= offsetX;
    }

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
