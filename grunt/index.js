'use strict';


var gruntConfig = {
  config: require('./config'),

  browserify: require('./browserify'),
  clean: require('./clean'),
  connect: require('./connect'),
  copy: require('./copy'),
  eslint: require('./eslint'),
  postcss: require('./postcss'),
  sass: require('./sass'),
  uglify: require('./uglify'),
  watch: require('./watch'),
};


module.exports = gruntConfig;
