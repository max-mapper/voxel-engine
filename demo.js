'use strict';

var createShell = require('./');
var createGUI = require('dat-gui');

require('voxel-plugins-ui');
require('kb-bindings-ui');
require('voxel-registry');
require('voxel-stitch');
require('./lib/blocks.js');
require('voxel-drop');
require('voxel-keys');
require('voxel-artpacks');

createShell({require: require, pluginOpts:
  {
    'voxel-registry': {},
    'voxel-stitch': {debug: false},
    'voxel-plugins-ui': {gui: new createGUI.GUI()},
    'kb-bindings-ui': {},
    './lib/blocks.js': {},
    'voxel-drop': {},
    'voxel-keys': {},
    'voxel-artpacks': {}
  }
});

