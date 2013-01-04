var requestPointerLock = require('./request_pointer_lock')
var Chunker = require('./chunker')
var Detector = require('./detector')
var THREE = require('../deps/three')
window.THREE = THREE // only until voxel-mesh gets updated
var Stats = require('../deps/stats')
var PointerLockControls = require('./pointer_lock_controls')

var inherits = require('inherits')
var EventEmitter = require('events').EventEmitter

module.exports = Game

function Game(opts) {
  if (!(this instanceof Game)) return new Game(opts)
  var self = this
  if (!opts) opts = {}
  
  this.generateVoxel = opts.generateVoxel
  
  this.texturePath = opts.texturePath || '/textures/'
  
  this.cubeSize = opts.cubeSize || 25
  this.chunkSize = opts.chunkSize || 32
  this.chunkDistance = opts.chunkDistance || 2
  this.startingPosition = opts.startingPosition || new THREE.Vector3(35,1024,35)
  this.worldOrigin = opts.origin || new THREE.Vector3(0,0,0)
  
  this.material = this.loadTextures([ 'grass', 'grass_dirt', 'brick' ])
  
  this.height = window.innerHeight
  this.width = window.innerWidth
  this.scene = scene = new THREE.Scene()
  this.camera = this.createCamera(scene)
  this.renderer = this.createRenderer()
  this.controls = this.createControls()
  this.addLights(this.scene)
  this.moveToPosition(this.startingPosition)
  this.chunker = new Chunker(this)
  var chunks = this.chunker.generateMissingChunks(this.worldOrigin)
  this.addStats()
  window.addEventListener('resize', this.onWindowResize.bind(this), false)
  window.addEventListener('mousedown', this.onMouseDown.bind(this), false)
  window.addEventListener('mouseup', this.onMouseUp.bind(this), false)
  this.tick()
}

inherits(Game, EventEmitter)

Game.prototype.requestPointerLock = function() {
  requestPointerLock(this.controls)
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

Game.prototype.onMouseDown = function(e) {
  var intersection = this.raycast()
  if (intersection) this.emit('mousedown', intersection, e)
}

Game.prototype.onMouseUp = function(e) {
  var intersection = this.raycast()
  if (intersection) this.emit('mouseup', intersection, e)
}

Game.prototype.intersectAllMeshes = function(start, direction) {
  var self = this
  var meshes = []
  Object.keys(self.chunker.meshes).map(function(key) {
    meshes.push(self.chunker.meshes[key].surfaceMesh)
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
  var self = this;
  return new THREE.MeshFaceMaterial(names.map(function (name) {
    var tex = THREE.ImageUtils.loadTexture(self.texturePath + name + ".png")
    tex.magFilter = THREE.NearestFilter
    tex.minFilter = THREE.LinearMipMapLinearFilter
    
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
  var controls = new PointerLockControls(this.camera)
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

Game.prototype.getCollisions = function(position, checker) {
  var self = this
  var p = position.clone()
  var w = self.cubeSize / 4 // width of player cube
  var h = self.cubeSize * 1.5 // height of player cube

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
    return self.voxelAtPosition(vertex) && vertex
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
  var cid = game.chunker.chunkAtPosition(game.controls.yawObject.position).join('|')
  return game.chunker.meshes[cid]
}

Game.prototype.voxelIndex = function(pos) {
  var size = this.chunkSize
  var x = (size + Math.floor(pos.x / this.cubeSize)) % size
  var y = (size + Math.floor(pos.y / this.cubeSize)) % size
  var z = (size + Math.floor(pos.z / this.cubeSize)) % size
  var vidx = x + y*size + z*size*size
  return vidx
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
  
  var vidx = self.voxelIndex(p)
  var c = self.chunker.chunkAtPosition(p)
  var ckey = c.join('|')
  var chunk = self.chunker.chunks[ckey]
  if (!chunk) return false
  
  var collisions = self.getCollisions(self.controls.yawObject.position, check)
  if (collisions.top.length) return false
  if (collisions.middle.length) return false
  if (collisions.bottom.length) return false
  
  chunk.voxels[vidx] = val
  this.chunker.generateChunk(c[0], c[1], c[2])
  return true
  
  function check(v) { return vidx === self.voxelIndex(v) }
}

Game.prototype.setBlock = function(pos, val) {
  var hitVoxel = this.voxelAtPosition(pos, val)
  var c = this.chunker.chunkAtPosition(pos)
  this.chunker.generateChunk(c[0], c[1], c[2])
}

Game.prototype.getBlock = function(pos) {
  return this.voxelAtPosition(pos)
}

Game.prototype.voxelAtPosition = function(pos, val) {
  var ckey = this.chunker.chunkAtPosition(pos).join('|')
  var chunk = this.chunker.chunks[ckey]
  if (!chunk) return false
  var vidx = this.voxelIndex(pos)
  if (!vidx) return false
  if (typeof val !== 'undefined') {
    chunk.voxels[vidx] = val
  }
  var v = chunk.voxels[vidx]
  return v
}

Game.prototype.tick = function() {
  var self = this
  requestAnimationFrame( this.tick.bind(this) )
  var dt = Date.now() - this.time
  if (!this.time) dt = 1
  var cam = this.camera.position

  this.controls.update(dt, function (pos, velocity) {
    var collisions = self.getCollisions(self.controls.yawObject.position)
    
    if (collisions.middle.length || collisions.top.length) {
      self.controls.yawObject.translateX(-velocity.x)
      self.controls.yawObject.translateY(-velocity.y)
      self.controls.yawObject.translateZ(-velocity.z)
      velocity.x *= -1
      velocity.z *= -1
      velocity.y = Math.min(0, velocity.y)
    }
    
    if (collisions.bottom.length) {
      this.gravityEnabled = false
      velocity.y = Math.max(0, velocity.y)
    }
    else {
      this.gravityEnabled = true
    }
  })

  this.renderer.render(this.scene, this.camera)
  stats.update()
  this.time = Date.now()
}
