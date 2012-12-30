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

  function Game() {
    this.texturePath = './textures/'
    this.container = '#container'
    this.cubeSize = 50
    this.startingPosition = new THREE.Vector3(697.9982429650095,850.6249999999999,467.99816400063776)
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
    this.floor = new Floor(this, 50000, 50000)
    this.floor.addToScene(this.scene)
    this.voxelMesh = new VoxelMesh([128, 32, 128])
    this.voxelMesh.addToScene(this.scene)
    this.moveToPosition(this.startingPosition)
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
    this.raycast()
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
;var VoxelMesh = (function() {

  function VoxelMesh(dimensions, scaleFactor) {
    var w = scaleFactor || 25
    var geometry  = new THREE.Geometry();    
    
    var data = this.generateTerrain(dimensions)
    var mesher = voxel.meshers.greedy
    var result = mesher( data.voxels, data.dims )

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

    // Create surface mesh
    var material  = new THREE.MeshNormalMaterial()
    var surfaceMesh  = new THREE.Mesh( geometry, material )

    surfaceMesh.doubleSided = false

    // surfaceMesh.position.x = -(bb.max.x + bb.min.x) / 2.0
    // surfaceMesh.position.y = -(bb.max.y + bb.min.y) / 2.0
    // surfaceMesh.position.z = -(bb.max.z + bb.min.z) / 2.0
    
    this.surfaceMesh = surfaceMesh
  }
  
  VoxelMesh.prototype.addToScene = function(scene) {
    scene.add( this.surfaceMesh )
  }

  VoxelMesh.prototype.generateTerrain = function(dimensions) {
    return voxel.generate([0, 0, 0], dimensions, function(i,j,k) {
      var h0 = 3.0 * Math.sin(Math.PI * i / 12.0 - Math.PI * k * 0.1) + 27;    
      if(j > h0+1) {
        return 0;
      }
      if(h0 <= j) {
        return 0x23dd31;
      }
      var h1 = 2.0 * Math.sin(Math.PI * i * 0.25 - Math.PI * k * 0.3) + 20;
      if(h1 <= j) {
        return 0x964B00;
      }
      if(2 < j) {
        return Math.random() < 0.1 ? 0x222222 : 0xaaaaaa;
      }
      return 0xff0000;
    });
  }

  return VoxelMesh

})()
;
