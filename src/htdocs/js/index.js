'use strict';


var Application = require('Application');

Application({
  edit: document.getElementById('edit'),
  loading: document.getElementById('loading'),
  map: document.querySelector('#map .map'),
  navigation: document.getElementById('navigation'),
  summary: document.getElementById('summary')
});
