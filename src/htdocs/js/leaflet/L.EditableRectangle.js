/* global L */
'use strict';


require('leaflet.path.drag'); // add path dragging to Leaflet.Editable


/**
 * This class extends L.Control to enable drawing custom Rectangle overlays
 * using the Leaflet.Editable plugin.
 *
 * See: https://github.com/Leaflet/Leaflet.Editable
 */
L.Control.EditableRectangle = L.Control.extend({
  options: {
    app: {},
    position: 'topleft',
    region: null
  },

  initialize: function (options) {
    L.Util.setOptions(this, options);

    this._defaultTitle = 'Create a new custom region';
    this._instructions = document.querySelector('#searchBar .instructions');
    this._region = options.region;
  },

  onAdd: function (map) {
    var container,
        divClasses;

    divClasses = [
      'leaflet-bar',
      'leaflet-control',
      'leaflet-control-edit'
    ];
    container = L.DomUtil.create('div', divClasses.join(' '));

    this._button = L.DomUtil.create('a', '', container);
    this._button.href = '#';
    this._button.innerHTML = '<div class="box"></div>';
    this._button.title = this._defaultTitle;

    map.on('editable:dragend editable:vertex:mousedown', () => {
      // Set a slight delay so Leaflet.Editable can update the bounds first
      setTimeout(this.options.app.SearchBar.setStatus, 500);
    });
    map.on('editable:drawing:commit', this._onCommit, this);

    L.DomEvent.on(this._button, 'click', this._onClick, this);

    return container;
  },

  _onClick: function () {
    var selected;

    this._button.classList.toggle('selected');
    this._instructions.classList.toggle('hide');

    selected = this._button.classList.contains('selected');

    if (selected) {
      this._button.title = 'Cancel and restore previous region';
      this._newRegion = this._map.editTools.startRectangle();

      this._map.removeLayer(this._region);
    } else {
      this._button.title = this._defaultTitle;

      // Recreate cached region Rectangle b/c it loses its dragging ability
      this._region = L.rectangle(this._region.getBounds());

      this._map.editTools.stopDrawing();
      this._map.removeLayer(this._newRegion);
      this._map.addLayer(this._region);
      this._region.enableEdit();
    }
  },

  _onCommit: function (e) {
    var classList = e.originalEvent.target.classList;

    // Ignore clicks on active control which also triggers a 'commit' event
    if (!classList.contains('box') && !classList.contains('selected')) {
      this._button.title = this._defaultTitle;
      this._region = this._newRegion;

      this._button.classList.remove('selected');
      this._instructions.classList.add('hide');
      this.options.app.SearchBar.setStatus();
    }
  }
});


L.control.editableRectangle = function (options) {
  return new L.Control.EditableRectangle(options);
};
