var voxel = require('voxel')
var voxelMesh = require('voxel-mesh')
var ray = require('voxel-raycast')
var texture = require('voxel-texture')
var control = require('voxel-control')
var voxelView = require('voxel-view')
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
var glMatrix = require('gl-matrix')
var vector = glMatrix.vec3
var SpatialEventEmitter = require('spatial-events')
var regionChange = require('voxel-region-change')
var kb = require('kb-controls')
var physical = require('voxel-physical')
var pin = require('pin-it')
var tic = require('tic')()

module.exports = Game

function Game(opts) {
  if (!(this instanceof Game)) return new Game(opts)
  var self = this
  if (!opts) opts = {}
  if (process.browser && this.notCapable(opts)) return
  
  if (!('generateChunks' in opts)) opts.generateChunks = true
  this.generateChunks = opts.generateChunks
  this.setConfigurablePositions(opts)
  this.configureChunkLoading(opts)
  this.setDimensions(opts)
  this.THREE = THREE
  this.vector = vector
  this.glMatrix = glMatrix
  this.arrayType = opts.arrayType || Uint8Array
  this.cubeSize = 1 // backwards compat
  this.chunkSize = opts.chunkSize || 32
  
  // chunkDistance and removeDistance should not be set to the same thing
  // as it causes lag when you go back and forth on a chunk boundary
  this.chunkDistance = opts.chunkDistance || 2
  this.removeDistance = opts.removeDistance || this.chunkDistance + 1
  
  this.playerHeight = opts.playerHeight || 1.62
  this.meshType = opts.meshType || 'surfaceMesh'
  this.mesher = opts.mesher || voxel.meshers.culled
  this.materialType = opts.materialType || THREE.MeshLambertMaterial
  this.materialParams = opts.materialParams || {}
  this.items = []
  this.voxels = voxel(this)
  this.scene = new THREE.Scene()
  this.view = opts.view || new voxelView(THREE, { width: this.width, height: this.height })
  this.view.bindToScene(this.scene)
  this.camera = this.view.getCamera()
  if (!opts.lightsDisabled) this.addLights(this.scene)
  
  this.skyColor = opts.skyColor || 0xBFD1E5
  this.fogScale = opts.fogScale || 32
  if (!opts.fogDisabled) this.scene.fog = new THREE.Fog( this.skyColor, 0.00025, this.worldWidth() * this.fogScale )
  
  this.collideVoxels = collisions(
    this.getBlock.bind(this),
    1,
    [Infinity, Infinity, Infinity],
    [-Infinity, -Infinity, -Infinity]
  )
  
  this.timer = this.initializeTimer((opts.tickFPS || 16))
  this.paused = false

  this.spatial = new SpatialEventEmitter
  this.region = regionChange(this.spatial, aabb([0, 0, 0], [1, 1, 1]), this.chunkSize)
  this.voxelRegion = regionChange(this.spatial, 1)
  this.chunkRegion = regionChange(this.spatial, this.chunkSize)
  this.asyncChunkGeneration = false

  // contains chunks that has had an update this tick. Will be generated right before redrawing the frame
  this.chunksNeedsUpdate = {}
  // contains new chunks yet to be generated. Handled by game.loadPendingChunks
  this.pendingChunks = []

  this.materials = texture({
    game: this,
    texturePath: opts.texturePath || './textures/',
    materialType: opts.materialType || THREE.MeshLambertMaterial,
    materialParams: opts.materialParams || {},
    materialFlatColor: opts.materialFlatColor === true
  })

  this.materialNames = opts.materials || [['grass', 'dirt', 'grass_dirt'], 'brick', 'dirt']
  
  self.chunkRegion.on('change', function(newChunk) {
    self.removeFarChunks()
  })

  if (process.browser) this.materials.load(this.materialNames)

  if (this.generateChunks) this.handleChunkGeneration()

  // client side only after this point
  if (!process.browser) return
  
  this.paused = true
  this.initializeRendering(opts)
  
  for (var chunkIndex in this.voxels.chunks) this.showChunk(this.voxels.chunks[chunkIndex])

  setTimeout(function() {
    self.asyncChunkGeneration = 'asyncChunkGeneration' in opts ? opts.asyncChunkGeneration : true
  }, 2000)

  this.initializeControls(opts)
}

