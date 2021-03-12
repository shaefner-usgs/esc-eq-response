'use strict';


var config = require('./config');

var watch = {
  grunt: {
    files: [
      'Gruntfile.js',
      'grunt/**/*.js'
    ],
    tasks: [
      'eslint'
    ]
  },

  js: {
    files: [
      config.src + '/htdocs/**/*.js'
    ],
    tasks: [
      'eslint',
      'browserify'
    ]
  },

  liveReload: {
    options: {
      livereload: config.liveReloadPort
    },
    files: [
      config.build + '/' + config.src + '/**/*'
    ],
  },

  scss: {
    files: [
      config.src + '/htdocs/**/*.scss'
    ],
    tasks: [
      'sass',
      'postcss:build'
    ]
  },

  static: {
    files: [
      config.src + '/**/*',
      '!**/*.js',
      '!**/*.scss'
    ],
    tasks: [
      'copy:build'
    ]
  }
};


module.exports = watch;
