var voxel = require('voxel')
var voxelMesh = require('voxel-mesh')
var interact = require('interact')
var Detector = require('./detector')
var THREE = require('three')
var Stats = require('./stats')
var PlayerControls = require('./player-controls.js')
var requestAnimationFrame = require('raf')
var inherits = require('inherits')
var EventEmitter = require('events').EventEmitter

module.exports = Game

function Game(opts) {
  if (!(this instanceof Game)) return new Game(opts)
  var self = this
  if (!opts) opts = {}
  
  if (opts.generate) {
    this.generateVoxelChunk = function(low, high) {
      return voxel.generate(low, high, opts.generate)
    }
  } else this.generateVoxelChunk = opts.generateVoxelChunk
  
  this.texturePath = opts.texturePath || '/textures/'
  this.cubeSize = opts.cubeSize || 25
  this.chunkSize = opts.chunkSize || 32
  this.chunkDistance = opts.chunkDistance || 2
  this.startingPosition = opts.startingPosition || new THREE.Vector3(35,1024,35)
  this.worldOrigin = opts.worldOrigin || new THREE.Vector3(0,0,0)
  this.meshType = opts.meshType || 'surfaceMesh'
  if (opts.renderCallback) this.renderCallback = opts.renderCallback
  
  this.materials = opts.materials || [ 'grass' ]
  this.material = this.loadTextures(this.materials)
  
  this.items = []
  
  this.height = window.innerHeight
  this.width = window.innerWidth
  this.scene = scene = new THREE.Scene()
  this.camera = this.createCamera(scene)
  this.renderer = this.createRenderer()
  this.controls = this.createControls()
  this.addLights(this.scene)
  this.moveToPosition(this.startingPosition)
  this.voxels = voxel(this)
  this.voxels.generateMissingChunks(this.worldOrigin)
  Object.keys(this.voxels.chunks).map(function(chunkIndex) {
    self.showChunk(self.voxels.chunks[chunkIndex])
  })
  this.addStats()
  window.addEventListener('resize', this.onWindowResize.bind(this), false)
  window.addEventListener('mousedown', this.onMouseDown.bind(this), false)
  window.addEventListener('mouseup', this.onMouseUp.bind(this), false)
  requestAnimationFrame(window).on('data', this.tick.bind(this))
}

inherits(Game, EventEmitter)