inherits(Game, EventEmitter)

// # External API

Game.prototype.voxelPosition = function(gamePosition) {
  var _ = Math.floor
  var p = gamePosition
  var v = []
  v[0] = _(p[0])
  v[1] = _(p[1])
  v[2] = _(p[2])
  return v
}

Game.prototype.cameraPosition = function() {
  return this.view.cameraPosition()
}

Game.prototype.cameraVector = function() {
  return this.view.cameraVector()
}

Game.prototype.makePhysical = function(target, envelope, blocksCreation) {
  var vel = this.terminalVelocity
  envelope = envelope || [2/3, 1.5, 2/3]
  var obj = physical(target, this.potentialCollisionSet(), envelope, {x: vel[0], y: vel[1], z: vel[2]})
  obj.blocksCreation = !!blocksCreation
  return obj
}

Game.prototype.addItem = function(item) {
  if (!item.tick) {
    var newItem = physical(
      item.mesh,
      this.potentialCollisionSet(),
      [item.size, item.size, item.size]
    )
    
    if (item.velocity) {
      newItem.velocity.copy(item.velocity)
      newItem.subjectTo(this.gravity)
    }
    
    newItem.repr = function() { return 'debris' }
    newItem.mesh = item.mesh
    newItem.blocksCreation = item.blocksCreation
    
    item = newItem
  }
  
  this.items.push(item)
  if (item.mesh) this.scene.add(item.mesh)
  return this.items[this.items.length - 1]
}

Game.prototype.removeItem = function(item) {
  var ix = this.items.indexOf(item)
  if (ix < 0) return
  this.items.splice(ix, 1)
  if (item.mesh) this.scene.remove(item.mesh)
}

// only intersects voxels, not items (for now)
Game.prototype.raycast = // backwards compat
Game.prototype.raycastVoxels = function(start, direction, maxDistance, epilson) {
  if (!start) return this.raycastVoxels(this.cameraPosition(), this.cameraVector(), 10)
  
  var hitNormal = [0, 0, 0]
  var hitPosition = [0, 0, 0]
  var cp = start || this.cameraPosition()
  var cv = direction || this.cameraVector()
  var hitBlock = ray(this, cp, cv, maxDistance || 10.0, hitPosition, hitNormal, epilson || this.epilson)
  if (hitBlock <= 0) return false
  var adjacentPosition = [0, 0, 0]
  var voxelPosition = this.voxelPosition(hitPosition)
  vector.add(adjacentPosition, voxelPosition, hitNormal)
  
  return {
    position: hitPosition,
    voxel: voxelPosition,
    direction: direction,
    value: hitBlock,
    normal: hitNormal,
    adjacent: adjacentPosition
  }
}

Game.prototype.canCreateBlock = function(pos) {
  pos = this.parseVectorArguments(arguments)
  var floored = pos.map(function(i) { return Math.floor(i) })
  var bbox = aabb(floored, [1, 1, 1])
  
  for (var i = 0, len = this.items.length; i < len; ++i) {
    var item = this.items[i]
    var itemInTheWay = item.blocksCreation && item.aabb && bbox.intersects(item.aabb())
    if (itemInTheWay) return false
  }

  return true
}

Game.prototype.createBlock = function(pos, val) {
  if (typeof val === 'string') val = this.materials.find(val)
  if (!this.canCreateBlock(pos)) return false
  this.setBlock(pos, val)
  return true
}

Game.prototype.setBlock = function(pos, val) {
  if (typeof val === 'string') val = this.materials.find(val)
  var old = this.voxels.voxelAtPosition(pos, val)
  var c = this.voxels.chunkAtPosition(pos)
  var chunk = this.voxels.chunks[c.join('|')]
  if (!chunk) return// todo - does self.emit('missingChunk', c.join('|')) make sense here?
  this.addChunkToNextUpdate(chunk)
  this.spatial.emit('change-block', pos, old, val)
  this.emit('setBlock', pos, val, old)
}

