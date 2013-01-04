var voxel = require('voxel')

var createGame = require('../lib/game')

var game = createGame({
  chunkSize: 32,
  chunks: 32,
  generateVoxel: voxel.generator['Hilly Terrain'],
  texturePath: './textures/'
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

document.body.addEventListener('click', function() {
  game.requestPointerLock()
})
