var voxel = require('voxel')
var voxelMesh = require('voxel-mesh')
var voxelChunks = require('voxel-chunks')
var THREE = require('three')
var Stats = require('./lib/stats')
var Detector = require('./lib/detector')
var inherits = require('inherits')
var path = require('path')
var EventEmitter = require('events').EventEmitter
if (process.browser) var interact = require('interact')
var playerPhysics = require('player-physics')
var requestAnimationFrame = require('raf')
var collisions = require('collide-3d-tilemap')
var aabb = require('aabb-3d')
var SpatialEventEmitter = require('spatial-events')
var regionChange = require('voxel-region-change')
var AXISES = ['x', 'y', 'z']

module.exports = Game


function Game(opts) {
  if (!(this instanceof Game)) return new Game(opts)
  var self = this
  if (!opts) opts = {}
  if (process.browser && this.notCapable()) return
  if (!('generateChunks' in opts)) opts.generateChunks = true
  this.generateChunks = opts.generateChunks
  this.setConfigurablePositions(opts)
  this.configureChunkLoading(opts)
  this.THREE = THREE
  this.cubeSize = opts.cubeSize || 25
  this.chunkSize = opts.chunkSize || 32
  this.chunkDistance = opts.chunkDistance || 2
  this.meshType = opts.meshType || 'surfaceMesh'
  this.controlOptions = opts.controlOptions || {}
  this.mesher = opts.mesher || voxel.meshers.greedy
  this.items = []
  this.voxels = voxel(this)
  this.chunkGroups = voxelChunks(this)  
  this.height = typeof window === "undefined" ? 1 : window.innerHeight
  this.width = typeof window === "undefined" ? 1 : window.innerWidth
  this.scene = new THREE.Scene()
  this.camera = this.createCamera(this.scene)
  this.controls = this.createControls()
  if (!opts.lightsDisabled) this.addLights(this.scene)
  this.controlLayouts = {
    qwerty: {
      87: 'moveForward', //w
      65: 'moveLeft', //a
      83: 'moveBackward', //s
      68: 'moveRight', //d
      32: 'wantsJump', //space
    },
    azerty: {
      90: 'moveForward', //z
      81: 'moveLeft', //q
      83: 'moveBackward', //s
      68: 'moveRight', //d
      32: 'wantsJump', //space
    },
    dvorak: {
      188: 'moveForward', //comma
      65: 'moveLeft', //a
      79: 'moveBackward', //o
      69: 'moveRight', //e
      32: 'wantsJump', //space
    }
  }
  this.playerControls = opts.controlLayout ? this.controlLayouts[opts.controlLayout] : this.controlLayouts.qwerty
  if (!opts.controlsDisabled) this.bindControls(this.controls)
  if (!opts.fogDisabled) this.scene.fog = new THREE.Fog( 0xffffff, 0.00025, this.worldWidth() )
  this.moveToPosition(this.startingPosition)
  this.collideVoxels = collisions(
    this.getTileAtIJK.bind(this),
    this.cubeSize,
    [Infinity, Infinity, Infinity],
    [-Infinity, -Infinity, -Infinity]
  )
  this.spatial = new SpatialEventEmitter()
  this.voxelRegion = regionChange(this.spatial, this.cubeSize)
  this.chunkRegion = regionChange(this.spatial, this.cubeSize * this.chunkSize)
  
  // client side only
  if (process.browser) {
    this.materials = require('voxel-texture')({
      THREE: THREE,
      texturePath: opts.texturePath || './textures/',
      materialType: opts.materialType || THREE.MeshLambertMaterial,
      materialParams: opts.materialParams || {}
    })
    this.materials.load(opts.materials || [['grass', 'dirt', 'grass_dirt'], 'brick', 'dirt'])
    this.initializeRendering()
  }
  
  if (this.generateChunks) {
    self.voxels.on('missingChunk', function(chunkPos) {
      var chunk = self.voxels.generateChunk(chunkPos[0], chunkPos[1], chunkPos[2])
      if (process.browser) self.showChunk(chunk)
    })
    this.voxels.requestMissingChunks(this.worldOrigin)
  }
  
}

inherits(Game, EventEmitter)

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
      return voxel.generate(low, high, self.generate)
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

Game.prototype.chunkspaceToTilespace = function(pos) {
  return {
    i: pos[0] * this.chunkSize,
    j: pos[1] * this.chunkSize,
    k: pos[2] * this.chunkSize
  }
}

