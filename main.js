"use strict"

var createShell = require("gl-now")

var createPlugins = require('voxel-plugins')
require('voxel-registry')
require('voxel-stitch')
require('voxel-shader')
require('voxel-mesher')
require('game-shell-fps-camera')
require('./lib/blocks.js') // temporary
require('./lib/terrain.js') // temporary

var BUILTIN_PLUGIN_OPTS = {
  'voxel-registry': {},
  'voxel-stitch': {},
  'voxel-shader': {},
  'voxel-mesher': {},
  'game-shell-fps-camera': {},
  './lib/blocks.js': {},
  './lib/terrain.js': {},
};

var game = {};
global.game = game; // for debugging

var main = function(opts) {
  opts = opts || {};
  opts.clearColor = [0.75, 0.8, 0.9, 1.0]
  opts.pointerLock = true;

  var shell = createShell(opts);

  game.isClient = true;
  game.shell = shell;

  // TODO: should plugin creation this be moved into gl-init?? see z-index note below

  var plugins = createPlugins(game, {require: function(name) {
    // we provide the built-in plugins ourselves; otherwise check caller's require, if any
    // TODO: allow caller to override built-ins? better way to do this?
    if (name in BUILTIN_PLUGIN_OPTS) {
      return require(name);
    } else {
      return opts.require ? opts.require(name) : require(name);
    }
  }});

  var pluginOpts = opts.pluginOpts || {}; // TODO: persist

  for (var name in BUILTIN_PLUGIN_OPTS) {
    opts.pluginOpts[name] = opts.pluginOpts[name] || BUILTIN_PLUGIN_OPTS[name];
  }

  for (var name in pluginOpts) {
    plugins.add(name, pluginOpts[name]);
  }
  plugins.loadAll();

  shell.on("gl-init", function() {
    var gl = shell.gl

    // since the plugins are loaded before gl-init, the <canvas> element will be
    // below other UI widgets in the DOM tree, so by default the z-order will cause
    // the canvas to cover the other widgets - to fix this, set z-index below
    shell.canvas.style.zIndex = '-1';
    shell.canvas.parentElement.style.zIndex = '-1';

    //Lookup voxel materials for terrain generation
  })

  shell.on("gl-error", function(err) {
    document.body.appendChild(document.createTextNode('Fatal WebGL error: ' + err))
  })

  return shell
}

module.exports = main

