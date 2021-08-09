'use strict';


var config = require('./config');

var postcss = {
  build: {
    options: {
      map: true,
      processors: [
        require('autoprefixer')(),
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
        require('cssnano')() // minify
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
