var createGame = require('../lib/game')

var game = createGame({
  generate: function(x, y, z) {
    var key = x + '|' + y + '|' + z
    var d = Math.sqrt(x*x + y*y + z*z)
    if (d > 20) return 0
    return Math.floor(Math.random() * 4) + 1
  },
  materials: [ 'dirt', 'grass', 'crate', 'brick' ]
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
