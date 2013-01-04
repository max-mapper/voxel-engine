/**
 * @author mrdoob / http://mrdoob.com/
 */

THREE.PointerLockControls = function ( camera ) {
    var speed = {
        jump: 3,
        move: 0.12,
        fall: 0.3
    };

	var scope = this;
	var pitchObject = this.pitchObject = new THREE.Object3D();
	pitchObject.add( camera );

	var yawObject = this.yawObject = new THREE.Object3D();
	yawObject.position.y = 10;
	yawObject.add( pitchObject );

	var moveForward = false;
	var moveBackward = false;
	var moveLeft = false;
	var moveRight = false;

	var isOnObject = false;
	scope.canJump = false;

	var velocity = new THREE.Vector3();

	var PI_2 = Math.PI / 2;

	var onMouseMove = function ( event ) {

		if ( scope.enabled === false ) return;

		var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
		var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

		yawObject.rotation.y -= movementX * 0.002;
		pitchObject.rotation.x -= movementY * 0.002;

		pitchObject.rotation.x = Math.max( - PI_2, Math.min( PI_2, pitchObject.rotation.x ) );

	};

	var onKeyDown = function ( event ) {

		switch ( event.keyCode ) {

			case 38: // up
			case 87: // w
				moveForward = true;
				break;

			case 37: // left
			case 65: // a
				moveLeft = true; break;

			case 40: // down
			case 83: // s
				moveBackward = true;
				break;

			case 39: // right
			case 68: // d
				moveRight = true;
				break;

			case 32: // space
				if ( scope.canJump === true ) velocity.y += speed.jump;
				scope.canJump = false;
				break;

		}

	};

	var onKeyUp = function ( event ) {

		switch( event.keyCode ) {

			case 38: // up
			case 87: // w
				moveForward = false;
				break;

			case 37: // left
			case 65: // a
				moveLeft = false;
				break;

			case 40: // down
			case 83: // a
				moveBackward = false;
				break;

			case 39: // right
			case 68: // d
				moveRight = false;
				break;

		}

	};

	document.addEventListener( 'mousemove', onMouseMove, false );
	document.addEventListener( 'keydown', onKeyDown, false );
	document.addEventListener( 'keyup', onKeyUp, false );

	this.enabled = false;

	this.isOnObject = function ( boolean ) {

		isOnObject = boolean;
		scope.canJump = boolean;

	};

	this.update = function (delta, cb) {

		if ( scope.enabled === false ) return;

		delta *= 0.1;

		velocity.x += ( - velocity.x ) * 0.08 * delta;
		velocity.z += ( - velocity.z ) * 0.08 * delta;

		if (this.gravityEnabled) velocity.y -= speed.fall * delta;

		if ( moveForward ) velocity.z -= speed.move * delta;
		if ( moveBackward ) velocity.z += speed.move * delta;

		if ( moveLeft ) velocity.x -= speed.move * delta;
		if ( moveRight ) velocity.x += speed.move * delta;

		if ( isOnObject === true ) {

			velocity.y = Math.max( 0, velocity.y );

		}

        if (cb) cb.call(this, yawObject.position, velocity);
        
		yawObject.translateX( velocity.x );
		yawObject.translateY( velocity.y ); 
		yawObject.translateZ( velocity.z );

        if (velocity.y === 0) {
            scope.canJump = true;
        }

	};

};
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
  var dist = this.game.chunkDistance
  for (var cx = (x - dist); cx !== (x + dist); ++cx) {
    for (var cy = (y - dist); cy !== (y + dist); ++cy) {
      for (var cz = (z - dist); cz !== (z + dist); ++cz) {
        if (!this.chunks[[cx, cy, cz].join('|')]) {
          this.generateChunk(cx,cy,cz)
        }
      }
    }
  }
  return this.chunks
}

