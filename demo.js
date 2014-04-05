'use strict';

var createShell = require('./');
var createGUI = require('dat-gui');

require('kb-bindings-ui');
require('voxel-plugins-ui');
require('voxel-registry');
require('voxel-stitch');
require('./lib/blocks.js');
require('voxel-drop');

createShell({require: require, pluginOpts:
  {
    'voxel-registry': {},
    'voxel-stitch': {},
    'voxel-plugins-ui': {gui: new createGUI.GUI()},
    //'kb-bindings-ui': {gui: new createGUI.GUI()}, // TODO: add compatibility, game-shell bindings object is different than kb-bindings
    './lib/blocks.js': {},
    'voxel-drop': {},
  }
});

document.querySelector('.dg.ac').style.zIndex = 1; // fix datgui behind canvas
