'use strict';


var config = require('./config'),
    gateway = require('gateway'),
    rewrite = require('http-rewrite-middleware');

var MOUNT_PATH = config.ini.MOUNT_PATH;

var addMiddleware = function(connect, options, middlewares) {
  middlewares.unshift( // add custom middleware to default middlewares[]
    rewrite.getMiddleware([{
      from: '^' + MOUNT_PATH + '/(.*)$',
      to: '/$1'
    }]),
    gateway(options.base[0], {
      '.php': 'php-cgi'
    })
  );

  return middlewares;
};

var connect = {
  options: {
    hostname: '*'
  },

  build: {
    options: {
      base: config.build + '/' + config.src + '/htdocs',
      livereload: config.liveReloadPort,
      middleware: addMiddleware,
      port: config.buildPort
    }
  },

  dist: {
    options: {
      base: config.dist + '/htdocs',
      keepalive: true,
      middleware: addMiddleware,
      port: config.distPort
    }
  }
};


module.exports = connect;
