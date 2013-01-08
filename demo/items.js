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
game.addItem((function () {
  var mesh = new THREE.Mesh(
    new THREE.CubeGeometry(10,10,10),
    new THREE.MeshLambertMaterial({
      color: 0xffff00,
      ambient: 0xffff00
    })
  )
  mesh.translateY(550)
  mesh.translateX(50)
  mesh.translateZ(50)
  
  return {
    mesh: mesh,
    height: 10,
    width: 10,
    depth: 10
  }
})())

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
