var createGame = require('../lib/game')
var THREE = require('three')
var voxel = require('voxel')
var toolbar = require('toolbar')
window.blockSelector = toolbar({el: '#tools'})

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
  materials: ['grass', 'brick', 'dirt', 'obsidian', 'crate'],
  cubeSize: 25,
  chunkSize: 32,
  chunkDistance: 2,
  startingPosition: new THREE.Vector3(35, 1024, 35),
  worldOrigin: new THREE.Vector3(0,0,0),
  controlOptions: {jump: 6},
  renderCallback: function() {
    // game.controls.gravityEnabled = false
  }
})

var currentMaterial = 1

blockSelector.on('select', function(material) {
  var idx = game.materials.indexOf(material)
  if (idx > -1) currentMaterial = idx + 1
})

game.appendTo('#container')

game.on('mousedown', function (pos) {
  var cid = game.voxels.chunkAtPosition(pos)
  var vid = game.voxels.voxelAtPosition(pos)
  if (erase) {
    game.setBlock(pos, 0)
  } else {
    game.createBlock(pos, currentMaterial)
  }
})

var erase = true
window.addEventListener('keydown', function (ev) {
  if (ev.keyCode === 'X'.charCodeAt(0)) {
    erase = !erase
  }
  ctrlDown = ev.ctrlKey
})

function ctrlToggle (ev) { erase = !ev.ctrlKey }
window.addEventListener('keyup', ctrlToggle)
window.addEventListener('keydown', ctrlToggle)

game.requestPointerLock('canvas')
