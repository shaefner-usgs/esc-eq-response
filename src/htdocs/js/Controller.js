'use strict';


var Controller = function (options) {
  var _this,
      _initialize,

      _modes,
      _inputs,

      _addListeners,
      _changeMode,
      _getDefaultPaneId,
      _getParam,
      _getParams,
      _hidePanes,
      _setParam,
      _setQueryString,
      _setValues,
      _showPane,
      _updateQueryString;

  _this = {};

  _initialize = function () {
    var id;

    _inputs = document.querySelectorAll('input');
    _modes = document.querySelectorAll('.modes a');
    id = _getDefaultPaneId();

    _addListeners();
    _showPane(id);
    _setValues();
    _setQueryString();
  };

  _addListeners = function () {
    var i;

    for (i = 0; i < _modes.length; i ++) {
      _modes[i].addEventListener('click', _changeMode);
    }

    for (i = 0; i < _inputs.length; i ++) {
      _inputs[i].addEventListener('change', _updateQueryString);
    }
  };

  _changeMode = function (e) {
    var id = e.target.hash.substr(1);

    //e.preventDefault();
    _hidePanes();
    _showPane(id);
  };

  _getDefaultPaneId = function () {
    var id = 'edit';

    if (location.hash) {
      id = location.hash.substr(1);
    }

    return id;
  };

  _getParam = function (name) {
    var params = _getParams();

    return params[name];
  };

  _getParams = function () {
    var params,
        queryString;

    params = {};
    queryString = location.search.slice(1);

    queryString.replace(/([^=]*)=([^&]*)&*/g, function (match, key, value) {
      params[key] = value;
    });

    return params;
  };

  _hidePanes = function () {
    var button,
        id,
        pane;

    for (var i = 0; i < _modes.length; i ++) {
      id = _modes[i].hash.substr(1);
      button = document.querySelector('[href="#' + id + '"]');
      pane = document.querySelector('#' + id);

      button.classList.remove('selected');
      pane.classList.add('hide');
    }
  };

  _setParam = function (name, value) {
    var hash,
        pairs,
        params,
        queryString;

    hash = location.hash;
    params = _getParams();
    params[name] = value;

    pairs = [];
    Object.keys(params).forEach(function(key) {
      pairs.push(key + '=' + params[key]);
    });
    queryString = '?' + pairs.join('&');

    window.history.replaceState({}, '', queryString + hash);
  };

  _setQueryString = function () {
    var i;

    for (i = 0; i < _inputs.length; i ++) {
      _setParam(_inputs[i].id, _inputs[i].value);
    }
  };

  _setValues = function () {
    var params = _getParams();

    Object.keys(params).forEach(function(key) {
      if (document.getElementById(key)) {
        document.getElementById(key).value = params[key];
      }
    });
  };

  _showPane = function (id) {
    var button,
        pane;

    button = document.querySelector('[href="#' + id + '"]');
    pane = document.querySelector('#' + id);

    button.classList.add('selected');
    pane.classList.remove('hide');
  };

  _updateQueryString = function (e) {
    var id,
        value;

    id = e.target.id;
    value = document.getElementById(id).value;

    _setParam(id, value);
  };


  _initialize(options);
  options = null;
  return _this;
};

module.exports = Controller;