Game.prototype.setupPointerLock = function(element) {
  var self = this
  element = element || document.body
  if (typeof element !== 'object') element = document.querySelector(element)
  var pointer = this.pointer = interact(document.body)
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

Game.prototype.addItem = function(item) {
  var self = this
  self.items.push(item)
  item.velocity = item.velocity || { x: 0, y: 0, z: 0 }
  
  var ticker = item.tick
  item.tick = function (dt) {
    if (item.resting) return
    
    var c = self.getCollisions(item.mesh.position, item.size, item.size)
    if (c.bottom.length > 0) {
      item.mesh.position.y -= item.velocity.y
      item.velocity.x = 0
      item.velocity.y = 0
      item.velocity.z = 0
      item.resting = true
    } else if (c.middle.length || c.top.length) {
      item.velocity.x *= -1
      item.velocity.z *= -1
      item.velocity.y = 0
    } else {
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

Game.prototype.intersectAllMeshes = function(start, direction) {
  var self = this
  var meshes = []
  Object.keys(self.voxels.meshes).map(function(key) {
    meshes.push(self.voxels.meshes[key][self.meshType])
  })
  var d = direction.subSelf(start).normalize()
  var ray = new THREE.Raycaster(start, d)
  var intersections = ray.intersectObjects( meshes )
  if (intersections.length === 0) return false
  var intersection = intersections[0]
  var p = new THREE.Vector3()
  p.copy(intersection.point)
  p.x += d.x
  p.y += d.y
  p.z += d.z
  return p
}

Game.prototype.raycast = function() {
  var start = this.controls.yawObject.position.clone()
  var direction = this.camera.matrixWorld.multiplyVector3(new THREE.Vector3(0,0,-1))
  var intersects = this.intersectAllMeshes(start, direction)
  return intersects
}

Game.prototype.loadTextures = function(names) {
  var self = this
  return new THREE.MeshFaceMaterial(names.map(function (name) {
    var tex = THREE.ImageUtils.loadTexture(self.texturePath + name + ".png")
    tex.magFilter = THREE.NearestFilter
    tex.minFilter = THREE.LinearMipMapLinearFilter
    tex.wrapT = THREE.RepeatWrapping
    tex.wrapS = THREE.RepeatWrapping
    
    return new THREE.MeshLambertMaterial({
      map: tex,
      ambient: 0xbbbbbb
    })
  }))
}

Game.prototype.createCamera = function() {
  var camera;
  camera = new THREE.PerspectiveCamera(60, this.width / this.height, 1, 10000)
  camera.lookAt(new THREE.Vector3(0, 0, 0))
  this.scene.add(camera)
  return camera
}

Game.prototype.createControls = function() {
  var controls = new PlayerControls(this.camera)
  controls.gravityEnabled = true
  this.scene.add( controls.yawObject )
  return controls
}

Game.prototype.createRenderer = function() {
  if( Detector.webgl ){
    this.renderer = new THREE.WebGLRenderer({
      antialias: true
    })
  } else {
    this.renderer = new THREE.CanvasRenderer()
  }
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

Game.prototype.getCollisions = function(position, w, h, checker) {
  var self = this
  var p = position.clone()

  var vertices = {
    bottom: [
      new THREE.Vector3(p.x - w, p.y - h, p.z - w),
      new THREE.Vector3(p.x - w, p.y - h, p.z + w),
      new THREE.Vector3(p.x + w, p.y - h, p.z - w),
      new THREE.Vector3(p.x + w, p.y - h, p.z + w)
    ],
    middle: [
      new THREE.Vector3(p.x - w, p.y - h / 2, p.z - w),
      new THREE.Vector3(p.x - w, p.y - h / 2, p.z + w),
      new THREE.Vector3(p.x + w, p.y - h / 2, p.z - w),
      new THREE.Vector3(p.x + w, p.y - h / 2, p.z + w)
    ],
    top: [
      new THREE.Vector3(p.x - w, p.y, p.z - w),
      new THREE.Vector3(p.x - w, p.y, p.z + w),
      new THREE.Vector3(p.x + w, p.y, p.z - w),
      new THREE.Vector3(p.x + w, p.y, p.z + w)
    ],
  }

  return {
    bottom: vertices.bottom.map(check).filter(Boolean),
    middle: vertices.middle.map(check).filter(Boolean),
    top: vertices.top.map(check).filter(Boolean)
  }
  
  function check(vertex) {
    if (checker) return checker(vertex) && vertex
    return self.voxels.voxelAtPosition(vertex) && vertex
  }
}

Game.prototype.addLights = function(scene) {
  var ambientLight, directionalLight
  ambientLight = new THREE.AmbientLight(0xaaaaaa)
  scene.add(ambientLight)
  var light	= new THREE.DirectionalLight( 0xffffff )
  light.position.set( Math.random(), Math.random(), Math.random() ).normalize()
  scene.add( light )
};

Game.prototype.currentMesh = function() {
  var cid = this.voxels.chunkAtPosition(this.controls.yawObject.position).join('|')
  return this.voxels.meshes[cid]
}

Game.prototype.createBlock = function(pos, val) {
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
  
  var vidx = self.voxels.voxelIndex(p)
  var c = self.voxels.chunkAtPosition(p)
  var ckey = c.join('|')
  var chunk = self.voxels.chunks[ckey]
  if (!chunk) return false
  
  var w = self.cubeSize / 4 // width of player cube
  var h = self.cubeSize * 1.5 // height of player cube
  var pos = self.controls.yawObject.position
  var collisions = self.getCollisions(pos, w, h, check)
  
  if (collisions.top.length) return false
  if (collisions.middle.length) return false
  if (collisions.bottom.length > 2) return false
  
  chunk.voxels[vidx] = val
  this.showChunk(this.voxels.chunks[c.join('|')])
  return true
  
  function check(v) { return vidx === self.voxels.voxelIndex(v) }
}

Game.prototype.setBlock = function(pos, val) {
  var hitVoxel = this.voxels.voxelAtPosition(pos, val)
  var c = this.voxels.chunkAtPosition(pos)
  this.showChunk(this.voxels.chunks[c.join('|')])
}

Game.prototype.getBlock = function(pos) {
  return this.voxels.voxelAtPosition(pos)
}

Game.prototype.showChunk = function(chunk) {
  var chunkIndex = chunk.position.join('|')
  var bounds = this.voxels.getBounds.apply(this.voxels, chunk.position)
  var cubeSize = this.cubeSize
  var scale = new THREE.Vector3(cubeSize, cubeSize, cubeSize)
  var mesh = voxelMesh(chunk, scale)
  this.voxels.chunks[chunkIndex] = chunk
  if (this.voxels.meshes[chunkIndex]) this.scene.remove(this.voxels.meshes[chunkIndex][this.meshType])
  this.voxels.meshes[chunkIndex] = mesh
  if (this.meshType === 'wireMesh') mesh.createWireMesh()
  else mesh.createSurfaceMesh(this.material)
  mesh.setPosition(bounds[0][0] * cubeSize, bounds[0][1] * cubeSize, bounds[0][2] * cubeSize)
  mesh.addToScene(this.scene)
  this.applyTextures(mesh.geometry)
  this.items.forEach(function (item) { item.resting = false })
  return mesh
}

Game.prototype.applyTextures = function (geom) {
  var self = this;
  
  geom.faces.forEach(function (face, ix) {
    var c = face.vertexColors[0]
    var index = Math.floor(c.b*255 + c.g*255*255 + c.r*255*255*255)
    face.materialIndex = Math.max(0, index - 1) % self.materials.length
  })
}

Game.prototype.tick = function(dt) {
  var self = this
  this.controls.tick(dt, function () {
    var w = self.cubeSize / 4 // width of player cube
    var h = self.cubeSize * 1.5 // height of player cube
    var collisions = self.getCollisions(this.yawObject.position, w, h)
    
    if (collisions.middle.length || collisions.top.length) {
      this.yawObject.translateX(-this.velocity.x)
      this.yawObject.translateZ(-this.velocity.z)
      this.velocity.x *= -0.01
      this.velocity.z *= -0.01
    }
    
    if (collisions.bottom.length) {
      this.velocity.y = Math.max(0, this.velocity.y)
    }
  })
  this.items.forEach(function (item) { item.tick(dt) })
  
  if (this.renderCallback) this.renderCallback.call(this)  
  this.renderer.render(this.scene, this.camera)
  stats.update()
}
