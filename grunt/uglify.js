'use strict';


var config = require('./config');

var uglify = {
  options: {
    banner: '/* uglified: <%= grunt.template.today("mm-dd-yyyy hh:MM:ss") %> */\n'
  },

  dist: {
    files: [{
      cwd: config.build + '/' + config.src,
      dest: config.dist,
      expand: true,
      src: [
        'htdocs/**/*.js'
      ]
    }]
  }
};


module.exports = uglify;
