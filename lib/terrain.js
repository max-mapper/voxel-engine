"use strict"

var ndarray = require("ndarray")
var fill = require("ndarray-fill")

// TODO: refactor with voxel-land
module.exports = function(game, opts) {
  return new TerrainPlugin(game, opts);
};
module.exports.pluginInfo = {
  loadAfter: ['voxel-registry', 'voxel-mesher']
};

function TerrainPlugin(game, opts) {
  this.shell = game.shell;

  this.registry = game.plugins.get('voxel-registry');
  if (!this.registry) throw new Error('lib/terrain requires voxel-registry plugin');

  this.mesher = game.plugins.get('voxel-mesher');
  if (!this.mesher) throw new Error('lib/terrain requires voxel-mesher plugin');

  this.enable();
};

TerrainPlugin.prototype.enable = function() {
  // once the game is about to initialize, gather all registered materials and build voxels
  // TODO: this doesn't really have to be done on gl-init, only when the blocks are ready. refactor with lib/blocks.js
  this.shell.on('gl-init', this.onInit = this.addVoxels.bind(this));
};

TerrainPlugin.prototype.disable = function() {
  this.shell.removeListener('gl-init', this.onInit);
};

// bit in voxel array to indicate voxel is opaque (transparent if not set)
var OPAQUE = 1<<15;

TerrainPlugin.prototype.addVoxels = function() {
  var terrainMaterials = {};
  for (var blockName in this.registry.blockName2Index) {
    var blockIndex = this.registry.blockName2Index[blockName];
    if (this.registry.getProp(blockName, 'transparent')) {
      terrainMaterials[blockName] = blockIndex - 1 // TODO: remove -1 offset? leave 0 as 'air' (unused) in texture arrays?
    } else {
      terrainMaterials[blockName] = OPAQUE|(blockIndex - 1) // TODO: separate arrays? https://github.com/mikolalysenko/ao-mesher/issues/2
    }
  }

  // add voxels
  this.mesher.addVoxelArray(createTerrain(terrainMaterials));
};

var createTerrain = function(materials) {
  var size = [33,33,33]
  var result = ndarray(new Int32Array(size[0]*size[1]*size[2]), size)
  //Fill ndarray with function
  fill(result, function(i,j,k) {
    //Terrain

    if (i===30 && j===30 && k===30) {
      // face texture test
      return materials.wool
    }

    if(i <=1 || i>=31 || j <= 1 || j >= 31 || k <= 1 || k >= 31) {
      return 0 // air
    }

    // tree
    if (i===7 && k===8 && 21<j && j<31) {
      return materials.logOak
    }
    var x = i - 7
    var y = j - 28
    var z = k - 8
    if (x*x + y*y + z*z < (Math.random()+1.0) * 5.0) {
      return materials.leavesOak
    }

    // glass structure
    x = i - 20
    y = j - 28
    z = k - 8
    if (x*x + y*y + z*z < 5.0) {
      return materials.glass
    }

    // lake
    x = i - 5
    y = j - 24
    z = k - 19
    if (x*x + y*y + z*z < 3.0) {
      return materials.water
    }

    // rolling hills
    var h0 = 3.0 * Math.sin(Math.PI * i / 12.0 - Math.PI * k * 0.1) + 22
    if(j > h0+1) {
      return 0 // air
    }
    // grassy surface with dirt
    if(h0 <= j) {
      return materials.grass
    }
    var h1 = 2.0 * Math.sin(Math.PI * i * 0.25 - Math.PI * k * 0.3) + 20
    if(h1 <= j) {
      return materials.dirt
    }

    // stone with ores
    if(4 < j) {
      return Math.random() < 0.1 ?
          materials.oreDiamond :
          materials.stone
    }
    return materials.lava
  })
  return result
};


