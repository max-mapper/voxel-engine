var createGame = require('voxel-engine')
var toolbar = require('toolbar')
var highlight = require('voxel-highlight')
var toolbar = require('toolbar')
var player = require('voxel-player')
var toolbar = require('toolbar')
var skin = require('minecraft-skin')
var blockSelector = toolbar({el: '#tools'})
var voxel = require('voxel')

// setup the game and add some trees
var game = createGame({
  generate: voxel.generator['Valley'],
  chunkDistance: 2,
  materials: [
    ['grass', 'dirt', 'grass_dirt'],
    'obsidian',
    'brick',
    'grass',
    'plank'
  ],
  worldOrigin: [0, 0, 0],
  controls: { discreteFire: true }
})

window.game = game // for debugging

var container = document.querySelector('#container')

game.appendTo(container)

var maxogden = skin(game.THREE, 'maxogden.png')
window.maxogden = maxogden
maxogden.mesh.position.set(0, 2, -2)
maxogden.head.rotation.y = 1.5
maxogden.mesh.rotation.y = Math.PI
maxogden.mesh.scale.set(0.04, 0.04, 0.04)
game.scene.add(maxogden.mesh)

var substack = skin(game.THREE, 'substack.png')
substack.mesh.position.set(0, 2, 2)
substack.head.rotation.y = Math.PI/2
substack.mesh.scale.set(0.04, 0.04, 0.04)
game.scene.add(substack.mesh)

// create the player from a minecraft skin file and tell the
// game to use it as the main player
var createPlayer = player(game)
var substack = createPlayer('substack.png')
substack.possess()
substack.yaw.position.set(2, 2, 4)

// highlight blocks when you look at them
var highlighter = highlight(game)

// toggle between first and third person modes
window.addEventListener('keydown', function (ev) {
  if (ev.keyCode === 'R'.charCodeAt(0)) substack.toggle()
})

// block interaction stuff
var currentMaterial = 1

blockSelector.on('select', function(material) {
  material = +material // cast to int
  if (material > -1) currentMaterial = material
  else currentMaterial = 1
})

game.on('fire', function(target, state) {
  var point = game.raycast()
  if (!point) return
  var erase = !state.firealt && !state.alt
  if (erase) {
    game.setBlock(point.position, 0)
  } else {
    game.createBlock(point.adjacent, currentMaterial)
  }
})
