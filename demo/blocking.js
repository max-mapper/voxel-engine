var voxel = require('voxel')
var terrain = voxel.generator['Hilly Terrain']

var createGame = require('../lib/game')

var game = createGame({
  chunkSize: 32,
  chunks: 32,
  generateVoxel: terrain.getVoxel.bind(terrain)
})

document.addEventListener('DOMContentLoaded', function() {
  document.body.addEventListener('click', function() {
    game.requestPointerLock()
  })
})