Game.prototype.getBlock = function(pos) {
  pos = this.parseVectorArguments(arguments)
  return this.voxels.voxelAtPosition(pos)
}

Game.prototype.blockPosition = function(pos) {
  pos = this.parseVectorArguments(arguments)
  var ox = Math.floor(pos[0])
  var oy = Math.floor(pos[1])
  var oz = Math.floor(pos[2])
  return [ox, oy, oz]
}

Game.prototype.blocks = function(low, high, iterator) {
  var l = low, h = high
  var d = [ h[0]-l[0], h[1]-l[1], h[2]-l[2] ]
  if (!iterator) var voxels = new this.arrayType(d[0]*d[1]*d[2])
  var i = 0
  for(var z=l[2]; z<h[2]; ++z)
  for(var y=l[1]; y<h[1]; ++y)
  for(var x=l[0]; x<h[0]; ++x, ++i) {
    if (iterator) iterator(x, y, z, i)
    else voxels[i] = this.voxels.voxelAtPosition([x, y, z])
  }
  if (!iterator) return {voxels: voxels, dims: d}
}

// backwards compat
Game.prototype.createAdjacent = function(hit, val) {
  this.createBlock(hit.adjacent, val)
}

Game.prototype.appendTo = function (element) {
  this.view.appendTo(element)
}

// # Defaults/options parsing

Game.prototype.gravity = [0, -0.0000036, 0]
Game.prototype.friction = 0.3
Game.prototype.epilson = 1e-8
Game.prototype.terminalVelocity = [0.9, 0.1, 0.9]

Game.prototype.defaultButtons = {
  'W': 'forward'
, 'A': 'left'
, 'S': 'backward'
, 'D': 'right'
, '<up>': 'forward'
, '<left>': 'left'
, '<down>': 'backward'
, '<right>': 'right'
, '<mouse 1>': 'fire'
, '<mouse 3>': 'firealt'
, '<space>': 'jump'
, '<shift>': 'crouch'
, '<control>': 'alt'
}

// used in methods that have identity function(pos) {}
Game.prototype.parseVectorArguments = function(args) {
  if (!args) return false
  if (args[0] instanceof Array) return args[0]
  return [args[0], args[1], args[2]]
}

Game.prototype.setConfigurablePositions = function(opts) {
  var sp = opts.startingPosition
  this.startingPosition = sp || [35, 1024, 35]
  var wo = opts.worldOrigin
  this.worldOrigin = wo || [0, 0, 0]
}

Game.prototype.setDimensions = function(opts) {
  if (opts.container) this.container = opts.container
  if (opts.container && opts.container.clientHeight) {
    this.height = opts.container.clientHeight
  } else {
    this.height = typeof window === "undefined" ? 1 : window.innerHeight
  }
  if (opts.container && opts.container.clientWidth) {
    this.width = opts.container.clientWidth
  } else {
    this.width = typeof window === "undefined" ? 1 : window.innerWidth
  }
}

Game.prototype.notCapable = function(opts) {
  var self = this
  if( !Detector().webgl ) {
    this.view = {
      appendTo: function(el) {
        el.appendChild(self.notCapableMessage())
      }
    }
    return true
  }
  return false
}

Game.prototype.notCapableMessage = function() {
  var wrapper = document.createElement('div')
  wrapper.className = "errorMessage"
  var a = document.createElement('a')
  a.title = "You need WebGL and Pointer Lock (Chrome 23/Firefox 14) to play this game. Click here for more information."
  a.innerHTML = a.title
  a.href = "http://get.webgl.org"
  wrapper.appendChild(a)
  return wrapper
}

Game.prototype.onWindowResize = function() {
  var width = window.innerWidth
  var height = window.innerHeight
  if (this.container) {
    width = this.container.clientWidth
    height = this.container.clientHeight
  }
  this.view.resizeWindow(width, height)
}

// # Physics/collision related methods

Game.prototype.control = function(target) {
  this.controlling = target
  return this.controls.target(target)
}

Game.prototype.potentialCollisionSet = function() {
  return [{ collide: this.collideTerrain.bind(this) }]
}

