var voxel = require('voxel')

var createGame = require('../lib/game')

var game = createGame({
  chunkSize: 32,
  chunks: 32,
  generateVoxel: voxel.generator['Hilly Terrain']
})
game.appendTo('#container')

document.body.addEventListener('click', function() {
  game.requestPointerLock()
})
