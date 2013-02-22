var voxel = require('voxel')
var voxelMesh = require('voxel-mesh')
var voxelChunks = require('voxel-chunks')
var ray = require('voxel-raycast')
var texture = require('voxel-texture')
var control = require('voxel-control')
var THREE = require('three')
var Stats = require('./lib/stats')
var Detector = require('./lib/detector')
var inherits = require('inherits')
var path = require('path')
var EventEmitter = require('events').EventEmitter
if (process.browser) var interact = require('interact')
var requestAnimationFrame = require('raf')
var collisions = require('collide-3d-tilemap')
var aabb = require('aabb-3d')
var SpatialEventEmitter = require('spatial-events')
var regionChange = require('voxel-region-change')
var kb = require('kb-controls')
var physical = require('voxel-physical')
var pin = require('pin-it')

var temporaryPosition = new THREE.Vector3
var temporaryVector = new THREE.Vector3

module.exports = Game

function Game(opts) {
  if (!(this instanceof Game)) return new Game(opts)
  var self = this
  if (!opts) opts = {}
  if (process.browser && this.notCapable()) return
  
  if (!('generateChunks' in opts)) opts.generateChunks = true
  this.generateChunks = opts.generateChunks
  this.axes = ['x', 'y', 'z']
  this.setConfigurablePositions(opts)
  this.configureChunkLoading(opts)
  this.THREE = THREE
  this.cubeSize = 1
  this.chunkSize = opts.chunkSize || 32
  
  // chunkDistance and removeDistance should not be set to the same thing
  // as it causes lag when you go back and forth on a chunk boundary
  this.chunkDistance = opts.chunkDistance || 2
  this.removeDistance = opts.removeDistance || this.chunkDistance + 1
  
  this.playerHeight = opts.playerHeight || 1.62 // gets multiplied by cubeSize
  this.meshType = opts.meshType || 'surfaceMesh'
  this.mesher = opts.mesher || voxel.meshers.greedy
  this.materialType = opts.materialType || THREE.MeshLambertMaterial
  this.materialParams = opts.materialParams || {}
  this.items = []
  this.voxels = voxel(this)
  this.chunkGroups = voxelChunks(this)
  this.height = typeof window === "undefined" ? 1 : window.innerHeight
  this.width = typeof window === "undefined" ? 1 : window.innerWidth
  this.scene = new THREE.Scene()
  this.camera = this.createCamera(this.scene)
  if (!opts.lightsDisabled) this.addLights(this.scene)
  this.skyColor = opts.skyColor || 0xBFD1E5
  this.fogScale = opts.fogScale || 1
  
  this.collideVoxels = collisions(
    this.getTileAtIJK.bind(this),
    this.cubeSize,
    [Infinity, Infinity, Infinity],
    [-Infinity, -Infinity, -Infinity]
  )
  
  this.timer = this.initializeTimer((opts.tickFPS || 16))
  this.paused = false

  this.spatial = new SpatialEventEmitter
  this.region = regionChange(this.spatial, aabb([0, 0, 0], [this.cubeSize, this.cubeSize, this.cubeSize]), this.chunkSize)
  this.voxelRegion = regionChange(this.spatial, this.cubeSize)
  this.chunkRegion = regionChange(this.spatial, this.cubeSize * this.chunkSize)

  // contains chunks that has had an update this tick. Will be generated right before redrawing the frame
  this.chunksNeedsUpdate = {}

  this.materials = texture({
    THREE: THREE,
    texturePath: opts.texturePath || './textures/',
    materialType: opts.materialType || THREE.MeshLambertMaterial,
    materialParams: opts.materialParams || {}
  })

  this.materialNames = opts.materials || [['grass', 'dirt', 'grass_dirt'], 'brick', 'dirt']

  if (process.browser) this.materials.load(this.materialNames)

  if (this.generateChunks) this.handleChunkGeneration()

  // client side only after this point
  if (!process.browser) return
  
  this.paused = true
  this.initializeRendering()
  
  for (var chunkIndex in this.voxels.chunks) this.showChunk(this.voxels.chunks[chunkIndex])

  this.initializeControls(opts)
}

inherits(Game, EventEmitter)

// # External API

Game.prototype.cameraPosition = function() {
  temporaryPosition.multiplyScalar(0)
  this.camera.matrixWorld.multiplyVector3(temporaryPosition)
  return temporaryPosition
}

Game.prototype.cameraVector = function() {
  temporaryVector.multiplyScalar(0)
  temporaryVector.z = -1 // forward
  this.camera.matrixWorld.multiplyVector3(temporaryVector)
  temporaryVector.subSelf(this.cameraPosition()).normalize()
  return temporaryVector
}

