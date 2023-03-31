/* global L */
'use strict';


var AppUtil = require('util/AppUtil'),
    Luxon = require('luxon');


/**
 * Create the Significant Earthquakes Feature.
 *
 * @param options {Object}
 *     {
 *       app: {Object} Application
 *     }
 *
 * @return _this {Object}
 *     {
 *       addData: {Function}
 *       addListeners: {Function}
 *       content: {String}
 *       destroy: {Function}
 *       id: {String}
 *       name: {String)
 *       update: {Function}
 *       url: {String}
 *     }
 */
var SignificantEqs = function (options) {
  var _this,
      _initialize,

      _app,
      _lis,

      _fetch,
      _getContent,
      _getItem,
      _setMainshock;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;

    _this.id = 'significant-eqs';
    _this.name = 'Significant Earthquakes';
    _this.url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/' +
      'significant_month.geojson';

    _fetch();
  };

  /**
   * Fetch the feed data.
   */
  _fetch = function () {
    L.geoJSON.async(_this.url, {
      app: _app,
      feature: _this
    });
  };

  /**
   * Get the HTML content for the SelectBar.
   *
   * @param json {Object}
   *
   * @return html {String}
   */
  _getContent = function (json) {
    var eqid = AppUtil.getParam('eqid'),
        html = '<h4>None</h4>'; // default

    if (json.features?.length >= 1) {
      html = '<ul>';

      json.features.forEach((feature ={}) => {
        var data,
            props = feature.properties || {},
            millis = Number(props.time) || 0,
            datetime = Luxon.DateTime.fromMillis(millis),
            selected = '';

        if (feature.id === eqid) {
          selected = 'selected';
        }

        data = {
          id: feature.id,
          isoTime: datetime.toUTC().toISO(),
          mag: AppUtil.round(props.mag, 1),
          mmi: AppUtil.romanize(Number(props.mmi)),
          place: props.place,
          selected: selected,
          userTime: datetime.toFormat(_app.dateFormat),
          utcOffset: Number(datetime.toFormat('Z')),
          utcTime: datetime.toUTC().toFormat(_app.dateFormat)
        };
        html += _getItem(data);
      });

      html += '</ul>';
    }

    return html;
  };

  /**
   * Get the HTML <li> for the given earthquake.
   *
   * @param data {Object}
   *
   * @return {String}
   */
  _getItem = function (data) {
    return L.Util.template(
      '<li id="{id}" class="{selected}">' +
        '<div>' +
          '<span class="mag">{mag}</span>' +
          '<span class="impact-bubble mmi{mmi}" title="ShakeMap maximum estimated intensity">' +
            '<strong class="roman">{mmi}</strong>' +
          '</span>' +
        '</div>' +
        '<div>' +
          '<h4>{place}</h4>' +
          '<time datetime="{isoTime}" class="user">{userTime} (UTC{utcOffset})</time>' +
          '<time datetime="{isoTime}" class="utc">{utcTime} (UTC)</time>' +
        '</div>' +
      '</li>',
      data
    );
  };

  /**
   * Event handler that sets the Mainshock.
   */
  _setMainshock = function () {
    var input = document.getElementById('eqid');

    _lis.forEach(li => {
      if (li.id === this.id) {
        if (input.value !== li.id) { // eq not already selected
          input.value = li.id;

          // Input event not triggered when changed programmatically
          _app.SelectBar.setMainshock();
        }

        li.classList.add('selected');
      } else {
        li.classList.remove('selected');
      }
    });
  };

  // ----------------------------------------------------------
  // Public methods
  // ----------------------------------------------------------

  /**
   * Add the JSON feed data.
   *
   * @param json {Object} default is {}
   */
  _this.addData = function (json = {}) {
    _this.content = _getContent(json);
  };

  /**
   * Add event listeners.
   */
  _this.addListeners = function () {
    var el = document.getElementById(_this.id);

    _lis = el.querySelectorAll('li');

    _lis.forEach(li =>
      li.addEventListener('click', _setMainshock)
    );
  };

  /**
   * Destroy this Class to aid in garbage collection.
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;
    _lis = null;

    _fetch = null;
    _getContent = null;
    _getItem = null;
    _setMainshock = null;

    _this = null;
  };

  /**
   * Update the list: select the Mainshock with the given id if it is in the
   * list and unselect all other earthquakes.
   *
   * Note: if the feed hasn't been fetched yet, the Mainshock will get selected
   * when the list is initially created.
   *
   * @param id {String} default is ''
   *     Mainshock id
   */
  _this.update = function (id = '') {
    if (!_lis) return; // feed hasn't been fetched yet

    _lis.forEach(li => {
      if (li.id === id) {
        li.classList.add('selected');
      } else {
        li.classList.remove('selected');
      }
    });
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = SignificantEqs;
