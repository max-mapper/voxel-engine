var createGame = require('../lib/game')
var THREE = require('three')

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

game.on('collision', function (item) {
  game.removeItem(item)
  var material = game.materials[item.value - 1]
  var label = document.querySelector('.block.' + material + ' .label')
  if (label) label.textContent = Number(label.textContent) + 1
})

function createDebris (pos, value) {
  var mesh = new THREE.Mesh(
    new THREE.CubeGeometry(4, 4, 4),
    game.material
  )
  mesh.geometry.faces.forEach(function (face) {
    face.materialIndex = value - 1
  })
  mesh.translateX(pos.x)
  mesh.translateY(pos.y)
  mesh.translateZ(pos.z)
  
  return {
    mesh: mesh,
    size: 4,
    collisionRadius: 22,
    value: value
  }
}

function explode (pos, value) {
  if (value === 0) return
  for (var i = 0; i < 4; i++) {
    var item = createDebris(pos, value)
    item.velocity = {
      x: (Math.random() * 2 - 1) * 0.05,
      y: (Math.random() * 2 - 1) * 0.05,
      z: (Math.random() * 2 - 1) * 0.05,
    }
    game.addItem(item)
    setTimeout(function (item) {
      game.removeItem(item)
    }, 15 * 1000 + Math.random() * 15 * 1000, item)
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