Chunker.prototype.generateChunk = function(x, y, z) {
  var self = this
  var chunkIndex = [x, y, z].join('|')
  var size = this.game.voxelSource.chunkSize
  var cubeSize = this.game.cubeSize
  var scale = new THREE.Vector3(cubeSize, cubeSize, cubeSize)
  var low = [x * size, y * size, z * size]
  var high = [low[0] + size, low[1] + size, low[2] + size]
  var meshObj = self.meshes[chunkIndex]
  var voxels
  if (meshObj) voxels = meshObj.data.voxels
  var chunk = voxel.generate(low, high, function(vx,vy,vz) {
    if (voxels) {
      var vId = self.game.voxelIndex(vx,vy,vz)
      vx = (size + vx) % size
      vy = (size + vy) % size
      vz = (size + vz) % size
      return voxels[vx + vy*size + vz*size*size]
    }
    return self.game.voxelSource.getVoxel(vx,vy,vz)
  })
  var mesh = new Mesh(chunk, scale)
  this.chunks[chunkIndex] = chunk
  if (this.meshes[chunkIndex]) this.game.scene.remove(this.meshes[chunkIndex].surfaceMesh)
  this.meshes[chunkIndex] = mesh
  mesh.createSurfaceMesh(this.game.material)
  mesh.setPosition(low[0] * cubeSize, low[1] * cubeSize, low[2] * cubeSize)
  mesh.addToScene(this.game.scene)
  this.applyTextures(mesh.geometry)
}

Chunker.prototype.chunkAtPosition = function(position) {
  var chunkSize = this.game.voxelSource.chunkSize
  var cubeSize = this.game.cubeSize
  var cx = position.x / cubeSize / chunkSize
  var cy = position.y / cubeSize / chunkSize
  var cz = position.z / cubeSize / chunkSize
  var chunkPos = [Math.floor(cx), Math.floor(cy), Math.floor(cz)]
  return chunkPos
};

Chunker.prototype.applyTextures = function (geom) {
  geom.faces.forEach(function (face) {
    face.materialIndex = 0
  })
}
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
    this.cubeSize = 25
    this.chunkDistance = 2
    this.startingPosition = new THREE.Vector3(35,1024,35)
    this.worldOrigin = new THREE.Vector3(0,0,0)
    this.material = this.loadTextures([ 'grass' ])
    
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
    window.addEventListener( 'mousedown', this.onMouseDown.bind(this), false )
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
  
  Game.prototype.addMarker = function(position) {
    var geometry = new THREE.SphereGeometry( 1, 4, 4 );
		var material = new THREE.MeshPhongMaterial( { color: 0xffffff, shading: THREE.FlatShading } );
		var mesh = new THREE.Mesh( geometry, material );
		mesh.position.copy(position)
		this.scene.add(mesh)
  }
  
  Game.prototype.onMouseDown = function(e) {
    var intersection = this.raycast()
    if (!intersection) return
		var hitVoxel = this.voxelAtPosition(intersection, 0)
		var c = this.chunker.chunkAtPosition(intersection)
		this.chunker.generateChunk(c[0], c[1], c[2])
  }
  
  Game.prototype.intersectAllMeshes = function(start, direction) {
    var meshes = []
    Object.keys(game.chunker.meshes).map(function(key) {
      meshes.push(game.chunker.meshes[key].surfaceMesh)
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
        ambient: 0xbbbbbb,
        vertexColors: THREE.VertexColors
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
  
  Game.prototype.currentMesh = function() {
    var cid = game.chunker.chunkAtPosition(game.controls.yawObject.position).join('|')
    return game.chunker.meshes[cid]
  }
  
  Game.prototype.cameraRotation = function() {
    var xAngle = this.controls.pitchObject.rotation.x
    var yAngle = this.controls.yawObject.rotation.y
    return {x: xAngle, y: yAngle}
  }
  
  Game.prototype.getCollisions = function(position) {
    var self = this
    var p = position.clone()
    var w = self.cubeSize / 4 // width of player cube
    var h = self.cubeSize // height of player cube

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
  
  Game.prototype.voxelIndex = function(pos) {
    var size = this.voxelSource.chunkSize
    var x = (size + Math.floor(pos.x / this.cubeSize)) % size
    var y = (size + Math.floor(pos.y / this.cubeSize)) % size
    var z = (size + Math.floor(pos.z / this.cubeSize)) % size
    var vidx = x + y*size + z*size*size
    return vidx
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