'use strict';


var config = require('./config'),
    summary = require('eslint-summary');

var eslint = {
  options: {
    configFile: '.eslintrc.json',
    format: summary
  },

  build: {
    src: [
      'Gruntfile.js',
      'grunt/**/*.js',
      config.src + '/htdocs/**/*.js'
    ]
  }
};


module.exports = eslint;
