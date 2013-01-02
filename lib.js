var Mesh = require('voxel-mesh')

function Chunker(game) {
  this.game = game
  this.chunks = {}
  this.meshes = {}
}

Chunker.prototype.generateMissingChunks = function(position) {
  var current = this.chunkAtPosition(position)
  var x = current[0]
  var y = current[1]
  var z = current[2]
  var size = this.game.voxelSource.chunkSize
  var dist = this.game.chunkDistance
  
  for (var cx = (x - dist); cx !== (x + dist); ++cx) {
    for (var cy = (y - dist); cy !== (y + dist); ++cy) {
      for (var cz = (z - dist); cz !== (z + dist); ++cz) {
        var chunkIndex = "" + cx + "|" + cy + "|" + cz
        if (!this.chunks[chunkIndex]) {
          var low = [cx * size, cy * size, cz * size]
          var high = [low[0] + size, low[1] + size, low[2] + size]
          var chunk = voxel.generate(low, high, this.game.voxelSource.getVoxel)
          var mesh = new Mesh(chunk, size)
          this.chunks[chunkIndex] = chunk
          this.meshes[chunkIndex] = mesh
          mesh.createWireMesh()
          mesh.setPosition(low[0] * size, low[1] * size, low[2] * size)
          mesh.addToScene(this.game.scene)
        }
      }
    }
  }
  return this.chunks
}

Chunker.prototype.chunkAtPosition = function(position) {
  var chunkSize = this.game.voxelSource.chunkSize
  var cubeSize = this.game.cubeSize
  return [
    Math.floor(position.x / cubeSize / chunkSize + 0.5),
    Math.floor(position.y / cubeSize / chunkSize + 0.5),
    Math.floor(position.z / cubeSize / chunkSize + 0.5)
  ]
};
var Floor = (function() {

  function Floor(game, width, height) {
    var repeatX = width / game.cubeSize
    var repeatY = height / game.cubeSize

    game.textures.bedrock = THREE.ImageUtils.loadTexture(game.texturePath + "bedrock.png")  
    game.textures.bedrock.repeat.set( repeatX, repeatY )
    game.textures.bedrock.wrapS = THREE.RepeatWrapping
    game.textures.bedrock.wrapT = THREE.RepeatWrapping
    
    game.materials.bedrock = new THREE.MeshLambertMaterial({
      map: game.textures.bedrock,
      ambient: 0xbbbbbb
    })
    
    var planeGeo = new THREE.PlaneGeometry(width, height, 1, 1)
    var plane = new THREE.Mesh(planeGeo, game.materials.bedrock)
    plane.position.y = -1
    plane.rotation.x = -Math.PI / 2
    plane.name = 'floor'
    this.game = game
    this.plane = plane
  }

  Floor.prototype.addToScene = function(scene) {
    return this.game.scene.add(this.plane)
  }

  return Floor

})()
;var Game = (function() {

  function Game(voxelSource) {
    var self = this
    this.voxelSource = voxelSource
    this.texturePath = './textures/'
    this.container = '#container'
    this.cubeSize = 10
    this.chunkDistance = 2
    this.startingPosition = new THREE.Vector3(0,1000,0)
    this.worldOrigin = new THREE.Vector3(0,0,0)
    this.textures = {}
    this.materials = {}
    this.height = window.innerHeight
    this.width = window.innerWidth
    this.scene = scene = new THREE.Scene()
    this.camera = this.createCamera(scene)
    this.renderer = this.createRenderer()
    this.controls = this.createControls()
    this.addLights(this.scene)
    this.moveToPosition(this.startingPosition)
    this.chunks = new Chunker(this)
    var chunks = this.chunks.generateMissingChunks(this.worldOrigin)
    this.addStats()
    window.addEventListener( 'resize', this.onWindowResize.bind(this), false )
    this.tick()
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

  Game.prototype.loadTexture = function(name) {
    this.textures[name] = THREE.ImageUtils.loadTexture(config.texturePath + name + ".png")
    this.textures[name].magFilter = THREE.NearestFilter
    this.materials[name] = new THREE.MeshLambertMaterial({map: this.textures[name], ambient: 0xbbbbbb})
    return this.textures[name]
  }

  Game.prototype.createCamera = function() {
    var camera;
    camera = new THREE.PerspectiveCamera(45, this.width / this.height, 1, 10000)
    camera.lookAt(new THREE.Vector3(0, 0, 0))
    this.scene.add(camera)
    return camera
  }
  
  Game.prototype.createControls = function() {
    var controls = new THREE.PointerLockControls(this.camera)
    this.scene.add( controls.yawObject )
    return controls
  }

  Game.prototype.createRenderer = function() {
    if( Detector.webgl ){
      renderer = new THREE.WebGLRenderer({
        antialias: true
      })
    } else {
      renderer = new THREE.CanvasRenderer()
    }
    renderer.setSize(this.width, this.height)
    renderer.setClearColorHex(0xBFD1E5, 1.0)
    renderer.clear()
    document.querySelector(this.container).appendChild(renderer.domElement)
    return renderer
  }
  
  Game.prototype.addStats = function() {
    stats = new Stats()
    stats.domElement.style.position  = 'absolute'
    stats.domElement.style.bottom  = '0px'
    document.body.appendChild( stats.domElement )
  }

  Game.prototype.addLights = function(scene) {
    var ambientLight, directionalLight
    ambientLight = new THREE.AmbientLight(0xaaaaaa)
    scene.add(ambientLight)
    var light	= new THREE.DirectionalLight( Math.random() * 0xffffff )
    light.position.set( Math.random(), Math.random(), Math.random() ).normalize()
    scene.add( light )
  };
  
  Game.prototype.tick = function() {
    var self = this
    requestAnimationFrame( this.tick.bind(this) )
    var dt = Date.now() - this.time
    if (!this.time) dt = 1
    var cam = this.camera.position
 
    this.controls.update(dt, function (pos) {
      var cast = new THREE.Raycaster(pos, new THREE.Vector3(0, 1, 0))
      var ckey = self.chunks.chunkAtPosition(pos).join('|')
      var chunk = self.chunks.chunks[ckey]
      if (!chunk) return
      var x = Math.round(pos.x % 32)
      var y = Math.round(pos.y % 32)
      var z = Math.round(pos.z % 32)
      
      var v = chunk.voxels[x + y*32 + z*32*32]
      if (v) console.dir(v)
    })
 
    this.renderer.render(this.scene, this.camera)
    stats.update()
    this.time = Date.now()
  }

  return Game

})()
;
