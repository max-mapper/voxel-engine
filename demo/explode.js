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

var THREE = require('three')

function createDebris (pos) {
  var mesh = new THREE.Mesh(
    new THREE.CubeGeometry(2, 2, 2),
    new THREE.MeshLambertMaterial({
      color: 0xffff00,
      ambient: 0xffff00,
    })
  )
  mesh.translateX(pos.x)
  mesh.translateY(pos.y)
  mesh.translateZ(pos.z)
  
  return {
    mesh: mesh,
    size: 2
  }
}

function explode (pos, value) {
  for (var i = 0; i < 10; i++) {
    var item = createDebris(pos)
    item.velocity = {
      x: (Math.random() * 2 - 1) * 0.1,
      y: (Math.random() * 2 - 1) * 0.1,
      z: (Math.random() * 2 - 1) * 0.1,
    }
    game.addItem(item)
  }
}

game.on('mousedown', function (pos) {
  if (erase) {
    explode(pos, game.getBlock(pos))
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
