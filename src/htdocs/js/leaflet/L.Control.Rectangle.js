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
    this._addButtonTitle = 'Create a new custom region'; // default
    this._removeButtonTitle = 'Remove the custom region'; // default
  },

  /**
   * Override onAdd from L.Control.
   *
   * @param map {Object}
   *
   * @return container {Element}
   */
  onAdd: function (map) {
    var className = 'leaflet-control-region',
        divClasses = [
          className,
          'leaflet-bar',
          'leaflet-control'
        ],
        container = L.DomUtil.create('div', divClasses.join(' '));

    this._addButton = this._createButton({
      className: `${className}-add`,
      container: container,
      fn: this._addRegion,
      html: '<div class="box"></div>',
      title: this._addButtonTitle
    });

    this._removeButton = this._createButton({
      className: `${className}-remove`,
      container: container,
      fn: this._removeRegion,
      html: '<span class="icon-close">×</span>',
      title: this._removeButtonTitle
    });

    map.on('editable:dragend editable:vertex:mousedown', this._setButton, this);
    map.on('editable:drawing:commit', this._onCommit, this);

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
  },

  /**
   * Click handler for the add new custom region button.
   */
  _addRegion: function () {
    var selected,
        map = this._map;

    this._addButton.classList.toggle('selected');
    this._instructions.classList.toggle('hide');
    this._removeButton.classList.remove('selected');

    selected = this._addButton.classList.contains('selected');

    if (selected) {
      this._addButton.title = 'Cancel and restore previous region';
      this._newRegion = map.editTools.startRectangle();

      map.removeLayer(this._region);
      this._removeButton.classList.add('leaflet-disabled');
    } else {
      this._addButton.title = this._addButtonTitle;

      map.editTools.stopDrawing();
      map.removeLayer(this._newRegion);
      this._recreateRegion();
      this._removeButton.classList.remove('leaflet-disabled');
    }
  },

  /**
   * Create a control button and add its listeners.
   *
   * @param opts {Object}
   *
   * @return button {Element}
   */
  _createButton: function (opts) {
    var button = L.DomUtil.create('a', opts.className, opts.container);

    button.href = '#';
    button.innerHTML = opts.html;
    button.title = opts.title;

    // Force screen readers to read this as e.g. "Zoom in - button"
    button.setAttribute('role', 'button');
    button.setAttribute('aria-label', opts.title);

    L.DomEvent.disableClickPropagation(button);
    L.DomEvent.on(button, 'click', L.DomEvent.stop);
    L.DomEvent.on(button, 'click', opts.fn, this);
    L.DomEvent.on(button, 'click', this._refocusOnMap, this);

    return button;
  },

  /**
   * Commit handler for the new custom region button.
   *
   * @param e {Event}
   */
  _onCommit: function (e) {
    var classList = e.originalEvent.target.classList;

    // Ignore clicks on active control which triggers its own 'commit' Event
    if (!classList.contains('box') && !classList.contains('selected')) {
      this._addButton.title = this._addButtonTitle;
      this._region = this._newRegion;

      this._addButton.classList.remove('selected');
      this._instructions.classList.add('hide');
      this.options.app.SearchBar.setButton();
    }

    this._removeButton.classList.remove('leaflet-disabled');
  },

  /**
   * Recreate the region Rectangle (and add it back to the map) b/c it loses its
   * draggability when it is removed from the map.
   */
  _recreateRegion: function () {
    this._region = L.rectangle(this._region.getBounds());

    this._map.addLayer(this._region);
    this._region.enableEdit();
  },

  /**
   * Click handler for the remove custom region button.
   */
  _removeRegion: function () {
    var selected;

    if (this._removeButton.classList.contains('leaflet-disabled')) {
      return;
    }

    this._removeButton.classList.toggle('selected');

    selected = this._removeButton.classList.contains('selected');

    if (selected) {
      this._removeButton.title = 'Restore the custom region';

      this._map.removeLayer(this._region);
    } else {
      this._removeButton.title = this._removeButtonTitle;

      this._recreateRegion();
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
