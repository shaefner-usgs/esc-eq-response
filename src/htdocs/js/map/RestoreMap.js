/* global L */
'use strict';


/**
 * Leaflet.RestoreMap plugin
 *   (based on https://github.com/makinacorpus/Leaflet.RestoreView)
 *
 * Added functionality:
 * - remembers selected layers, including grouped layers
 *     (compatible with https://github.com/ismyrnow/Leaflet.groupedlayercontrol)
 * - remembers fullscreen mode
 *     (compatible with https://github.com/Leaflet/Leaflet.fullscreen)
 * - option to share layer settings across site
 *
 * Usage: map.RestoreMap(options)
 *
 * @param options {Object}
 *        optional settings
 *        {
 *          baseLayers: {Object <Layer Config>},
 *              req'd for restoring basemap setting
 *          id: {String},
 *              save each page's settings separately
 *          layerStorageType {String <local | session>}
 *          overlays: {Object <Layer Config>},
 *              req'd for restoring overlay settings
 *          scope: {String <AppName>}
 *              group / isolate settings (e.g. by app)
 *          shareLayers: {Boolean}
 *              share layer settings amongst all pages
 *          viewStorageType {String <local | session>}
 *        }
 *
 * <Layer Config> : http://leafletjs.com/reference.html#control-layers-config
 */
