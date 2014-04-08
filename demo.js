'use strict';

var createShell = require('./');
var createGUI = require('dat-gui');

require('voxel-plugins-ui');
require('kb-bindings-ui');
require('voxel-registry');
require('voxel-stitch');
require('./lib/blocks.js');
require('voxel-drop');

createShell({require: require, pluginOpts:
  {
    'voxel-registry': {},
    'voxel-stitch': {},
    'voxel-plugins-ui': {gui: new createGUI.GUI()},
    'kb-bindings-ui': {},
    './lib/blocks.js': {},
    'voxel-drop': {},
  }
});

document.querySelector('.dg.ac').style.zIndex = 1; // fix datgui behind canvas
