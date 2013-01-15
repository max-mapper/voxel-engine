var createGame = require('../lib/game')
var THREE = require('three')
var voxel = require('voxel')
var toolbar = require('toolbar')
window.blockSelector = toolbar({el: '#tools'})
var skin = require('minecraft-skin')


var generator = function(low, high, x, y, z) {
  var chunkIndex = [x, y, z].join('|')
  var chunk = this.chunks[chunkIndex]
  var voxels
  if (chunk) voxels = chunk.voxels
  return voxel.generate(low, high, function(vx, vy, vz, n) {
    if (voxels) return voxels[n]
    return voxel.generator['Valley'](vx, vy, vz)
  })
}

window.game = createGame({
  generateVoxelChunk: generator,
  texturePath: '/textures/',
  materials: ['grass', 'brick', 'dirt', 'obsidian', 'crate'],
  cubeSize: 25,
  chunkSize: 32,
  chunkDistance: 2,
  startingPosition: [35, 100, 35],
  worldOrigin: [0,0,0],
  controlOptions: {jump: 6}
})

window.viking = skin(game.THREE, 'viking.png').createPlayerObject()
viking.position.y = 60
game.scene.add(viking)
var currentMaterial = 1

blockSelector.on('select', function(material) {
  var idx = game.materials.indexOf(material)
  if (idx > -1) currentMaterial = idx + 1
})

game.on('collision', function (item) {
  incrementBlockTally()
  game.removeItem(item)
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
  if (!value) return
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

game.appendTo('#container')

var tally = document.querySelector('.tally .count')
function incrementBlockTally() {
  var c = +tally.innerText
  ++c
  tally.innerText = c
}

game.on('mousedown', function (pos) {
  var cid = game.voxels.chunkAtPosition(pos)
  var vid = game.voxels.voxelAtPosition(pos)
  if (erase) {
    explode(pos, game.getBlock(pos))
    game.setBlock(pos, 0)
  } else {
    game.createBlock(pos, currentMaterial)
  }
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

var container = document.querySelector('#container')
container.addEventListener('click', function() {
  game.requestPointerLock(container)
})
