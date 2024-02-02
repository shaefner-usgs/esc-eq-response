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
 *       destroy: {Function}
 *       id: {String}
 *       name: {String)
 *       remove: {Function}
 *       render: {Function}
 *       url: {String}
 *     }
 */
var SignificantEqs = function (options) {
  var _this,
      _initialize,

      _app,
      _el,
      _lis,

      _addListeners,
      _fetch,
      _getContent,
      _getData,
      _getItem,
      _removeListeners,
      _setMainshock,
      _update;


  _this = {};

  _initialize = function (options = {}) {
    _app = options.app;

    _this.id = 'significant-eqs';
    _this.name = 'Significant Earthquakes';
    _this.url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/' +
      'significant_month.geojson';

    _el = document.getElementById(_this.id);

    _fetch();
  };

  /**
   * Add event listeners.
   */
  _addListeners = function () {
    _lis = _el.querySelectorAll('li');

    _lis.forEach(li =>
      li.addEventListener('click', _setMainshock)
    );
  };

  /**
   * Fetch the feed data.
   */
  _fetch = function () {
    _el.innerHTML = '<div class="spinner"></div>';

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
    var html = '<h4>None</h4>'; // default

    if (json.features?.length >= 1) {
      html = '<ul>';

      json.features.forEach((feature = {}) => {
        html += _getItem(feature);
      });

      html += '</ul>';
    }

    return html;
  };

  /**
   * Get the data for the given earthquake.
   *
   * @param eq {Object}
   *
   * @return {Object}
   */
  _getData = function (eq) {
    var eqid = AppUtil.getParam('eqid'),
        props = eq.properties || {},
        millisecs = Number(props.time) || 0,
        datetime = Luxon.DateTime.fromMillis(millisecs),
        selected = '';

    if (eq.id === eqid) {
      selected = 'selected';
    }

    return {
      id: eq.id,
      isoTime: datetime.toUTC().toISO(),
      mag: AppUtil.round(props.mag, 1),
      mmi: AppUtil.romanize(Number(props.mmi)),
      place: props.place,
      selected: selected,
      userTime: datetime.toFormat(_app.dateFormat),
      utcOffset: Number(datetime.toFormat('Z')),
      utcTime: datetime.toUTC().toFormat(_app.dateFormat)
    };
  };

  /**
   * Get the HTML content for the given earthquake.
   *
   * @param eq {Object}
   *
   * @return {String}
   */
  _getItem = function (eq) {
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
      _getData(eq)
    );
  };

  /**
   * Remove event listeners.
   */
  _removeListeners = function () {
    _lis?.forEach(li =>
      li.removeEventListener('click', _setMainshock)
    );
  };

  /**
   * Event handler that sets the selected Mainshock.
   */
  _setMainshock = function () {
    var input = document.getElementById('eqid');

    if (input.value !== this.id) { // eq not already selected
      input.value = this.id;

      // Input event not triggered when changed programmatically
      _app.SelectBar.setMainshock();
    }

    _this.render();
  };

  /**
   * Select the Mainshock (if applicable) and unselect all other earthquakes.
   */
  _update = function () {
    var eqid = document.getElementById('eqid').value;

    if (!_lis) return; // feed data not fetched yet

    _lis.forEach(li => {
      if (li.id === eqid) {
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
   * Destroy this Class.
   */
  _this.destroy = function () {
    _initialize = null;

    _app = null;
    _el = null;
    _lis = null;

    _addListeners = null;
    _fetch = null;
    _getContent = null;
    _getData = null;
    _getItem = null;
    _removeListeners = null;
    _setMainshock = null;
    _update = null;

    _this = null;
  };

  /**
   * Remove the Feature.
   */
  _this.remove = function () {
    _removeListeners();

    _el.innerHTML = '';
  };

  /**
   * Render the Feature.
   *
   * @param json {Object} default is {}
   */
  _this.render = function (json = {}) {
    if (!AppUtil.isEmpty(json)) { // initial render
      _el.innerHTML = _getContent(json);

      _addListeners();
    }

    _update();
  };


  _initialize(options);
  options = null;
  return _this;
};


module.exports = SignificantEqs;
