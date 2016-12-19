'use strict';


//require('manup');

var Application = require('Application');

Application({
  editPane: document.getElementById('editPane'),
  loading: document.getElementById('loading'),
  mapPane: document.querySelector('.map'),
  navigation: document.getElementById('navigation'),
  summaryPane: document.getElementById('summaryPane')
});
