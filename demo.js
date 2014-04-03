'use strict';

var createShell = require('./');
var createGUI = require('dat-gui');

require('kb-bindings-ui');
require('voxel-plugins-ui');
require('voxel-registry');

createShell({require: require, pluginOpts:
  {
    'voxel-registry': {},
    'voxel-plugins-ui': {gui: new createGUI.GUI()},
    //'kb-bindings-ui': {gui: new createGUI.GUI()}, // TODO: add compatibility, game-shell bindings object is different than kb-bindings
  }
});

document.querySelector('.dg.ac').style.zIndex = 1; // fix datgui behind canvas
