var voxel = require('voxel')

var createGame = require('../lib/game')

var game = createGame({
  chunkSize: 32,
  chunks: 32,
  generateVoxel: voxel.generator['Hilly Terrain']
})
game.appendTo('#container')

game.on('mousedown', function (pos) {
  game.setBlock(pos, erase ? 0 : 1)
})

var erase = true
window.addEventListener('keydown', function (ev) {
  if (ev.keyCode === 'X'.charCodeAt(0)) {
    erase = !erase
  }
})

document.body.addEventListener('click', function() {
  game.requestPointerLock()
})