/**
 * Get the position of the player under control.
 * If there is no player under control, return
 * current position of the game's camera.
 *
 * @return {Array} an [x, y, z] tuple
 */

Game.prototype.playerPosition = function() {
  var target = this.controls.target()
  var position = target
    ? target.avatar.position
    : this.camera.localToWorld(this.camera.position.clone())
  return [position.x, position.y, position.z]
}

Game.prototype.playerAABB = function(position) {
  var pos = position || this.playerPosition()
  var lower = []
  var upper = [1/2, this.playerHeight, 1/2]
  var playerBottom = [1/4, this.playerHeight, 1/4]
  vector.subtract(lower, pos, playerBottom)
  var bbox = aabb(lower, upper)
  return bbox
}

Game.prototype.collideTerrain = function(other, bbox, vec, resting) {
  var self = this
  var axes = ['x', 'y', 'z']
  var vec3 = [vec.x, vec.y, vec.z]
  this.collideVoxels(bbox, vec3, function hit(axis, tile, coords, dir, edge) {
    if (!tile) return
    if (Math.abs(vec3[axis]) < Math.abs(edge)) return
    vec3[axis] = vec[axes[axis]] = edge
    other.acceleration[axes[axis]] = 0
    resting[axes[axis]] = dir
    other.friction[axes[(axis + 1) % 3]] = other.friction[axes[(axis + 2) % 3]] = axis === 1 ? self.friction  : 1
    return true
  })
}

// # Three.js specific methods

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
  return this.chunkSize * 2 * this.chunkDistance
}

Game.prototype.chunkToWorld = function(pos) {
  return [
    pos[0] * this.chunkSize,
    pos[1] * this.chunkSize,
    pos[2] * this.chunkSize
  ]
}

Game.prototype.removeFarChunks = function(playerPosition) {
  var self = this
  playerPosition = playerPosition || this.playerPosition()
  var nearbyChunks = this.voxels.nearbyChunks(playerPosition, this.removeDistance).map(function(chunkPos) {
    return chunkPos.join('|')
  })
  Object.keys(self.voxels.chunks).map(function(chunkIndex) {
    if (nearbyChunks.indexOf(chunkIndex) > -1) return
    var chunk = self.voxels.chunks[chunkIndex]
    var mesh = self.voxels.meshes[chunkIndex]
    var pendingIndex = self.pendingChunks.indexOf(chunkIndex)
    if (pendingIndex !== -1) self.pendingChunks.splice(pendingIndex, 1)
    if (!chunk) return
    var chunkPosition = chunk.position
    if (mesh) {
      self.scene.remove(mesh[self.meshType])
      mesh[self.meshType].geometry.dispose()
      delete mesh.data
      delete mesh.geometry
      delete mesh.meshed
      delete mesh.surfaceMesh
    }
    delete self.voxels.chunks[chunkIndex]
    self.emit('removeChunk', chunkPosition)
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
    self.emit('dirtyChunkUpdate', chunk)
    self.showChunk(chunk)
  })
  this.chunksNeedsUpdate = {}
}

Game.prototype.loadPendingChunks = function(count) {
  var pendingChunks = this.pendingChunks

  if (!this.asyncChunkGeneration) {
    count = pendingChunks.length
  } else {
    count = count || (pendingChunks.length * 0.1)
    count = Math.max(1, Math.min(count, pendingChunks.length))
  }

  for (var i = 0; i < count; i += 1) {
    var chunkPos = pendingChunks[i].split('|')
    var chunk = this.voxels.generateChunk(chunkPos[0]|0, chunkPos[1]|0, chunkPos[2]|0)

    if (process.browser) this.showChunk(chunk)
  }

  if (count) pendingChunks.splice(0, count)
}

Game.prototype.getChunkAtPosition = function(pos) {
  var chunkID = this.voxels.chunkAtPosition(pos).join('|')
  var chunk = this.voxels.chunks[chunkID]
  return chunk
}