var RestoreMapMixin = {
  restoreMap: function (options) {
    var defaultId,
        layers,
        layersId,
        layerStorage,
        map,
        scope,
        storage,
        view,
        viewId,
        viewStorage,

        // methods
        _baselayerchange,
        _createSettingsObjects,
        _fullscreenchange,
        _getIndex,
        _getOverlay,
        _initialize,
        _initSaveSettings,
        _isEmpty,
        _moveend,
        _overlayadd,
        _overlayremove,
        _restoreSettings,
        _updateLayerList;

    map = this;


    _initialize = function () {
      options = L.extend({
        baseLayers: null,
        id: null,
        layerStorageType: 'local',
        overlays: null,
        scope: '_global_',
        shareLayers: false,
        viewStorageType: 'session'
      }, options);

      scope = options.scope;

      // setup local/sessionStorage for layers and views
      storage = {
        local: window.localStorage || {},
        session: window.sessionStorage || {}
      };
      layerStorage = storage[options.layerStorageType];
      viewStorage = storage[options.viewStorageType];

      layers = JSON.parse(layerStorage.mapLayers || '{}');
      view = JSON.parse(viewStorage.mapView || '{}');

      // default key used to store settings
      defaultId = '_shared_';

      // Use defaultId if unique id not supplied
      if (!options.id) {
        options.id = defaultId;
      }

      // If shareLayers is 'on', then always use defaultId to store layer settings
      layersId = options.id;
      if (options.shareLayers) {
        layersId = defaultId;
      }
      viewId = options.id;

      _createSettingsObjects();
      _initSaveSettings();
      _restoreSettings();
    };


    // Handler for when base layer changes
    _baselayerchange = function (e) {
      layers[scope][layersId].base = e.name;

      layerStorage.mapLayers = JSON.stringify(layers);
    };

    // Create obj templates for storing layers and views
    _createSettingsObjects = function () {
      if (!layers[scope]) {
        layers[scope] = {};
      }
      if (!layers[scope][layersId]) {
        layers[scope][layersId] = {
          add: [],
          remove: []
        };
      }
      if (!view[scope]) {
        view[scope] = {};
      }
      if (!view[scope][viewId]) {
        view[scope][viewId] = {};
      }
    };

    // Handler for when fullscreen mode changes
    _fullscreenchange = function () {
      if (map.isFullscreen()) {
        view[scope][viewId].fs = true;
      } else {
        view[scope][viewId].fs = false;
      }

      viewStorage.mapView = JSON.stringify(view);
    };

    // Get array index of layer containing layerName, or return -1
    _getIndex = function (layers, layerName) {
      var r = -1;

      layers.forEach(function(layer, i) {
        if (layer.name === layerName) {
          r = i;
        }
      });

      return r;
    };

    // Get Leaflet overlay
    _getOverlay = function (layer) {
      var overlay;

      if (layer.group) {
        if (options.overlays.hasOwnProperty(layer.group)) {
          overlay = options.overlays[layer.group][layer.name];
        }
      } else {
        overlay = options.overlays[layer.name];
      }

      return overlay;
    };

    // Setup listeners to store settings in local/sessionStorage
    _initSaveSettings = function () {
      if (!map.__initRestore) {
        // map view (extent, size)
        map.on('fullscreenchange', _fullscreenchange, map);
        map.on('moveend', _moveend, map);

        // map layers
        map.on('baselayerchange', _baselayerchange, map);
        map.on('overlayadd', _overlayadd, map);
        map.on('overlayremove', _overlayremove, map);

        map.__initRestore = true;
      }
    };

    // Check if javascript obj contains props
    _isEmpty = function (obj) {
      return (Object.getOwnPropertyNames(obj).length === 0);
    };

    // Handler for when map extent change
    _moveend = function () {
      if (!map._loaded) {
        return; // don't access map bounds if view is not set
      }
      view[scope][viewId].lat = map.getCenter().lat;
      view[scope][viewId].lng = map.getCenter().lng;
      view[scope][viewId].zoom = map.getZoom();

      viewStorage.mapView = JSON.stringify(view);
    };

    // Handler for when overlays are added
    _overlayadd = function (e) {
      _updateLayerList(e, 'add');

      layerStorage.mapLayers = JSON.stringify(layers);
    };

    // Handler for when overlays are removed
    _overlayremove = function (e) {
      _updateLayerList(e, 'remove');

      layerStorage.mapLayers = JSON.stringify(layers);
    };

    // Restore settings: map extent, full screen mode and chosen layers
    _restoreSettings = function () {
      try {
        // Restore view
        if (!_isEmpty(view[scope][viewId])) {
          map.setView(
            L.latLng(view[scope][viewId].lat, view[scope][viewId].lng),
            view[scope][viewId].zoom,
            true
          );
          if (view[scope][viewId].fs) {
            map.toggleFullscreen();
          }
        }

        // Restore layers
        if (!_isEmpty(layers[scope][layersId])) {
          var selBaseLayerName = layers[scope][layersId].base;

          if (selBaseLayerName) {
            Object.keys(options.baseLayers).forEach(function(layerName) {
              var baseLayer = options.baseLayers[layerName];

              if (layerName === selBaseLayerName) {
                map.addLayer(baseLayer);
              } else {
                map.removeLayer(baseLayer);
              }
            }, map);
          }

          layers[scope][layersId].add.forEach(function(layer) {
            var overlay = _getOverlay(layer);

            // skips stored layers not on this map
            if (overlay && !map.hasLayer(overlay)) {
              map.addLayer(overlay);
            }
          }, map);

          layers[scope][layersId].remove.forEach(function(layer) {
            var overlay = _getOverlay(layer);

            // skips stored layers not on this map
            if (overlay && map.hasLayer(overlay)) {
              map.removeLayer(overlay);
            }
          }, map);
        }
      }
      catch (err) {
        console.log(err);
      }
    };

    // Update list of tracked layers in storage to add/remove when map is loaded
    _updateLayerList = function (e, type) {
      var group,
          index;

      group = null;
      if (e.group) {
        group = e.group.name;
      }
      index = {
        add: _getIndex(layers[scope][layersId].add, e.name),
        remove: _getIndex(layers[scope][layersId].remove, e.name)
      };

      // Loop thru add/remove layer lists
      Object.keys(index).forEach(function(listType) {
        if (listType === type) { // add layer to list if not present
          if (index[listType] === -1) { // layer is not in list
            layers[scope][layersId][listType].push({
              group: group,
              name: e.name
            });
          }
        } else { // remove layer from list if present
          if (index[listType] !== -1) { // layer is in list
            layers[scope][layersId][listType].splice(index[listType], 1);
          }
        }
      });
    };

    _initialize();
  }
};

L.Map.include(RestoreMapMixin);
