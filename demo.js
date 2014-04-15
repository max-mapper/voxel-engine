'use strict';

var createShell = require('./');
var createGUI = require('dat-gui');

require('voxel-plugins-ui');
require('kb-bindings-ui');
require('./lib/blocks.js');
require('voxel-drop');
require('voxel-keys');
require('voxel-artpacks');
require('voxel-wireframe');

createShell({require: require, pluginOpts:
  {
    //'voxel-stitch': {debug: true},
    'voxel-plugins-ui': {gui: new createGUI.GUI()},
    'kb-bindings-ui': {},
    './lib/blocks.js': {},
    'voxel-drop': {},
    'voxel-keys': {},
    'voxel-artpacks': {},
    'voxel-wireframe': {},
  }
});

