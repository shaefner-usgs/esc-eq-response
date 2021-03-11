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
    options: {
      spawn: false
    },
    files: [
      config.src + '/htdocs/**/*.js'
    ],
    tasks: [
      'eslint',
      'browserify'
    ]
  },

  livereload: {
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
      'sass'
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