Game.prototype.makePhysical = function(target, envelope, blocksCreation) {
  var obj = physical(target, this.potentialCollisionSet(), envelope || new THREE.Vector3(
    this.cubeSize / 2, this.cubeSize * 1.5, this.cubeSize / 2
  ))
  obj.blocksCreation = !!blocksCreation
  return obj
}

Game.prototype.addItem = function(item) {
  if (!item.tick) {
    var newItem = physical(
      item.mesh,
      this.potentialCollisionSet.bind(this),
      new THREE.Vector3(item.size, item.size, item.size)
    )

    if (item.velocity) {
      newItem.velocity.copy(item.velocity)
      newItem.subjectTo(this.gravity)
    }

    newItem.repr = function() { return 'debris' }
    newItem.mesh = item.mesh

    item = newItem
  }

  this.items.push(item)
  if (item.mesh) this.scene.add(item.mesh)
}

Game.prototype.removeItem = function(item) {
  var ix = this.items.indexOf(item)
  if (ix < 0) return
  this.items.splice(ix, 1)
  if (item.mesh) this.scene.remove(item.mesh)
}

// only intersects voxels, not items
Game.prototype.raycast = // backwards compat
Game.prototype.raycastVoxels = function(start, direction, maxDistance) {
  if (!start) return this.raycast(this.cameraPosition(), this.cameraVector(), 10)

  var hitNormal = new Array(3)
  var hitPosition = new Array(3)
  var cp = this.cameraPosition()
  var cv = this.cameraVector()
  var hitBlock = ray(this, [cp.x, cp.y, cp.z], [cv.x, cv.y, cv.z], maxDistance || 10.0, hitPosition, hitNormal)
  if (hitBlock === -1) return false
  
  var point = new THREE.Vector3(hitPosition[0], hitPosition[1], hitPosition[2])
  point.direction = direction
  point.hitNormal = hitNormal
  point.hitValue = hitBlock
  return point
}

Game.prototype.checkBlock = function(pos) {
  var floored = pos.clone()
  var bbox
  floored.x = Math.floor(floored.x)
  floored.y = Math.floor(floored.y)
  floored.z = Math.floor(floored.z)
  
  bbox = aabb([floored.x, floored.y, floored.z], [1, 1, 1])

  for (var i = 0, len = this.items.length; i < len; ++i) {
    var item = this.items[i]
    var itemInTheWay = item.blocksCreation && item.aabb && bbox.intersects(item.aabb())
    if (itemInTheWay) return
  }

  var chunkKeyArr = this.voxels.chunkAtPosition(pos)
  var chunkKey = chunkKeyArr.join('|')
  var chunk = this.voxels.chunks[chunkKey]

  if (!chunk) return

  var chunkPosition = this.chunkspaceToTilespace(chunk.position)
  var voxelPosition = new THREE.Vector3(
    floored.x - chunkPosition.i,
    floored.y - chunkPosition.j,
    floored.z - chunkPosition.k
  )

  return {chunkIndex: chunkKey, voxelVector: voxelPosition}
}

Game.prototype.createBlock = function(pos, val) {
  if (pos.chunkMatrix) return this.chunkGroups.createBlock(pos, val)
  var newBlock = this.checkBlock(pos)
  if (!newBlock) return
  var chunk = this.voxels.chunks[newBlock.chunkIndex]
  var old = chunk.voxels[this.voxels.voxelIndex(newBlock.voxelVector)]
  chunk.voxels[this.voxels.voxelIndex(newBlock.voxelVector)] = val
  this.addChunkToNextUpdate(chunk)
  this.spatial.emit('change-block', [pos.x, pos.y, pos.z], pos, old, val)
  return true
}

Game.prototype.setBlock = function(x, y, z, val) {
  var pos
  if (typeof x === 'object') {
    pos = x
    val = y
  } else {
    pos = new this.THREE.Vector3(x, y, z)
  }
  if (pos.chunkMatrix) return this.chunkGroups.setBlock(pos, val)
  var hitVoxel = this.voxels.voxelAtPosition(pos, val)
  var c = this.voxels.chunkAtPosition(pos)
  this.addChunkToNextUpdate(this.voxels.chunks[c.join('|')])
  this.spatial.emit('change-block', [pos.x, pos.y, pos.z], pos, hitVoxel, val)
}

Game.prototype.getBlock = function(x, y, z) {
  var pos
  if (typeof x === 'object') pos = x
  else pos = new this.THREE.Vector3(x, y, z)
  if (pos.chunkMatrix) return this.chunkGroups.getBlock(pos)
  return this.voxels.voxelAtPosition(pos)
}

