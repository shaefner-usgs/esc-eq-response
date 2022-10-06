/* global L */
'use strict';


/**
 * This class extends L.Control to enable drawing custom Rectangle overlays
 * using the Leaflet.Editable plugin.
 *
 * See: https://github.com/Leaflet/Leaflet.Editable
 *
 * @param options {Object}
 */
L.Control.Rectangle = L.Control.extend({
  options: { // defaults
    app: {},
    position: 'topleft',
    region: null
  },

  initialize: function (options) {
    L.setOptions(this, options);

    this._instructions = document.querySelector('#searchBar .instructions');
    this._region = options.region;
    this._title = 'Create a new custom region'; // default
  },

  /**
   * Override onAdd from L.Control.
   *
   * @param map {Object}
   *
   * @return container {Element}
   */
  onAdd: function (map) {
    var divClasses = [
          'leaflet-bar',
          'leaflet-control',
          'leaflet-control-edit'
        ],
        container = L.DomUtil.create('div', divClasses.join(' '));

    this._button = L.DomUtil.create('a', '', container);
    this._button.href = '#';
    this._button.innerHTML = '<div class="box"></div>';
    this._button.title = this._title;

    map.on('editable:dragend editable:vertex:mousedown', this._setButton, this);
    map.on('editable:drawing:commit', this._onCommit, this);

    L.DomEvent.on(this._button, 'click', this._onClick, this);

    return container;
  },

  /**
   * Override onRemove from L.Control.
   *
   * @param map {Object}
   */
  onRemove: function (map) {
    map.off('editable:dragend editable:vertex:mousedown', this._setButton, this);
    map.off('editable:drawing:commit', this._onCommit, this);

    L.DomEvent.off(this._button, 'click', this._onClick, this);
  },

  /**
   * Click handler for the new custom region button.
   *
   * @param e {Event}
   */
  _onClick: function (e) {
    var selected;

    e.preventDefault(); // prevent Leaflet from changing location.hash to '#'

    this._button.classList.toggle('selected');
    this._instructions.classList.toggle('hide');

    selected = this._button.classList.contains('selected');

    if (selected) {
      this._button.title = 'Cancel and restore previous region';
      this._newRegion = this._map.editTools.startRectangle();

      this._map.removeLayer(this._region);
    } else {
      this._button.title = this._title;

      // Recreate cached region Rectangle b/c it loses its dragging ability
      this._region = L.rectangle(this._region.getBounds());

      this._map.editTools.stopDrawing();
      this._map.removeLayer(this._newRegion);
      this._map.addLayer(this._region);
      this._region.enableEdit();
    }
  },

  /**
   * Commit handler for the new custom region button.
   *
   * @param e {Event}
   */
  _onCommit: function (e) {
    var classList = e.originalEvent.target.classList;

    // Ignore clicks on active control which triggers its own 'commit' event
    if (!classList.contains('box') && !classList.contains('selected')) {
      this._button.title = this._title;
      this._region = this._newRegion;

      this._button.classList.remove('selected');
      this._instructions.classList.add('hide');
      this.options.app.SearchBar.setButton();
    }
  },

  /**
   * Set the Search button text to either 'Search' or 'Refresh' depending on the
   * status.
   */
  _setButton: function () {
    // Add a slight delay so Leaflet.Editable can update the bounds first
    setTimeout(this.options.app.SearchBar.setButton, 500);
  }
});


L.control.rectangle = function (options) {
  return new L.Control.Rectangle(options);
};
