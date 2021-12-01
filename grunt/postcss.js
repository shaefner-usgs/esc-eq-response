'use strict';


var autoprefixer = require('autoprefixer'),
    config = require('./config'),
    cssnano = require('cssnano');

var postcss = {
  build: {
    options: {
      map: true,
      processors: [
        autoprefixer()
      ]
    },
    files: [{
      cwd: config.build + '/' + config.src,
      dest: config.build + '/' + config.src,
      expand: true,
      src: [
        'htdocs/**/*.css'
      ]
    }]
  },

  dist: {
    options: {
      processors: [
        cssnano() // minify
      ]
    },
    files: [{
      cwd: config.build + '/' + config.src,
      dest: config.dist,
      expand: true,
      src: [
        'htdocs/**/*.css'
      ]
    }]
  }
};


module.exports = postcss;
