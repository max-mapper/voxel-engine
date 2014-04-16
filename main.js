"use strict"

var createShell = require("gl-now")
var createCamera = require("game-shell-fps-camera")
var ndarray = require("ndarray")
var createTerrain = require("./lib/terrain.js") // TODO: replace with shama's chunker mentioned in https://github.com/voxel/issues/issues/4#issuecomment-39644684
var createVoxelMesh = require("voxel-mesher")

var createPlugins = require('voxel-plugins')
require('voxel-registry')
require('voxel-stitch')
require('voxel-shader')

var BUILTIN_PLUGINS = ['voxel-registry', 'voxel-stitch', 'voxel-shader'];

var game = {};
global.game = game; // for debugging

var main = function(opts) {
  opts = opts || {};
  opts.clearColor = [0.75, 0.8, 0.9, 1.0]
  opts.pointerLock = true;

  var shell = createShell(opts);
  var camera = createCamera(shell);
  shell.camera = camera; // TODO: move to a plugin instead of hanging off shell instance?
  shell.meshes = []; // populated below TODO: move to voxels.meshes

  camera.position[0] = -20;
  camera.position[1] = -33;
  camera.position[2] = -40;

  game.isClient = true;
  game.shell = shell;

  // TODO: should plugin creation this be moved into gl-init?? see z-index note below

  var plugins = createPlugins(game, {require: function(name) {
    // we provide the built-in plugins ourselves; otherwise check caller's require, if any
    // TODO: allow caller to override built-ins? better way to do this?
    if (BUILTIN_PLUGINS.indexOf(name) !== -1) {
      return require(name);
    } else {
      return opts.require ? opts.require(name) : require(name);
    }
  }});

  var pluginOpts = opts.pluginOpts || {}; // TODO: persist

  BUILTIN_PLUGINS.forEach(function(name) {
    opts.pluginOpts[name] = opts.pluginOpts[name] || {};
  });

  for (var name in pluginOpts) {
    plugins.add(name, pluginOpts[name]);
  }
  plugins.loadAll();

// bit in voxel array to indicate voxel is opaque (transparent if not set)
var OPAQUE = 1<<15;

shell.on("gl-init", function() {
  var gl = shell.gl

  // since the plugins are loaded before gl-init, the <canvas> element will be
  // below other UI widgets in the DOM tree, so by default the z-order will cause
  // the canvas to cover the other widgets - to fix this, set z-index below
  shell.canvas.style.zIndex = '-1';
  shell.canvas.parentElement.style.zIndex = '-1';

  // TODO: is this right? see https://github.com/mikolalysenko/ao-shader/issues/2
  //gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  //gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.BLEND)
  // premultiply alpha when loading textures, so can use gl.ONE blending, see http://stackoverflow.com/questions/11521035/blending-with-html-background-in-webgl
  // TODO: move to gl-texture2d?
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)

  //Lookup voxel materials for terrain generation
  var registry = plugins.get('voxel-registry')
  if (registry) {
    var terrainMaterials = {};
    for (var blockName in registry.blockName2Index) {
      var blockIndex = registry.blockName2Index[blockName];
      if (registry.getProp(blockName, 'transparent')) {
        terrainMaterials[blockName] = blockIndex - 1
      } else {
        terrainMaterials[blockName] = OPAQUE|(blockIndex - 1) // TODO: separate arrays? https://github.com/mikolalysenko/ao-mesher/issues/2
      }
    }
  } else {
    console.warn('voxel-registry plugin not found, expect no textures')
  }

  //Create texture atlas
  var stitcher = game.plugins.get('voxel-stitch')
  if (stitcher) {
    var updateTexture = function() {
      console.log('updateTexture() calling createGLTexture()')

      stitcher.createGLTexture(gl, function(err, tex) {
        if (err) throw new Error('stitcher createGLTexture error: ' + err)
        stitcher.texture = tex // TODO: fix this awkward roundaboutness. voxel-shader uses this
      })

      // the voxels!
      var mesh = createVoxelMesh(shell.gl, createTerrain(terrainMaterials), stitcher.voxelSideTextureIDs, stitcher.voxelSideTextureSizes)
      shell.meshes = [mesh] // for voxel-wireframe TODO: refactor
      var c = mesh.center
      camera.lookAt([c[0]+mesh.radius*2, c[1], c[2]], c, [0,1,0])
    }
    stitcher.on('updateTexture', updateTexture)
    stitcher.stitch()
  } else {
    console.warn('voxel-stitch plugin not found, expect no textures')
  }
})

shell.on("gl-error", function(err) {
  var a = document.createElement('a')
  a.textContent = 'You need a modern WebGL browser (Chrome/Firefox) to play this game. Click here for more information. (WebGL error: ' + err + ')'
  a.style.webkitUserSelect = ''
  a.href = 'http://get.webgl.org/';

  while(document.body.firstChild) document.body.removeChild(document.body.firstChild)

  document.body.appendChild(a)
})

  return shell // TODO: fix indenting
}

module.exports = main