Game.prototype.appendTo = function (element) {
  if (typeof element === 'object') element.appendChild(this.element)
  else document.querySelector(element).appendChild(this.element)
}

// # Defaults/options parsing

Game.prototype.gravity = new THREE.Vector3(0, -0.0000036, 0)

Game.prototype.defaultButtons = {
  'W': 'forward'
, 'A': 'left'
, 'S': 'backward'
, 'D': 'right'
, '<mouse 1>': 'fire'
, '<mouse 2>': 'firealt'
, '<space>': 'jump'
, '<control>': 'alt'
}

Game.prototype.parseVectorOption = function(vector) {
  if (!vector) return
  if (vector.length && typeof vector.length === 'number') return new THREE.Vector3(vector[0], vector[1], vector[2])
  if (typeof vector === 'object') return new THREE.Vector3(vector.x, vector.y, vector.z)
}

Game.prototype.setConfigurablePositions = function(opts) {
  var sp = opts.startingPosition
  if (sp) sp = this.parseVectorOption(sp)
  this.startingPosition = sp || new THREE.Vector3(35,1024,35)
  var wo = opts.worldOrigin
  if (wo) wo = this.parseVectorOption(wo)
  this.worldOrigin = wo || new THREE.Vector3(0,0,0)
}

Game.prototype.notCapable = function() {
  if( !Detector().webgl ) {
    var wrapper = document.createElement('div')
    wrapper.className = "errorMessage"
    var a = document.createElement('a')
    a.title = "You need WebGL and Pointer Lock (Chrome 23/Firefox 14) to play this game. Click here for more information."
    a.innerHTML = a.title
    a.href = "http://get.webgl.org"
    wrapper.appendChild(a)
    this.element = wrapper
    return true
  }
  return false
}

Game.prototype.onWindowResize = function() {
  this.camera.aspect = window.innerWidth / window.innerHeight
  this.camera.updateProjectionMatrix()
  this.renderer.setSize(window.innerWidth, window.innerHeight)
}

// # Physics/collision related methods

Game.prototype.control = function(target) {
  this.controlling = target
  return this.controls.target(target)
}

Game.prototype.potentialCollisionSet = function() {
  return [{ collide: this.collideTerrain.bind(this) }]
}

Game.prototype.playerAABB = function(position) {
  var pos = position || this.controls.target().avatar.position
  var size = this.cubeSize

  var bbox = aabb([
    pos.x - size / 4,
    pos.y - size * this.playerHeight,
    pos.z - size / 4
  ], [
    size / 2,
    size * this.playerHeight,
    size / 2
  ])
  return bbox
}

Game.prototype.collideTerrain = function(other, bbox, vec, resting) {
  var spatial = this.spatial
  var vec3 = [vec.x, vec.y, vec.z]

  var i = 0
  var self = this
  var axes = this.axes

  this.collideVoxels(bbox, vec3, function hit(axis, tile, coords, dir, edge) {
    if (!tile) return
    if (Math.abs(vec3[axis]) < Math.abs(edge)) return
    vec3[axis] = vec[axes[axis]] = edge
    other.acceleration[axes[axis]] = 0
    resting[axes[axis]] = dir
    other.friction[axes[(axis + 1) % 3]] = other.friction[axes[(axis + 2) % 3]] = axis === 1 ? 0.5 : 1
    return true
  })
}

// # Three.js specific methods

Game.prototype.createCamera = function() {
  var camera
  camera = new THREE.PerspectiveCamera(60, this.width / this.height, 1, 10000)
  camera.lookAt(new THREE.Vector3(0, 0, 0))
  this.scene.add(camera)
  return camera
}

Game.prototype.createRenderer = function() {
  this.renderer = new THREE.WebGLRenderer({ antialias: true })
  this.renderer.setSize(this.width, this.height)
  this.renderer.setClearColorHex(this.skyColor, 1.0)
  this.renderer.clear()
  this.element = this.renderer.domElement
  return this.renderer
}

Game.prototype.addStats = function() {
  stats = new Stats()
  stats.domElement.style.position  = 'absolute'
  stats.domElement.style.bottom  = '0px'
  document.body.appendChild( stats.domElement )
}

Game.prototype.addLights = function(scene) {
  var ambientLight, directionalLight
  ambientLight = new THREE.AmbientLight(0xcccccc)
  scene.add(ambientLight)
  var light	= new THREE.DirectionalLight( 0xffffff , 1)
  light.position.set( 1, 1, 0.5 ).normalize()
  scene.add( light )
}

