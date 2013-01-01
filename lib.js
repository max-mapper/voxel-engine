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
          // var highX = low[0] > 0 ? low[0] + size : low[0] - size
          // var highY = low[1] > 0 ? low[1] + size : low[1] - size
          // var highZ = low[2] > 0 ? low[2] + size : low[2] - size
          var high = [low[0] + size, low[1] + size, low[2] + size]
          var chunk = voxel.generate(low, high, this.game.voxelSource.getVoxel)
          var mesh = new Mesh(chunk, size)
          this.chunks[chunkIndex] = chunk
          this.meshes[chunkIndex] = mesh
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
    this.startingPosition = new THREE.Vector3(0,0,0)
    this.textures = {}
    this.materials = {}
    this.height = window.innerHeight
    this.width = window.innerWidth
    this.scene = scene = new THREE.Scene()
    this.camera = this.createCamera(scene)
    this.renderer = this.createRenderer()
    this.controls = this.createControls()

    this.addLights(this.scene)
    this.downRay = new THREE.Raycaster()
    this.downRay.ray.direction.set( 0, -1, 0 )
    // this.floor = new Floor(this, 50000, 50000)
    // this.floor.addToScene(this.scene)
    this.moveToPosition(this.startingPosition)
    this.chunks = new Chunker(this)
    var chunks = this.chunks.generateMissingChunks(this.startingPosition)
    
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
    requestAnimationFrame( this.tick.bind(this) )
    // this.raycast()
    this.controls.update( Date.now() - this.time )
    this.renderer.render(this.scene, this.camera)
    stats.update()
    this.time = Date.now()
  }
  
  Game.prototype.raycast = function() {
    this.controls.isOnObject( false );

		this.downRay.ray.origin.copy( this.controls.yawObject.position );
		this.downRay.ray.origin.y -= 10;

		var intersections = this.downRay.intersectObject( this.voxelMesh.surfaceMesh );

		if ( intersections.length > 0 ) {
			var distance = intersections[ 0 ].distance;
			if ( distance > 0 && distance < 10 ) {
				this.controls.isOnObject( true );
			}
		}
		
  }

  return Game

})()
;var Mesh = (function() {

  function Mesh(data, scaleFactor) {
    this.data = data
    var w = scaleFactor || 10
    var geometry  = new THREE.Geometry();    
    
    var mesher = voxel.meshers.greedy
    var result = mesher( data.voxels, data.dims )
    this.meshed = result

    geometry.vertices.length = 0
    geometry.faces.length = 0

    for (var i = 0; i < result.vertices.length; ++i) {
      var q = result.vertices[i]
      geometry.vertices.push(new THREE.Vector3(q[0]*w, q[1]*w, q[2]*w))
    } 
    
    for (var i = 0; i < result.faces.length; ++i) {
      var q = result.faces[i]
      if (q.length === 5) {
        var f = new THREE.Face4(q[0], q[1], q[2], q[3])
        f.color = new THREE.Color(q[4])
        f.vertexColors = [f.color,f.color,f.color,f.color]
        geometry.faces.push(f)
      } else if (q.length == 4) {
        var f = new THREE.Face3(q[0], q[1], q[2])
        f.color = new THREE.Color(q[3])
        f.vertexColors = [f.color,f.color,f.color]
        geometry.faces.push(f)
      }
    }
    
    geometry.computeFaceNormals()

    geometry.verticesNeedUpdate = true
    geometry.elementsNeedUpdate = true
    geometry.normalsNeedUpdate = true

    geometry.computeBoundingBox()
    geometry.computeBoundingSphere()

    var bb = geometry.boundingBox

    var material  = new THREE.MeshNormalMaterial()
    var surfaceMesh  = new THREE.Mesh( geometry, material )

    surfaceMesh.doubleSided = false
    
    var wirematerial = new THREE.MeshBasicMaterial({
        color : 0xffffff
      , wireframe : true
    });
    wiremesh = new THREE.Mesh(geometry, wirematerial);
    wiremesh.doubleSided = true;
    
    this.wireMesh = wiremesh
    this.surfaceMesh = surfaceMesh
  }
  
  Mesh.prototype.addToScene = function(scene) {
    // scene.add( this.surfaceMesh )
    scene.add( this.wireMesh )
  }
  
  Mesh.prototype.setPosition = function(x, y, z) {
    this.wireMesh.position = new THREE.Vector3(x, y, z)
  }

  return Mesh

})()
;
