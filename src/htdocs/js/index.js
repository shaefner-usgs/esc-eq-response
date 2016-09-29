'use strict';


var Controller = require('Controller'),
    Map = require('map/Map');

Controller();

Map({
  el: document.querySelector('.map')
});
