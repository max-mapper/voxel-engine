var test = require('tape')
var createEngine = require('./')

// # Setup/util fucntions

test('create, destroy', function (t) {
  t.plan(1)
  var game = createEngine()
  t.equal(!!game, true)
  game.destroy()
})

function gameTest(fn) {
  test(fn.name, function (t) {
    t.plan(1)
    var game = createEngine()
    fn(game, t)
    game.destroy()
  })
}

function dummyItem(THREE) {
  var geometry = new THREE.SphereGeometry( 5, 10, 10 )
  var material = new THREE.MeshPhongMaterial( { color: 0xffffff, shading: THREE.FlatShading } )
  var mesh = new THREE.Mesh( geometry, material )
  return mesh
}

// # Tests

gameTest(function addItem(game, t) {
  var item = { tick: true }
  game.addItem(item)
  t.equal(game.items.length, 1)
})

gameTest(function removeItem(game, t) {
  var item = { tick: true }
  game.addItem(item)
  game.removeItem(item)
  t.equal(game.items.length, 0)
})

gameTest(function getBlock(game, t) {
  t.equal(game.getBlock({ x: 50, y: 50, z: 50}), 0)
})

gameTest(function setBlock(game, t) {
  game.setBlock({ x: 50, y: 50, z: 50}, 1)
  t.equal(game.getBlock({ x: 50, y: 50, z: 50}), 1)
})

gameTest(function createBlock(game, t) {
  var pos = new game.THREE.Vector3(50, 50, 50)
  var inTheWay = { mesh: dummyItem(game.THREE), size: 5, blocksCreation: true }
  inTheWay.mesh.position.copy(pos)
  game.addItem(inTheWay)
  t.equal(!!game.createBlock(pos), false)
})

gameTest(function blocksCreation(game, t) {
  var pos = new game.THREE.Vector3(50, 50, 50)
  var inTheWay = { mesh: dummyItem(game.THREE), size: 5, blocksCreation: false }
  inTheWay.mesh.position.copy(pos)
  game.addItem(inTheWay)
  t.equal(game.createBlock(pos), true)
})

gameTest(function raycastVoxels(game, t) {
  var pos = new game.THREE.Vector3(50, 50, 50)
  game.setBlock(pos, 1)
  var start = new game.THREE.Vector3(50.5, 50.5, 50.5)
  var direction = new game.THREE.Vector3(0, -1, 0)
  var hit = game.raycast(start, direction, 10)
  t.equal(!!hit, true)
})

gameTest(function raycastVoxelsMiss(game, t) {
  var pos = new game.THREE.Vector3(50, 50, 50)
  game.setBlock(pos, 0)
  var start = new game.THREE.Vector3(50.5, 50.5, 50.5)
  var direction = new game.THREE.Vector3(0, -1, 0)
  var hit = game.raycast(start, direction, 10)
  t.equal(!!hit, false)
})
