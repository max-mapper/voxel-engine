var Game = (function() {

  function Game(voxelSource) {
    var self = this
    this.voxelSource = voxelSource
    this.texturePath = './textures/'
    this.container = '#container'
    this.cubeSize = 50
    this.chunkDistance = 2
    this.startingPosition = new THREE.Vector3(35,1024,35)
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
    this.chunker = new Chunker(this)
    var chunks = this.chunker.generateMissingChunks(this.worldOrigin)
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
  
  Game.prototype.highlightCurrentChunk = function() {
    var cid = game.chunker.chunkAtPosition(game.controls.yawObject.position).join('|')
    game.chunker.meshes[cid].wireMesh.material.color.setHex(0xff0000)
  }
  
  Game.prototype.voxelInPath = function() {
    var xAngle = this.controls.pitchObject.rotation.x
    var yAngle = this.controls.yawObject.rotation.y
    console.log(xAngle,yAngle)
  }
  
  Game.prototype.getCollisions = function(position) {
    var self = this
    var p = position.clone()
    var w = 15 // width of player cube
    var h = 30 // height of player cube

    var vertices = {
      bottom: [
        new THREE.Vector3(p.x - w, p.y - h, p.z - w),
        new THREE.Vector3(p.x - w, p.y - h, p.z + w),
        new THREE.Vector3(p.x + w, p.y - h, p.z - w),
        new THREE.Vector3(p.x + w, p.y - h, p.z + w)
      ],
      middle: [
        new THREE.Vector3(p.x - w, p.y, p.z - w),
        new THREE.Vector3(p.x - w, p.y, p.z + w),
        new THREE.Vector3(p.x + w, p.y, p.z - w),
        new THREE.Vector3(p.x + w, p.y, p.z + w)
      ],
      top: [
        new THREE.Vector3(p.x - w, p.y + h, p.z - w),
        new THREE.Vector3(p.x - w, p.y + h, p.z + w),
        new THREE.Vector3(p.x + w, p.y + h, p.z - w),
        new THREE.Vector3(p.x + w, p.y + h, p.z + w)
      ],
    }

    return {
      bottom: vertices.bottom.map(check).filter(Boolean),
      middle: vertices.middle.map(check).filter(Boolean),
      top: vertices.top.map(check).filter(Boolean)
    }
    
    function check(vertex) {
      return self.voxelAtPosition(vertex) && vertex
    }
  }
  
  Game.prototype.voxelAtPosition = function(pos) {
    var ckey = this.chunker.chunkAtPosition(pos).join('|')
    var chunk = this.chunker.chunks[ckey]
    if (!chunk) return false
    var size = this.voxelSource.chunkSize
    var x = (size + Math.floor(pos.x / this.cubeSize)) % size
    var y = (size + Math.floor(pos.y / this.cubeSize)) % size
    var z = (size + Math.floor(pos.z / this.cubeSize)) % size
    var v = chunk.voxels[x + y*size + z*size*size]
    return v
  }
  
  Game.prototype.tick = function() {
    var self = this
    requestAnimationFrame( this.tick.bind(this) )
    var dt = Date.now() - this.time
    if (!this.time) dt = 1
    var cam = this.camera.position
 
    this.controls.update(dt, function (pos, velocity) {
      var collisions = self.getCollisions(game.controls.yawObject.position)
      
      if (collisions.middle.length) {
        game.controls.yawObject.translateX(-velocity.x)
        game.controls.yawObject.translateZ(-velocity.z)
        velocity.x *= -1
        velocity.z *= -1
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

  return Game

})()
;
