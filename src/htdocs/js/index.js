'use strict';


//require('manup');

var Application = require('Application');

Application({
  edit: document.getElementById('editPane'),
  loading: document.getElementById('loading'),
  map: document.querySelector('.map'),
  navigation: document.getElementById('navigation'),
  summary: document.getElementById('summaryPane')
});
