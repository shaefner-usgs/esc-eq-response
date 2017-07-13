'use strict';


//require('manup');

var Application = require('Application');

Application({
  editPane: document.getElementById('editPane'),
  mapPane: document.getElementById('mapPane'),
  navBar: document.getElementById('navBar'),
  plotsPane: document.getElementById('plotsPane'),
  statusBar: document.getElementById('statusBar'),
  summaryPane: document.getElementById('summaryPane')
});
