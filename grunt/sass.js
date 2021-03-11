'use strict';


var config = require('./config'),
    dartSass = require('sass');

var sass = {
  options: {
    implementation: dartSass,
    outputStyle: 'expanded',
    sourceComments: true,
    sourceMap: true,
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