Game.prototype.showChunk = function(chunk) {
  var chunkIndex = chunk.position.join('|')
  var bounds = this.voxels.getBounds.apply(this.voxels, chunk.position)
  var scale = new THREE.Vector3(1, 1, 1)
  var mesh = voxelMesh(chunk, this.mesher, scale, this.THREE)
  this.voxels.chunks[chunkIndex] = chunk
  if (this.voxels.meshes[chunkIndex]) this.scene.remove(this.voxels.meshes[chunkIndex][this.meshType])
  this.voxels.meshes[chunkIndex] = mesh
  if (process.browser) {
    if (this.meshType === 'wireMesh') mesh.createWireMesh()
    else mesh.createSurfaceMesh(this.materials.material)
    this.materials.paint(mesh)
  }
  mesh.setPosition(bounds[0][0], bounds[0][1], bounds[0][2])
  mesh.addToScene(this.scene)
  this.emit('renderChunk', chunk)
  return mesh
}

// # Debugging methods

Game.prototype.addMarker = function(position) {
  var geometry = new THREE.SphereGeometry( 0.1, 10, 10 )
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

Game.prototype.addVoxelMarker = function(x, y, z, color) {
  var bbox = aabb([x, y, z], [1, 1, 1])
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

Game.prototype.setInterval = tic.interval.bind(tic)
Game.prototype.setTimeout = tic.timeout.bind(tic)

Game.prototype.tick = function(delta) {
  for(var i = 0, len = this.items.length; i < len; ++i) {
    this.items[i].tick(delta)
  }
  
  if (this.materials) this.materials.tick(delta)

  if (this.pendingChunks.length) this.loadPendingChunks()
  if (Object.keys(this.chunksNeedsUpdate).length > 0) this.updateDirtyChunks()
  
  tic.tick(delta)

  this.emit('tick', delta)
  
  if (!this.controls) return
  var playerPos = this.playerPosition()
  this.spatial.emit('position', playerPos, playerPos)
}

Game.prototype.render = function(delta) {
  this.view.render(this.scene)
}

Game.prototype.initializeTimer = function(rate) {
  var self = this
  var accum = 0
  var now = 0
  var last = null
  var dt = 0
  var wholeTick
  
  self.frameUpdated = true
  self.interval = setInterval(timer, 0)
  return self.interval
  
  function timer() {
    if (self.paused) {
      last = Date.now()
      accum = 0
      return
    }
    now = Date.now()
    dt = now - (last || now)
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

Game.prototype.initializeRendering = function(opts) {
  var self = this

  if (!opts.statsDisabled) self.addStats()

  window.addEventListener('resize', self.onWindowResize.bind(self), false)

  requestAnimationFrame(window).on('data', function(dt) {
    self.emit('prerender', dt)
    self.render(dt)
    self.emit('postrender', dt)
  })
  if (typeof stats !== 'undefined') {
    self.on('postrender', function() {
      stats.update()
    })
  }
}

Game.prototype.initializeControls = function(opts) {
  // player control
  this.keybindings = opts.keybindings || this.defaultButtons
  this.buttons = kb(document.body, this.keybindings)
  this.buttons.disable()
  this.optout = false
  this.interact = interact(opts.interactElement || this.view.element, opts.interactMouseDrag)
  this.interact
      .on('attain', this.onControlChange.bind(this, true))
      .on('release', this.onControlChange.bind(this, false))
      .on('opt-out', this.onControlOptOut.bind(this))
  this.hookupControls(this.buttons, opts)
}

Game.prototype.hookupControls = function(buttons, opts) {
  opts = opts || {}
  opts.controls = opts.controls || {}
  opts.controls.onfire = this.onFire.bind(this)
  this.controls = control(buttons, opts.controls)
  this.items.push(this.controls)
  this.controlling = null
}

Game.prototype.handleChunkGeneration = function() {
  var self = this
  this.voxels.on('missingChunk', function(chunkPos) {
    self.pendingChunks.push(chunkPos.join('|'))
  })
  this.voxels.requestMissingChunks(this.worldOrigin)
  this.loadPendingChunks(this.pendingChunks.length)
}

// teardown methods
Game.prototype.destroy = function() {
  clearInterval(this.timer)
}
