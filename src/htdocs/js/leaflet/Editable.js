/* global L */
'use strict';


require('leaflet.path.drag'); // add path dragging to Leaflet.Editable


/**
 * This class extends L.Control to enable drawing custom Rectangle overlays
 * using the Leaflet.Editable plugin.
 *
 * See: https://github.com/Leaflet/Leaflet.Editable
 */
L.Control.Editable = L.Control.extend({
  options: {
    position: 'topleft',
    region: null
  },

  initialize: function (options) {
    L.Util.setOptions(this, options);
  },

  onAdd: function (map) {
    var container,
        instructions,
        link,
        newRegion,
        region;

    container = L.DomUtil.create('div', 'leaflet-control-edit leaflet-bar leaflet-control');
    instructions = document.querySelector('#searchBar .instructions');
    link = L.DomUtil.create('a', '', container);
    region = this.options.region;

    link.href = '#';
    link.innerHTML = '<div class="box"></div>';
    link.title = 'Create a new custom region';

    map.on('editable:drawing:commit', function(e) {
      var classList = e.originalEvent.target.classList;

      // Ignore control button click which also triggers a 'commit' event
      if (!classList.contains('box') && !classList.contains('selected')) {
        instructions.classList.add('hide');
        link.classList.remove('selected');

        region = newRegion;
      }
    });

    L.DomEvent.on(link, 'click', function(e) {
      L.DomEvent.stop(e);

      instructions.classList.toggle('hide');
      link.classList.toggle('selected');

      if (link.classList.contains('selected')) {
        map.removeLayer(region);

        newRegion = map.editTools.startRectangle();
      } else {
        // Recreate cached region Rectangle b/c it loses its dragging ability
        region = L.rectangle(region.getBounds());

        map.editTools.stopDrawing();
        map.removeLayer(newRegion);
        map.addLayer(region);
        region.enableEdit();
      }
    }, this);

    return container;
  }
});

L.control.editable = function (options) {
  return new L.Control.Editable(options);
};