// # Chunk related methods

Game.prototype.configureChunkLoading = function(opts) {
  var self = this
  if (!opts.generateChunks) return
  if (!opts.generate) {
    this.generate = function(x,y,z) {
      return x*x+y*y+z*z <= 15*15 ? 1 : 0 // sphere world
    }
  } else {
    this.generate = opts.generate
  }
  if (opts.generateVoxelChunk) {
    this.generateVoxelChunk = opts.generateVoxelChunk
  } else {
    this.generateVoxelChunk = function(low, high) {
      return voxel.generate(low, high, self.generate, self)
    }
  }
}

Game.prototype.worldWidth = function() {
  return this.chunkSize * 2 * this.chunkDistance * this.cubeSize
}

Game.prototype.getTileAtIJK = function(i, j, k) {
  var pos = this.tilespaceToWorldspace(i, j, k)
  // TODO: @chrisdickinson: cache the chunk lookup by `i|j|k`
  // since we'll be seeing the same chunk so often
  var chunk = this.getChunkAtPosition(pos)

  if(!chunk) {
    return
  }

  var chunkPosition = this.chunkspaceToTilespace(chunk.position)
  var chunkID = this.voxels.chunkAtPosition(pos).join('|')
  var chunk = this.voxels.chunks[chunkID]
  
  i -= chunkPosition.i
  j -= chunkPosition.j
  k -= chunkPosition.k

  var tileOffset =
    i +
    j * this.chunkSize +
    k * this.chunkSize * this.chunkSize

  return chunk.voxels[tileOffset]
}

Game.prototype.tilespaceToWorldspace = function(i, j, k) {
  return {
    x: i * this.cubeSize,
    y: j * this.cubeSize,
    z: k * this.cubeSize
  }
}

Game.prototype.worldspaceToTilespace = function(pos) {
  return {
    i: Math.floor(pos.x / this.cubeSize),
    j: Math.floor(pos.y / this.cubeSize),
    k: Math.floor(pos.z / this.cubeSize)
  }
}

Game.prototype.chunkspaceToTilespace = function(pos) {
  return {
    i: pos[0] * this.chunkSize,
    j: pos[1] * this.chunkSize,
    k: pos[2] * this.chunkSize
  }
}

Game.prototype.removeFarChunks = function(playerPosition) {
  var self = this
  playerPosition = playerPosition || this.controls.target().avatar.position
  var nearbyChunks = this.voxels.nearbyChunks(playerPosition, this.removeDistance).map(function(chunkPos) {
    return chunkPos.join('|')
  })
  Object.keys(self.voxels.chunks).map(function(chunkIndex) {
    if (nearbyChunks.indexOf(chunkIndex) > -1) return
    var chunk = self.voxels.meshes[chunkIndex]

    self.scene.remove(chunk[self.meshType])
    chunk[self.meshType].geometry.dispose()

    delete chunk.data
    delete chunk.geometry
    delete chunk.meshed
    delete chunk.surfaceMesh
    delete self.voxels.chunks[chunkIndex]
  })
  self.voxels.requestMissingChunks(playerPosition)
}

Game.prototype.addChunkToNextUpdate = function(chunk) {
  this.chunksNeedsUpdate[chunk.position.join('|')] = chunk
}

Game.prototype.updateDirtyChunks = function() {
  var self = this
  Object.keys(this.chunksNeedsUpdate).forEach(function showChunkAtIndex(chunkIndex) {
    var chunk = self.chunksNeedsUpdate[chunkIndex]
    self.showChunk(chunk)
  })
  this.chunksNeedsUpdate = {}
}

Game.prototype.getChunkAtPosition = function(pos) {
  var chunkID = this.voxels.chunkAtPosition(pos).join('|')
  var chunk = this.voxels.chunks[chunkID]
  return chunk
}

Game.prototype.showChunk = function(chunk) {
  var chunkIndex = chunk.position.join('|')
  var bounds = this.voxels.getBounds.apply(this.voxels, chunk.position)
  var cubeSize = this.cubeSize
  var scale = new THREE.Vector3(cubeSize, cubeSize, cubeSize)
  var mesh = voxelMesh(chunk, this.mesher, scale)
  this.voxels.chunks[chunkIndex] = chunk
  if (this.voxels.meshes[chunkIndex]) this.scene.remove(this.voxels.meshes[chunkIndex][this.meshType])
  this.voxels.meshes[chunkIndex] = mesh
  if (this.meshType === 'wireMesh') mesh.createWireMesh()
  else mesh.createSurfaceMesh(new THREE.MeshFaceMaterial(this.materials.get()))
  mesh.setPosition(bounds[0][0] * cubeSize, bounds[0][1] * cubeSize, bounds[0][2] * cubeSize)
  mesh.addToScene(this.scene)
  this.materials.paint(mesh.geometry)
  return mesh
}

