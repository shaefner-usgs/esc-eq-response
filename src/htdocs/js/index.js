'use strict';


//require('manup');

var Application = require('Application');

Application({
  editPane: document.getElementById('editPane'),
  mapPane: document.querySelector('.map'),
  navBar: document.getElementById('navBar'),
  statusBar: document.getElementById('statusBar'),
  summaryPane: document.getElementById('summaryPane')
});
