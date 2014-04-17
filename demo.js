'use strict';

var createShell = require('./');
var createGUI = require('dat-gui');

require('voxel-plugins-ui');
require('kb-bindings-ui');
require('voxel-drop');
require('voxel-keys');
require('voxel-artpacks');
require('voxel-wireframe');
require('./lib/blocks.js');
require('./lib/terrain.js');

createShell({require: require, pluginOpts:
  {
    //'voxel-stitch': {debug: true},
    'voxel-plugins-ui': {gui: new createGUI.GUI()},
    'kb-bindings-ui': {},
    'voxel-drop': {},
    'voxel-keys': {},
    'voxel-artpacks': {},
    'voxel-wireframe': {},
    './lib/blocks.js': {},
    './lib/terrain.js': {},
  }
});

