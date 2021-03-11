'use strict';


var config = require('./config');

var postcss = {
  options: {
    processors: [
      require('autoprefixer')(),
      require('cssnano')() // minify
    ]
  },

  dist: {
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
