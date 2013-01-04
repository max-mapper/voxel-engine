var voxel = require('voxel')

var createGame = require('../lib/game')

var game = createGame({
  chunkSize: 32,
  chunks: 32,
  generateVoxel: voxel.generator['Hilly Terrain']
})

document.addEventListener('DOMContentLoaded', function() {
  document.body.addEventListener('click', function() {
    game.requestPointerLock()
  })
})
