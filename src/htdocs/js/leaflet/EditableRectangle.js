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
    var button,
        container,
        defaultTitle,
        divClasses,
        instructions,
        newRegion,
        region;

    defaultTitle = 'Create a new custom region';
    divClasses = [
      'leaflet-bar',
      'leaflet-control',
      'leaflet-control-edit'
    ];
    container = L.DomUtil.create('div', divClasses.join(' '));
    button = L.DomUtil.create('a', '', container);
    instructions = document.querySelector('#searchBar .instructions');
    region = this.options.region;

    button.href = '#';
    button.innerHTML = '<div class="box"></div>';
    button.title = defaultTitle;

    map.on('editable:drawing:commit', e => {
      var classList = e.originalEvent.target.classList;

      // Ignore clicks on active control which also triggers a 'commit' event
      if (!classList.contains('box') && !classList.contains('selected')) {
        instructions.classList.add('hide');
        button.classList.remove('selected');

        region = newRegion;
        button.title = defaultTitle;
      }
    });

    L.DomEvent.on(button, 'click', e => {
      L.DomEvent.stop(e);

      instructions.classList.toggle('hide');
      button.classList.toggle('selected');

      if (button.classList.contains('selected')) {
        newRegion = map.editTools.startRectangle();
        button.title = 'Cancel and restore previous region';

        map.removeLayer(region);
      } else {
        // Recreate cached region Rectangle b/c it loses its dragging ability
        region = L.rectangle(region.getBounds());
        button.title = defaultTitle;

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
