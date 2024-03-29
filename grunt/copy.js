'use strict';


var config = require('./config');

var copy = {
  options: {
    mode: true,
    timestamp: true
  },

  build: {
    cwd: config.src,
    dest: config.build + '/' + config.src,
    expand: true,
    filter: 'isFile',
    src: [
      '**/*',
      '!**/*.js',
      '!**/*.scss'
    ]
  },

  dist: {
    cwd: config.build + '/' + config.src,
    dest: config.dist,
    expand: true,
    filter: 'isFile',
    src: [
      '**/*',
      '!**/*.css',
      '!**/*.js',
      '!**/*.map'
    ]
  },

  flatpickr: {
    cwd: 'node_modules/flatpickr/dist',
    dest: config.build + '/' + config.src + '/htdocs/lib/flatpickr',
    expand: true,
    filter: 'isFile',
    src: [
      'flatpickr.css',
      'flatpickr.js'
    ]
  },

  leaflet: {
    cwd: 'node_modules/leaflet/dist',
    dest: config.build + '/' + config.src + '/htdocs/lib/leaflet',
    expand: true,
    filter: 'isFile',
    rename: function (dest, src) {
      // grab 'src' version of Leaflet to make debugging easier (uglified for dist)
      var newName = src.replace(/leaflet-src\.js$/, 'leaflet.js');

      return dest + '/' + newName;
    },
    src: [
      'images/**/*',
      'leaflet-src.js',
      'leaflet-src.js.map',
      'leaflet.css'
    ]
  },

  phprtflite: {
    cwd: 'vendor/phprtflite/phprtflite/lib',
    dest: config.build + '/' + config.src + '/htdocs/lib',
    expand: true,
    filter: 'isFile',
    src: [
      'PHPRtfLite/**/*',
      'PHPRtfLite.php'
    ]
  },

  plotly: {
    dest: config.build + '/' + config.src + '/htdocs/lib/plotly/plotly-gl3d.js',
    src: 'node_modules/plotly.js/dist/plotly-gl3d.js'
  }
};


module.exports = copy;
