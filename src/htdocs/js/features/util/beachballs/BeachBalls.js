/* global L */
'use strict';


require('leaflet/L.Marker.Canvas');

var AppUtil = require('util/AppUtil'),
    BeachBallView = require('./BeachBallView'),
    Tensor = require('./Tensor');


var _COLORS,
    _DEFAULTS,
    _R2D;

_COLORS = {
  'focal-mechanism': '#ffaa69',
  'moment-tensor': '#6ea8ff'
};
_DEFAULTS = {
  name: 'Moment Tensor',
  type: 'moment-tensor'
};
_R2D = 180 / Math.PI;


/**
 * Create the BeachBalls for a Focal Mechanism or Moment Tensor Feature.
 *
 * @param options {Object}
 *     {
 *       data: {Object}
 *       mainshock: {Object}
 *       name: {String} optional
 *       type: {String} optional
 *     }
 *
 * @return _this {Object}
 *     {
 *       addListeners: {Function}
 *       destroy: {Function}
 *       getContent: {Function}
 *       getMapLayer: {Function}
 *       getSummary: {Function}
 *       removeListeners: {Function}
 *       render: {Function}
 *     }
 */
var BeachBalls = function (options) {
  var _this,
      _initialize,

      _beachballs,
      _data,
      _els,
      _mainshock,
      _name,
      _tensor,
      _type,

      _create,
      _getAxes,
      _getAxis,
      _getData,
      _getProps,
      _getTemplate,
      _getTitle,
      _showLightbox;


  _this = {};

  _initialize = function (options = {}) {
    options = Object.assign({}, _DEFAULTS, options);

    _data = options.data;
    _mainshock = options.mainshock;
    _name = options.name;
    _type = options.type;

    if (_type !== 'focal-mechanism') {
      _type = _DEFAULTS.type;
    }

    _tensor = Tensor.fromProduct(
      Object.assign({}, _data, {
        type: _type
      })
    );
  };

  /**
   * Create the BeachBalls.
   *
   * Note: the map's BeachBall is rendered into a placeholder (and hidden by
   * CSS). It is moved from its placeholder to the Canvas Marker (and unhidden)
   * when the map layer is turned on.
   */
  _create = function () {
    var options = {
          className: _type,
          fillColor: _COLORS[_type],
          labelAxes: false,
          labelPlanes: false,
          tensor: _tensor
        },
        selectors = { // BeachBall containers
          lightbox: `#${_type}-lightbox .beachball`,
          marker: '#mapPane .container',
          thumb: `#summaryPane div.${_type} a`
        };

    _beachballs = {
      lightbox: BeachBallView(
        Object.assign({}, options, {
          el: document.querySelector(selectors.lightbox),
          labelAxes: true,
          labelPlanes: true,
          size: 350
        })
      ),
      marker: BeachBallView(
        Object.assign({}, options, {
          el: document.querySelector(selectors.marker),
          size: 40
        })
      ),
      thumb: BeachBallView(
        Object.assign({}, options, {
          el: document.querySelector(selectors.thumb),
          size: 180
        })
      )
    };
  };

  /**
   * Get the HTML template for the Moment Tensor's Principal Axes.
   *
   * @return template {String}
   */
  _getAxes = function () {
    var template = '';

    if (_type === 'moment-tensor') {
      template =
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

    return template;
  };

  /**
   * Get the data for an axis.
   *
   * @param name {String <T|N|P>}
   *
   * @return {Object}
   */
  _getAxis = function (name) {
    var axis = _tensor[name],
        azimuth = (Math.PI / 2) - axis.azimuth(),
        plunge = axis.plunge(),
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
    var halfDuration,
        axes = {
          N: _getAxis('N'),
          P: _getAxis('P'),
          T: _getAxis('T')
        },
        duration = _data['sourcetime-duration'],
        moment = (_tensor.moment / _tensor.scale).toFixed(3) +
          `e+${_tensor.exponent} ${_tensor.units}`,
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
      magType: _data['derived-magnitude-type'] || '',
      magnitude: AppUtil.round(_tensor.magnitude, 2),
      moment: moment,
      mtAxes: '',
      mtProps: '',
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
   * Get the HTML template for the Moment Tensor-specific properties.
   *
   * @return template {String}
   */
  _getProps = function () {
    var template = '';

    if (_type === 'moment-tensor') {
      template =
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

    return template;
  };

  /**
   * Get the HTML template for the Lightbox.
   *
   * @return {String}
   */
  _getTemplate = function () {
    return '' +
      '<div class="container">' +
        '<div class="content">' +
          '<div class="details">' +
            '<h3>{title}</h3>' +
            '<dl class="props alt">' +
              _getProps() +
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
            '</table>' +
            _getAxes() +
          '</div>' +
          '<div class="beachball"></div>' +
        '</div>' +
        '<p class="status"><span>{status}</span></p>' +
      '</div>';
  };

  /**
   * Get the Feature's title.
   *
   * @return title {String}
   */
  _getTitle = function () {
    var title, type,
        titles = {
          MWW: 'W-phase Moment Tensor (Mww)',
          MWC: 'Centroid Moment Tensor (Mwc)',
          MWB: 'Body-wave Moment Tensor (Mwb)',
          MWR: 'Regional Moment Tensor (Mwr)'
        };

    if (_type === 'focal-mechanism') {
      title = 'Focal Mechanism';
    } else {
      type = (_tensor.type || '').toUpperCase();
      title = titles[type];

      if (!title) {
        title = 'Moment Tensor';

        if (_tensor.type) {
          title += ` (${_tensor.type})`;
        }
      }
    }

    return title;
  };

  /**
   * Event handler that shows a Lightbox.
   *
   * @param e {Event}
   */
  _showLightbox = function (e) {
    e.preventDefault();

    _mainshock.lightboxes[_type].show();
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add event listeners.
   */
  _this.addListeners = function () {
    _els = [
      document.querySelector(`#summaryPane div.${_type} > a`),
      document.querySelector(`#mapPane canvas.${_type}`)
    ];

    _els.forEach(el =>
      el.addEventListener('click', _showLightbox)
    );
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _initialize = null;

    _beachballs = null;
    _data = null;
    _els = null;
    _mainshock = null;
    _name = null;
    _tensor = null;
    _type = null;

    _create = null;
    _getAxes = null;
    _getAxis = null;
    _getData = null;
    _getProps = null;
    _getTemplate = null;
    _getTitle = null;
    _showLightbox = null;

    _this = null;
  };

  /**
   * Get the HTML content for the Lightbox.
   *
   * @return {String}
   */
  _this.getContent = function () {
    var data = _getData(),
        template = _getTemplate();

    return L.Util.template(template, data);
  };

  /**
   * Get the Leaflet map layer.
   *
   * @return {L.Marker}
   */
  _this.getMapLayer = function () {
    return L.marker.canvas(_mainshock.data.latLng, {
      icon: L.divIcon({
        className: _type,
        iconSize: L.point(40, 40)
      }),
      pane: _type // controls stacking order
    }).bindTooltip(_getTitle());
  };

  /**
   * Get the HTML content for the SummaryPane.
   *
   * @return {String}
   */
  _this.getSummary = function () {
    var eqid = AppUtil.getParam('eqid'),
        url = `https://earthquake.usgs.gov/earthquakes/eventpage/${eqid}/${_type}`;

    return `<h4>${_name}</h4><a href="${url}" target="new"></a>`;
  };

  /**
   * Remove event listeners.
   */
  _this.removeListeners = function () {
    _els.forEach(el => {
      if (el) {
        el.removeEventListener('click', _showLightbox);
      }
    });
  };

  /**
   * Create and render the Feature's BeachBalls, then destroy them.
   */
  _this.render = function () {
    _create();

    Object.keys(_beachballs).forEach(key => {
      _beachballs[key].render();
      _beachballs[key].destroy();
    });
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = BeachBalls;