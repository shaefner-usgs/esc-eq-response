'use strict';


var Application = require('Application');

Application({
  edit: document.getElementById('edit'),
  map: document.querySelector('#map .map'),
  nav: document.getElementById('nav'),
  summary: document.getElementById('summary')
});
