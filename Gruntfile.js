'use strict';


module.exports = function (grunt) {
  var gruntConfig = require('./grunt');

  // Load all tasks matching patterns ['grunt-*', '@*/grunt-*'] in package.json
  require('load-grunt-tasks')(grunt);

  grunt.initConfig(gruntConfig);

  // Only lint the file that changed
  grunt.event.on('watch', function (action, filepath) {
    grunt.config('eslint.build.src', filepath);
  });

  grunt.registerTask('build', [
    'clean:build',
    'eslint',
    'browserify',
    'sass',
    'postcss:build',
    'copy:build',
    'copy:leaflet'
  ]);

  grunt.registerTask('dist', [
    'build',
    'clean:dist',
    'postcss:dist',
    'uglify',
    'copy:dist',
    'connect:dist'
  ]);

  grunt.registerTask('default', [
    'build',
    'connect:build',
    'watch'
  ]);
};
