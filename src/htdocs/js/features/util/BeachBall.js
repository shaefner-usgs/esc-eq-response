/* global L */
'use strict';


require('leaflet/L.Marker.Canvas');

var AppUtil = require('util/AppUtil'),
    BeachBallView = require('features/util/BeachBallView'),
    Tensor = require('features/util/Tensor');


var _R2D = 180 / Math.PI;

var _DEFAULTS = {
  coords: [],
  data: {},
  name: 'Moment Tensor',
  type: 'moment-tensor'
};

/**
 * Create the beachballs for Focal Mechanism and Moment Tensor Features.
 *
 * @param options {Object}
 *   {
 *     coords: {Array} required
 *     data: {Object} required
 *     id: {String}
 *     name: {String}
 *     type: {String}
 *   }
 *
 * @return _this {Object}
 *   {
 *     createLightbox: {Function}
 *     createMapLayer: {Function}
 *     createSummary: {Function}
 *     destroy: {Function}
 *     render: {Function}
 *   }
 */
var BeachBall = function (options) {
  var _this,
      _initialize,

      _beachballs,
      _className,
      _colors,
      _coords,
      _data,
      _markerSize,
      _name,
      _selectors,
      _tensor,

      _getAxis,
      _getData,
      _getTitle;

  _this = {};

  _initialize = function (options) {
    options = Object.assign({}, _DEFAULTS, options);

    if (options.type !== 'focal-mechanism') {
      options.type = _DEFAULTS.type;
    }

    _className = options.id || options.type;
    _colors = {
      'focal-mechanism': '#ffaa69',
      'moment-tensor': '#6ea8ff'
    };
    _coords = options.coords;
    _data = Object.assign({}, options.data, {
      type: options.type
    });
    _markerSize = 40;
    _name = options.name;
    _selectors = { // querySelectors for beachball containers
      annotated: `#${_className}Lightbox .beachball`,
      marker: '#mapPane .container',
      thumb: `#summaryPane div.${_className} a`
    };
    _tensor = Tensor.fromProduct(_data);
  };

  /**
   * Get the data for an axis.
   *
   * @param name {String <T|N|P>}
   *
   * @return {Object}
   */
  _getAxis = function (name) {
    var axis,
        azimuth,
        plunge,
        value;

    axis = _tensor[name];
    azimuth = (Math.PI / 2) - axis.azimuth();
    plunge = axis.plunge();
    value = axis.eigenvalue / _tensor.scale;

    if (plunge < 0) { // make sure plunge is down
      azimuth = azimuth + Math.PI;
      plunge = plunge * -1;
    }

    azimuth = BeachBallView.zeroToTwoPi(azimuth);

    return {
      azimuth: AppUtil.round(azimuth * _R2D, 0) + '°',
      plunge: AppUtil.round(plunge * _R2D, 0) + '°',
      value: value.toFixed(3) + `e+${_tensor.exponent} ${_tensor.units}`
    };
  };

  /**
   * Get the data used to create the Lightbox content.
   *
   * @return {Object}
   */
  _getData = function () {
    var axes,
        duration,
        halfDuration,
        moment,
        status;

    axes = {
      N: _getAxis('N'),
      P: _getAxis('P'),
      T: _getAxis('T')
    };
    duration = _data['sourcetime-duration'];
    moment = (_tensor.moment / _tensor.scale).toFixed(3) +
      `e+${_tensor.exponent} ${_tensor.units}`;
    status = _data['review-status'] || '';

    if (duration) {
      halfDuration = duration / 2 + ' s';
    }
    if (status === 'reviewed') {
      status += '<i class="icon-check"></i>';
    }

    return {
      catalog: _data.eventsource,
      contributor: _data.source,
      dataSource: _data['beachball-source'] || _data.source,
      depth: AppUtil.round(_tensor.depth, 1) + ' km',
      halfDuration: halfDuration || '–',
      magnitude: AppUtil.round(_tensor.magnitude, 2),
      magType: _data['derived-magnitude-type'] || '',
      moment: moment,
      nAxisAzimuth: axes.N.azimuth,
      nAxisPlunge: axes.N.plunge,
      nAxisValue: axes.N.value,
      np1Dip: AppUtil.round(_tensor.NP1.dip, 0) + '°',
      np1Rake: AppUtil.round(_tensor.NP1.rake, 0) + '°',
      np1Strike: AppUtil.round(_tensor.NP1.strike, 0) + '°',
      np2Dip: AppUtil.round(_tensor.NP2.dip, 0) + '°',
      np2Rake: AppUtil.round(_tensor.NP2.rake, 0) + '°',
      np2Strike: AppUtil.round(_tensor.NP2.strike, 0) + '°',
      pAxisAzimuth: axes.P.azimuth,
      pAxisPlunge: axes.P.plunge,
      pAxisValue: axes.P.value,
      percentDC: AppUtil.round(_tensor.percentDC * 100, 0) + '%',
      status: status.toLowerCase(),
      tAxisAzimuth: axes.T.azimuth,
      tAxisPlunge: axes.T.plunge,
      tAxisValue: axes.T.value,
      title: _getTitle()
    };
  };

  /**
   * Get the Lightbox title.
   *
   * @return title {String}
   */
  _getTitle = function () {
    var title,
        type;

    if (_data.type === 'focal-mechanism') {
      title = 'Focal Mechanism';
    } else {
      type = (_tensor.type || '').toUpperCase();

      if (type === 'MWW') {
        title = 'W-phase Moment Tensor (Mww)';
      } else if (type === 'MWC') {
        title = 'Centroid Moment Tensor (Mwc)';
      } else if (type === 'MWB') {
        title = 'Body-wave Moment Tensor (Mwb)';
      } else if (type === 'MWR') {
        title = 'Regional Moment Tensor (Mwr)';
      }

      if (!title) {
        title = 'Moment Tensor';

        if (_tensor.type) {
          title += ` (${_tensor.type})`;
        }
      }
    }

    return title;
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Create the Lightbox HTML.
   *
   * @return {String}
   */
  _this.createLightbox = function () {
    var template =
      '<div class="content">' +
        '<div class="container">' +
          '<div class="details">' +
            '<h3>{title}</h3>' +
            '<dl class="params alt">';

    if (_data.type === 'moment-tensor') {
      template +=
              '<dt>Moment</dt>' +
              '<dd>{moment}</dd>' +
              '<dt>Magnitude</dt>' +
              '<dd>{magnitude}</dd>' +
              '<dt>Depth</dt>' +
              '<dd>{depth}</dd>' +
              '<dt>Percent <abbr title="Double Couple">DC</abbr></dt>' +
              '<dd>{percentDC}</dd>' +
              '<dt>Half Duration</dt>' +
              '<dd>{halfDuration}</dd>';
    }

    template +=
              '<dt>Catalog</dt>' +
              '<dd class="catalog">{catalog}</dd>' +
              '<dt>Data Source</dt>' +
              '<dd class="source">{dataSource}</dd>' +
              '<dt>Contributor</dt>' +
              '<dd class="contributor">{contributor}</dd>' +
            '</dl>' +
            '<h4>Nodal Planes</h4>' +
            '<table class="planes">' +
              '<thead>' +
                '<tr>' +
                  '<th>Plane</th>' +
                  '<th>Strike</th>' +
                  '<th>Dip</th>' +
                  '<th>Rake</th>' +
                '</tr>' +
              '</thead>' +
              '<tbody>' +
                '<tr>' +
                  '<th>NP1</th>' +
                  '<td>{np1Strike}</td>' +
                  '<td>{np1Dip}</td>' +
                  '<td>{np1Rake}</td>' +
                '</tr>' +
                '<tr>' +
                  '<th>NP2</th>' +
                  '<td>{np2Strike}</td>' +
                  '<td>{np2Dip}</td>' +
                  '<td>{np2Rake}</td>' +
                '</tr>' +
              '</tbody>' +
            '</table>';

    if (_data.type === 'moment-tensor') {
      template +=
            '<h4>Principal Axes</h4>' +
            '<table class="axes">' +
              '<thead>' +
                '<tr>' +
                  '<th>Axis</th>' +
                  '<th>Value</th>' +
                  '<th>Plunge</th>' +
                  '<th>Azimuth</th>' +
                '</tr>' +
              '</thead>' +
              '<tbody>' +
                '<tr>' +
                  '<th>T</th>' +
                  '<td>{tAxisValue}</td>' +
                  '<td>{tAxisPlunge}</td>' +
                  '<td>{tAxisAzimuth}</td>' +
                '</tr>' +
                '<tr>' +
                  '<th>N</th>' +
                  '<td>{nAxisValue}</td>' +
                  '<td>{nAxisPlunge}</td>' +
                  '<td>{nAxisAzimuth}</td>' +
                '</tr>' +
                '<tr>' +
                  '<th>P</th>' +
                  '<td>{pAxisValue}</td>' +
                  '<td>{pAxisPlunge}</td>' +
                  '<td>{pAxisAzimuth}</td>' +
                '</tr>' +
              '</tbody>' +
            '</table>';
    }

    template +=
          '</div>' +
          '<div class="beachball"></div>' +
        '</div>' +
        '<p class="status"><span>{status}</span></p>' +
      '</div>';

    return L.Util.template(template, _getData());
  };

  /**
   * Create the Leaflet map layer.
   *
   * Note: the marker's beachball is moved from its placeholder in the DOM to
   * the Canvas Marker when the layer is turned on.
   *
   * @param name {String}
   *
   * @return {L.layer}
   */
  _this.createMapLayer = function (name) {
    return L.marker.canvas(_coords, {
      icon: L.divIcon({
        className: _className,
        iconSize: L.point(_markerSize, _markerSize)
      }),
      pane: _className // put marker in custom Leaflet map pane
    }).bindTooltip(name);
  };

  /**
   * Create the summary HTML.
   *
   * @return {String}
   */
  _this.createSummary = function () {
    var eqid,
        url;

    eqid = AppUtil.getParam('eqid');
    url = `https://earthquake.usgs.gov/earthquakes/eventpage/${eqid}/${_data.type}`;

    return `<h4>${_name}</h4><a href="${url}" target="new"></a>`;
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = AppUtil.compose(function () {
    if (_beachballs) {
      Object.keys(_beachballs).forEach(key => {
        _beachballs[key].destroy();
      });
    }

    _beachballs = null;
    _className = null;
    _colors = null;
    _coords = null;
    _data = null;
    _markerSize = null;
    _name = null;
    _selectors = null;
    _tensor = null;

    _getAxis = null;
    _getData = null;
    _getTitle = null;

    _initialize = null;
    _this = null;
  }, _this.destroy);

  /**
   * Create and render the beachballs.
   *
   * Note: the marker's beachball is rendered into a placeholder (and hidden by
   * CSS) for use by Canvas Marker when the corresponding map layer is turned on.
   */
  _this.render = function () {
    var options = {
      className: _className,
      fillColor: _colors[_data.type],
      labelAxes: false,
      labelPlanes: false,
      tensor: _tensor
    };

    _beachballs = {
      annotated: BeachBallView(
        Object.assign({}, options, {
          el: document.querySelector(_selectors.annotated),
          labelAxes: true,
          labelPlanes: true,
          size: 350
        })
      ),
      marker: BeachBallView(
        Object.assign({}, options, {
          el: document.querySelector(_selectors.marker),
          size: _markerSize
        })
      ),
      thumb: BeachBallView(
        Object.assign({}, options, {
          el: document.querySelector(_selectors.thumb),
          size: 180
        })
      )
    };

    Object.keys(_beachballs).forEach(key => {
      _beachballs[key].render();
    });
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = BeachBall;