// # Debugging methods

Game.prototype.addMarker = function(position) {
  var geometry = new THREE.SphereGeometry( 0.5, 10, 10 )
  var material = new THREE.MeshPhongMaterial( { color: 0xffffff, shading: THREE.FlatShading } )
  var mesh = new THREE.Mesh( geometry, material )
  mesh.position.copy(position)
  this.scene.add(mesh)
}

Game.prototype.addAABBMarker = function(aabb, color) {
  var geometry = new THREE.CubeGeometry(aabb.width(), aabb.height(), aabb.depth())
  var material = new THREE.MeshBasicMaterial({ color: color || 0xffffff, wireframe: true, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
  var mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(aabb.x0() + aabb.width() / 2, aabb.y0() + aabb.height() / 2, aabb.z0() + aabb.depth() / 2)
  this.scene.add(mesh)
  return mesh
}

Game.prototype.addVoxelMarker = function(i, j, k, color) {
  var pos = this.tilespaceToWorldspace(i, j, k)
  var bbox = aabb([pos.x, pos.y, pos.z], [this.cubeSize, this.cubeSize, this.cubeSize])
  return this.addAABBMarker(bbox, color)
}

Game.prototype.pin = pin

// # Misc internal methods

Game.prototype.onControlChange = function(gained, stream) {
  this.paused = false

  if (!gained && !this.optout) {
    this.buttons.disable()
    return
  }

  this.buttons.enable()
  stream.pipe(this.controls.createWriteRotationStream())
}

Game.prototype.onControlOptOut = function() {
  this.optout = true
}

Game.prototype.onFire = function(state) {
  this.emit('fire', this.controlling, state)
}

Game.prototype.tick = function(delta) {
  for(var i = 0, len = this.items.length; i < len; ++i) {
    this.items[i].tick(delta)
  }

  if (this.materials) this.materials.tick()

  if (Object.keys(this.chunksNeedsUpdate).length > 0) this.updateDirtyChunks()

  var target = this.controls.target()

  if (target) {
    target = target.avatar
    this.spatial.emit('position', [target.position.x, target.position.y, target.position.z], target.position)
  }

  this.emit('tick', delta)
}

Game.prototype.render = function(delta) {
  this.renderer.render(this.scene, this.camera)
}

Game.prototype.initializeTimer = function(rate) {
  var self = this
  var accum = 0
  var now = 0
  var last = null
  var dt = 0
  var wholeTick

  self.frameUpdated = true
  return self.interval = setInterval(timer, 0)
  
  function timer() {
    if (self.paused) {
      last = Date.now()
      accum = 0
      return
    }
    now = Date.now()
    dt = now - last
    last = now
    accum += dt
    if (accum < rate) return

    wholeTick = ((accum / rate)|0)

    if (wholeTick <= 0) return

    wholeTick *= rate

    self.tick(wholeTick)
    accum -= wholeTick

    self.frameUpdated = true
  }
}

Game.prototype.initializeRendering = function() {
  var self = this

  self.renderer = self.createRenderer()
  if (!self.statsDisabled) self.addStats()

  window.addEventListener('resize', self.onWindowResize.bind(self), false)

  requestAnimationFrame(window).on('data', function(dt) {
    self.render(dt)
    stats.update()
  })

  self.chunkRegion.on('change', function(newChunk) {
    self.removeFarChunks()
  })
}

Game.prototype.initializeControls = function(opts) {
  // player control
  this.buttons = kb(document.body, opts.keybindings || this.defaultButtons)
  this.buttons.disable()
  this.optout = false
  this.interact = interact(this.element)
  this.interact
      .on('attain', this.onControlChange.bind(this, true))
      .on('release', this.onControlChange.bind(this, false))
      .on('opt-out', this.onControlOptOut.bind(this))

  opts.controls = opts.controls || {}
  opts.controls.onfire = this.onFire.bind(this)
  this.controls = control(this.buttons, opts.controls)
  this.items.push(this.controls)
  this.controlling = null
}

Game.prototype.handleChunkGeneration = function() {
  var self = this
  this.voxels.on('missingChunk', function(chunkPos) {
    var chunk = self.voxels.generateChunk(chunkPos[0], chunkPos[1], chunkPos[2])
    if (process.browser) self.showChunk(chunk)
  })
  this.voxels.requestMissingChunks(this.worldOrigin)
}
