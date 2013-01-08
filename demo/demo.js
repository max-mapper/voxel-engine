var createGame = require('../lib/game')
var THREE = require('three')
var voxel = require('voxel')

var generator = function(low, high, x, y, z) {
  var chunkIndex = [x, y, z].join('|')
  var chunk = this.chunks[chunkIndex]
  var voxels
  if (chunk) voxels = chunk.voxels
  return voxel.generate(low, high, function(vx, vy, vz, n) {
    if (voxels) return voxels[n]
    return voxel.generator['Valley'](vx, vy, vz)
  })
}

window.game = createGame({
  generateVoxelChunk: generator,
  texturePath: '/textures/',
  materials: ['grass'],
  cubeSize: 25,
  chunkSize: 32,
  chunkDistance: 2,
  startingPosition: new THREE.Vector3(35, 1024, 35),
  worldOrigin: new THREE.Vector3(0,0,0),
  renderCallback: function() {
    // game.controls.gravityEnabled = false
  }
})

game.appendTo('#container')

game.on('mousedown', function (pos) {
  var cid = game.voxels.chunkAtPosition(pos)
  var vid = game.voxels.voxelAtPosition(pos)
  if (erase) {
    game.setBlock(pos, 0)
  } else {
    game.createBlock(pos, 1)
  }
})

var erase = true
window.addEventListener('keydown', function (ev) {
  if (ev.keyCode === 'X'.charCodeAt(0)) {
    erase = !erase
  }
})

game.requestPointerLock('#container')
