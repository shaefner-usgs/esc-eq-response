'use strict';


var config = require('./config'),
    dartSass = require('sass');

var sass = {
  options: {
    implementation: dartSass,
    includePaths: [
      'node_modules'
    ],
    outputStyle: 'expanded',
    sourceMap: config.build + '/' + config.src + '/htdocs/css/index.css.map',
    sourceMapContents: true
  },

  build: {
    files: [{
      cwd: config.src,
      dest: config.build + '/' + config.src,
      expand: true,
      ext: '.css',
      extDot: 'last',
      src: [
        'htdocs/**/*.scss'
      ]
    }]
  }
};


module.exports = sass;
