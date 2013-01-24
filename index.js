var createGame = require('voxel-engine')
var THREE = require('three')
var voxel = require('voxel')
var toolbar = require('toolbar')
var skin = require('minecraft-skin')
var debris = require('voxel-debris')
var blockSelector = toolbar({el: '#tools'})

var game = createGame({
  generate: voxel.generator['Valley'],
  startingPosition: [185, 100, 0]
})

window.game = game // for debugging

var container = document.querySelector('#container')

game.appendTo(container)

container.addEventListener('click', function() {
  game.requestPointerLock(container)
})

// rotate camera left so it points at the characters
game.controls.yawObject.rotation.y = 1.5

var maxogden = skin(game.THREE, 'maxogden.png').createPlayerObject()
maxogden.position.set(0, 62, 20)
game.scene.add(maxogden)

var substack = skin(game.THREE, 'substack.png').createPlayerObject()
substack.position.set(0, 62, -20)
game.scene.add(substack)

var currentMaterial = 1

blockSelector.on('select', function(material) {
  var idx = game.materials.indexOf(material)
  if (idx === -1) {
    for (var m = 0; m < game.materials.length; m++) {
      if (typeof game.materials[m] === 'object' && game.materials[m][0] === material) idx = m
    }
  }
  if (idx > -1) currentMaterial = idx + 1
})

var explode = debris(game, { power : 1.5, yield: 1 })

game.on('mousedown', function (pos) {
  if (erase) explode(pos)
  else game.createBlock(pos, currentMaterial)
})

var erase = true
window.addEventListener('keydown', function (ev) {
  if (ev.keyCode === 'X'.charCodeAt(0)) {
    erase = !erase
  }
})

function ctrlToggle (ev) { erase = !ev.ctrlKey }
window.addEventListener('keyup', ctrlToggle)
window.addEventListener('keydown', ctrlToggle)
