var createGame = require('../lib/game')
var THREE = require('three')
var voxel = require('voxel')

window.game = createGame({
  generateVoxel: voxel.generator['Hilly Terrain'],
  texturePath: '/textures/',
  cubeSize: 25,
  chunkSize: 32,
  chunkDistance: 2,
  startingPosition: new THREE.Vector3(35, 1024, 35),
  worldOrigin: new THREE.Vector3(0,0,0)
})

game.appendTo('#container')

game.on('mousedown', function (pos) {
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