Game.prototype.getChunkAtPosition = function(pos) {
  var chunkID = this.voxels.chunkAtPosition(pos).join('|') 

  var chunk = this.voxels.chunks[chunkID]
  return chunk
}

Game.prototype.initializeRendering = function() {
  var self = this
  this.renderer = this.createRenderer()
  if (!this.statsDisabled) this.addStats()
  window.addEventListener('resize', this.onWindowResize.bind(this), false)
  window.addEventListener('mousedown', this.onMouseDown.bind(this), false)
  window.addEventListener('mouseup', this.onMouseUp.bind(this), false)
  requestAnimationFrame(window).on('data', this.tick.bind(this))
  this.chunkRegion.on('change', function(newChunk) {
    self.removeFarChunks()
  })
}

Game.prototype.removeFarChunks = function(playerPosition) {
  var self = this
  playerPosition = playerPosition || this.controls.yawObject.position
  var nearbyChunks = this.voxels.nearbyChunks(playerPosition).map(function(chunkPos) {
    return chunkPos.join('|')
  })
  Object.keys(self.voxels.chunks).map(function(chunkIndex) {
    if (nearbyChunks.indexOf(chunkIndex) > -1) return
    self.scene.remove(self.voxels.meshes[chunkIndex][self.meshType])
    delete self.voxels.chunks[chunkIndex]
  })
  self.voxels.requestMissingChunks(playerPosition)
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

Game.prototype.setupPointerLock = function(element) {
  var self = this
  element = element || document.body
  if (typeof element !== 'object') element = document.querySelector(element)
  var pointer = this.pointer = interact(element)
  if (!pointer.pointerAvailable()) this.pointerLockDisabled = true
  pointer.on('attain', function(movements) {
    self.controls.enabled = true
    movements.pipe(self.controls)
  })
  pointer.on('release', function() {
    self.controls.enabled = false
  })
  pointer.on('error', function() {
    // user denied pointer lock OR it's not available
    self.pointerLockDisabled = true
    console.error('pointerlock error')
  })
}

Game.prototype.requestPointerLock = function(element) {
  if (!this.pointer) this.setupPointerLock(element)
  this.pointer.request()
}

Game.prototype.moveToPosition = function(position) {
  var pos = this.controls.yawObject.position
  pos.x = position.x
  pos.y = position.y
  pos.z = position.z
}

Game.prototype.onWindowResize = function() {
  this.camera.aspect = window.innerWidth / window.innerHeight
  this.camera.updateProjectionMatrix()
  this.renderer.setSize( window.innerWidth, window.innerHeight )
}

Game.prototype.addMarker = function(position) {
  var geometry = new THREE.SphereGeometry( 1, 4, 4 );
  var material = new THREE.MeshPhongMaterial( { color: 0xffffff, shading: THREE.FlatShading } );
  var mesh = new THREE.Mesh( geometry, material );
  mesh.position.copy(position)
  this.scene.add(mesh)
}

Game.prototype.addAABBMarker = function(aabb, color) {
  var geometry = new THREE.CubeGeometry(aabb.width(), aabb.height(), aabb.depth())
  var material = new THREE.MeshBasicMaterial({ color: color || 0xffffff, wireframe: true, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
  var mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(aabb.x0() + aabb.width() / 2, aabb.y0() + aabb.height() / 2, aabb.z0() + aabb.depth() / 2)
  this.scene.add(mesh)
}

Game.prototype.addItem = function(item) {
  var self = this
  self.items.push(item)
  item.velocity = item.velocity || { x: 0, y: 0, z: 0 }
  item.collisionRadius = item.collisionRadius || item.size
  if (!item.width) item.width = item.size
  if (!item.height) item.height = item.size
  if (!item.depth) item.depth = item.width

  var ticker = item.tick
  item.tick = function (dt) {
    if (item.collisionRadius) {
      var p0 = self.controls.yawObject.position.clone()
      var p1 = self.controls.yawObject.position.clone()
      p1.y -= 25
      var d0 = distance(item.mesh.position, p0)
      var d1 = distance(item.mesh.position, p1)
      if (Math.min(d0, d1) <= item.collisionRadius) {
        self.emit('collision', item)
      }
    }

    if (!item.resting) {
      var c = self.getCollisions(item.mesh.position, item)
      if (c.bottom.length > 0) {
        if (item.velocity.y <= 0) {
          item.mesh.position.y -= item.velocity.y
          item.velocity.y = 0
          item.resting = true
        }
        item.velocity.x = 0
        item.velocity.z = 0
      } else if (c.middle.length || c.top.length) {
        item.velocity.x *= -1
        item.velocity.z *= -1
      }

      item.velocity.y -= 0.003
      item.mesh.position.x += item.velocity.x * dt
      item.mesh.position.y += item.velocity.y * dt
      item.mesh.position.z += item.velocity.z * dt
    }

    if (ticker) ticker(item)
  }
  self.scene.add(item.mesh)
}

Game.prototype.removeItem = function(item) {
  var ix = this.items.indexOf(item)
  if (ix < 0) return
  this.items.splice(ix, 1)
  this.scene.remove(item.mesh)
}

Game.prototype.onMouseDown = function(e) {
  if (!this.controls.enabled) return
  var intersection = this.raycast()
  if (intersection) this.emit('mousedown', intersection, e)
}

Game.prototype.onMouseUp = function(e) {
  if (!this.controls.enabled) return
  var intersection = this.raycast()
  if (intersection) this.emit('mouseup', intersection, e)
}

Game.prototype.intersectAllMeshes = function(start, direction, maxDistance) {
  var self = this
  var meshes = Object.keys(self.voxels.meshes).map(function(key) {
    return self.voxels.meshes[key][self.meshType]
  }).concat(self.chunkGroups.meshes)
  
  var d = direction.subSelf(start).normalize()
  var ray = new THREE.Raycaster(start, d, 0, maxDistance)
  var intersections = ray.intersectObjects(meshes)
  if (intersections.length === 0) return false
  
  var dists = intersections.map(function (i) { return i.distance })
  var inter = intersections[dists.indexOf(Math.min.apply(null, dists))]
  
  var p = new THREE.Vector3()
  p.copy(inter.point)
  p.intersection = inter
  p.direction = d
  
  var cm = self.chunkGroups.chunkMatricies[inter.object.id]
  if (cm) p.chunkMatrix = cm
  
  p.x += d.x
  p.y += d.y
  p.z += d.z
  return p
}

Game.prototype.raycast = function(maxDistance) {
  var start = this.controls.yawObject.position.clone()
  var direction = this.camera.matrixWorld.multiplyVector3(new THREE.Vector3(0,0,-1))
  var intersects = this.intersectAllMeshes(start, direction, maxDistance)
  return intersects
}

Game.prototype.createCamera = function() {
  var camera;
  camera = new THREE.PerspectiveCamera(60, this.width / this.height, 1, 10000)
  camera.lookAt(new THREE.Vector3(0, 0, 0))
  this.scene.add(camera)
  return camera
}

Game.prototype.createControls = function(camera) {
  var controls = playerPhysics(this.camera, this.controlOptions)
  this.scene.add( controls.yawObject )
  return controls
}

Game.prototype.createRenderer = function() {
  this.renderer = new THREE.WebGLRenderer({
    antialias: true
  })
  this.renderer.setSize(this.width, this.height)
  this.renderer.setClearColorHex(0xBFD1E5, 1.0)
  this.renderer.clear()
  this.element = this.renderer.domElement
  return this.renderer
}

Game.prototype.appendTo = function (element) {
  if (typeof element === 'object') {
    element.appendChild(this.element)
  }
  else {
    document.querySelector(element).appendChild(this.element)
  }
}

Game.prototype.addStats = function() {
  stats = new Stats()
  stats.domElement.style.position  = 'absolute'
  stats.domElement.style.bottom  = '0px'
  document.body.appendChild( stats.domElement )
}

Game.prototype.cameraRotation = function() {
  var xAngle = this.controls.pitchObject.rotation.x
  var yAngle = this.controls.yawObject.rotation.y
  return {x: xAngle, y: yAngle}
}

Game.prototype.getCollisions = function(position, dims, checker, controls) {
  var self = this
  var p = position.clone()
  var w = dims.width / 2
  var h = dims.height / 2
  var d = dims.depth / 2

  controls = controls || this.controls
  var rx = controls.pitchObject.rotation.x
  var ry = controls.yawObject.rotation.y

  var vertices = {
    bottom: [
      new THREE.Vector3(p.x - w, p.y - h, p.z - d),
      new THREE.Vector3(p.x - w, p.y - h, p.z + d),
      new THREE.Vector3(p.x + w, p.y - h, p.z - d),
      new THREE.Vector3(p.x + w, p.y - h, p.z + d)
    ],
    middle: [
      new THREE.Vector3(p.x - w, p.y, p.z - d),
      new THREE.Vector3(p.x - w, p.y, p.z + d),
      new THREE.Vector3(p.x + w, p.y, p.z - d),
      new THREE.Vector3(p.x + w, p.y, p.z + d)
    ],
    top: [
      new THREE.Vector3(p.x - w, p.y + h, p.z - d),
      new THREE.Vector3(p.x - w, p.y + h, p.z + d),
      new THREE.Vector3(p.x + w, p.y + h, p.z - d),
      new THREE.Vector3(p.x + w, p.y + h, p.z + d)
    ],
    // -------------------------------
    up: [ new THREE.Vector3(p.x, p.y + h, p.z) ],
    down: [ new THREE.Vector3(p.x, p.y - h, p.z) ],
    left: [
      new THREE.Vector3(
        p.x + w * Math.cos(ry + Math.PI / 2),
        p.y,
        p.z + d * Math.sin(ry + Math.PI / 2)
      ) ,
      new THREE.Vector3(
        p.x + w * Math.cos(ry + Math.PI / 2),
        p.y + h * 1.5,
        p.z + d * Math.sin(ry + Math.PI / 2)
      )
    ],
    right: [
      new THREE.Vector3(
        p.x + w * Math.cos(ry - Math.PI / 2),
        p.y,
        p.z + d * Math.sin(ry - Math.PI / 2)
      ),
      new THREE.Vector3(
        p.x + w * Math.cos(ry - Math.PI / 2),
        p.y + h * 1.5,
        p.z + d * Math.sin(ry - Math.PI / 2)
      )
    ],
    back: [
      new THREE.Vector3(
        p.x + w * Math.cos(ry),
        p.y,
        p.z + d * Math.sin(ry)
      ),
      new THREE.Vector3(
        p.x + w * Math.cos(ry),
        p.y + h * 1.5,
        p.z + d * Math.sin(ry)
      )
    ],
    forward: [
      new THREE.Vector3(
        p.x + w * Math.cos(ry + Math.PI),
        p.y,
        p.z + d * Math.sin(ry + Math.PI)
      ),
      new THREE.Vector3(
        p.x + w * Math.cos(ry + Math.PI),
        p.y + h * 1.5,
        p.z + d * Math.sin(ry + Math.PI)
      )
    ]
  }

  return {
    bottom: vertices.bottom.map(check).filter(Boolean),
    middle: vertices.middle.map(check).filter(Boolean),
    top: vertices.top.map(check).filter(Boolean),
    // ----
    up: vertices.up.map(check).filter(Boolean),
    down: vertices.down.map(check).filter(Boolean),
    left: vertices.left.map(check).filter(Boolean),
    right: vertices.right.map(check).filter(Boolean),
    forward: vertices.forward.map(check).filter(Boolean),
    back: vertices.back.map(check).filter(Boolean)
  }

  function check(vertex) {
    if (checker) return checker(vertex) && vertex
    var val = self.voxels.voxelAtPosition(vertex)
    return val && vertex
  }
}

Game.prototype.addLights = function(scene) {
  var ambientLight, directionalLight
  ambientLight = new THREE.AmbientLight(0xcccccc)
  scene.add(ambientLight)
  var light	= new THREE.DirectionalLight( 0xffffff , 1)
  light.position.set( 1, 1, 0.5 ).normalize()
  scene.add( light )
};

Game.prototype.currentMesh = function() {
  var cid = this.voxels.chunkAtPosition(this.controls.yawObject.position).join('|')
  return this.voxels.meshes[cid]
}

Game.prototype.checkBlock = function(pos) {
  var self = this
  var direction = self.camera.matrixWorld.multiplyVector3(new THREE.Vector3(0,0,-1))
  var start = self.controls.yawObject.position.clone()
  var d = direction.subSelf(start).normalize()

  var p = new THREE.Vector3()
  p.copy(pos)
  p.x -= 1.1 * d.x
  p.y -= 1.1 * d.y
  p.z -= 1.1 * d.z
  var block = self.getBlock(p)
  if (block) return false

  var voxelVector = self.voxels.voxelVector(p)
  var vidx = self.voxels.voxelIndex(voxelVector)
  var c = self.voxels.chunkAtPosition(p)
  var ckey = c.join('|')
  var chunk = self.voxels.chunks[ckey]
  if (!chunk) return false

  var aabb = this.playerAABB()
  var bottom = {x: aabb.x0(), y: aabb.y0(), z: aabb.z0()}
  var playerVector = self.voxels.voxelVector(bottom)

  if ( playerVector.x === voxelVector.x
    && playerVector.y === voxelVector.y
    && playerVector.z === voxelVector.z) return false
  
  return {chunkIndex: ckey, voxelVector: voxelVector}
}

Game.prototype.createBlock = function(pos, val) {
  if (pos.chunkMatrix) {
    return this.chunkGroups.createBlock(pos, val)
  }
  
  var newBlock = this.checkBlock(pos)
  if (!newBlock) return
  var chunk = this.voxels.chunks[newBlock.chunkIndex]
  var old = chunk.voxels[this.voxels.voxelIndex(newBlock.voxelVector)]
  chunk.voxels[this.voxels.voxelIndex(newBlock.voxelVector)] = val
  this.showChunk(chunk)
  this.spatial.emit('change-block', [pos.x, pos.y, pos.z], pos, old, val)
  return true
}

Game.prototype.setBlock = function(pos, val) {
  if (pos.chunkMatrix) {
    return this.chunkGroups.setBlock(pos, val)
  }
  
  var hitVoxel = this.voxels.voxelAtPosition(pos, val)
  var c = this.voxels.chunkAtPosition(pos)
  this.showChunk(this.voxels.chunks[c.join('|')])

  this.spatial.emit('change-block', [pos.x, pos.y, pos.z], pos, hitVoxel, val)
}

Game.prototype.getBlock = function(pos) {
  if (pos.chunkMatrix) {
    return this.chunkGroups.getBlock(pos)
  }
  return this.voxels.voxelAtPosition(pos)
}

Game.prototype.showChunk = function(chunk, mesher) {
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
  this.items.forEach(function (item) { item.resting = false })
  return mesh
}

Game.prototype.playerAABB = function(position) {
  var pos = position || this.controls.yawObject.position
  var size = this.cubeSize

  var bbox = aabb([
    pos.x - size / 4,
    pos.y - size * 1.5,
    pos.z - size / 4
  ], [
    size / 2,
    size * 1.5,
    size / 2
  ])
  return bbox
}

Game.prototype.updatePlayerPhysics = function(bbox, controls) {
  var self = this
  var pos = controls.yawObject.position
  var yaw = controls.yawObject
  var size = self.cubeSize

  var base = [ pos.x, pos.y, pos.z ]
  
  var velocity = [
    controls.velocity.x,
    controls.velocity.y,
    controls.velocity.z
  ]
  
  var worldVector

  yaw.translateX(velocity[0])
  yaw.translateY(velocity[1])
  yaw.translateZ(velocity[2])

  worldVector = [
    pos.x - base[0],
    pos.y - base[1],
    pos.z - base[2]
  ]

  yaw.translateX(-velocity[0])
  yaw.translateY(-velocity[1])
  yaw.translateZ(-velocity[2])

  controls.freedom['y-'] = true

  self.collideVoxels(bbox, worldVector, function(axis, tile, coords, dir, edgeVector) {
    if (tile) {
      worldVector[axis] = edgeVector
      if (axis === 1 && dir === -1) {
        controls.freedom['y-'] = false
      }
      self.spatial.emit(
        'collide-'+AXISES[axis],
        [worldVector[0] + base[0], worldVector[1] + base[1], worldVector[2] + base[2]],
        tile, coords, dir
      )
      return true
    }
  })  
  
  var newLocation = new THREE.Vector3(
    worldVector[0] + base[0], worldVector[1] + base[1], worldVector[2] + base[2]
  )

  pos.copy(newLocation)

  self.spatial.emit('position', bbox, newLocation)

}

Game.prototype.bindControls = function (controls) {
  var self = this
  var onKeyDown = function ( event ) {
    var command = self.playerControls[event.keyCode];
    if (command) { controls.emit('command', command, true); }
  }

  var onKeyUp = function ( event ) {
    var command = self.playerControls[event.keyCode];
    if (command) { controls.emit('command', command, false); }
  }

  document.addEventListener( 'keydown', onKeyDown, false )
  document.addEventListener( 'keyup', onKeyUp, false )
}

Game.prototype.tick = function(delta) {
  var self = this
  this.controls.tick(delta, function(controls) {
    var bbox = self.playerAABB()
    self.updatePlayerPhysics(bbox, controls)
  })
  this.items.forEach(function (item) { item.tick(delta) })
  this.emit('tick', delta)
  this.render(delta)
  stats.update()
}

Game.prototype.render = function(delta) {
  this.renderer.render(this.scene, this.camera)
}

function distance (a, b) {
  var x = a.x - b.x
  var y = a.y - b.y
  var z = a.z - b.z
  return Math.sqrt(x*x + y*y + z*z)
}
