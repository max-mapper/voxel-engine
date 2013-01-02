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
;var glMatrix = require('gl-matrix')

var Game = (function() {

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
    // this.downRay = new THREE.Raycaster()
    // this.downRay.ray.direction.set( 0, -1, 0 )
    // this.floor = new Floor(this, 50000, 50000)
    // this.floor.addToScene(this.scene)
    this.moveToPosition(this.startingPosition)
    this.player = new Player(this)
    this.player.setPosition([this.camera.position.x, this.camera.position.y, this.camera.position.z])
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
    requestAnimationFrame( this.tick.bind(this) )
    var dt = Date.now() - this.time
    if (!this.time) dt = 1
    var cam = this.camera.position
    // this.raycast()
    var subtracted = glMatrix.vec3.subtract(glMatrix.vec3.create(), [cam.x, cam.y, cam.z], this.player.position)
    this.player.acceleration = glMatrix.vec3.scale(glMatrix.vec3.create(), subtracted, 1.0 / dt);
    this.controls.update( dt )
    this.renderer.render(this.scene, this.camera)
    this.player.velocity = glMatrix.vec3.scale(glMatrix.vec3.create(), this.player.velocity, 0.99)
    this.player.tick(dt)
    glMatrix.vec3.set(this.player.position, cam.x, cam.y, cam.z)
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
;var vec3 = require('gl-matrix').vec3,
    sigma = 0.00001;

function AABB(){
    this.x0 = 0;
    this.y0 = 0;
    this.z0 = 0;
    this.x1 = 0;
    this.y1 = 0;
    this.z1 = 0;
}

function clipSegmentSegment(a0, a1, b0, b1){
    // before
    if(b1 < a0) {
        return a0-b1;
    }
    if(b0 > a1){
        return a1-b0;
    }
    return 0.0;
}
function clipSegmentPoint(a0, a1, b0){
    if(b0 < a0) return a0-b0;
    if(b0 > a1) return a1-b0;
    return 0.0;
}

function Contact(resolution, penetration){
    this.resolution = resolution;
    this.penetration = penetration;
}

function CapsuleY(x, y, z, height, radius){
    this.x = x;
    this.y = y;
    this.z = z;
    this.halfHeight = height*0.5;
    this.y0 = y-this.halfHeight;
    this.y1 = y+this.halfHeight;
    this.radius = radius;
}
CapsuleY.prototype.setPosition = function(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.y0 = y-this.halfHeight;
    this.y1 = y+this.halfHeight;
};
CapsuleY.prototype.updateAABB = function(aabb) {
    aabb.x0 = this.x-this.radius;
    aabb.x1 = this.x+this.radius;
    aabb.y0 = this.y0-this.radius;
    aabb.y1 = this.y1+this.radius;
    aabb.z0 = this.z-this.radius;
    aabb.z1 = this.z+this.radius;
};
CapsuleY.prototype.translate = function(offset) {
    this.setPosition(this.x+offset[0], this.y+offset[1], this.z+offset[2]);
}; 
CapsuleY.prototype.collideAABB = function(aabb) {
    var xd = clipSegmentPoint(aabb.x0, aabb.x1, this.x);
    var yd = clipSegmentSegment(aabb.y0, aabb.y1, this.y0, this.y1);
    var zd = clipSegmentPoint(aabb.z0, aabb.z1, this.z);
    var d2 = xd*xd + yd*yd + zd*zd;
    if(d2 >= this.radius*this.radius*0.99){
        return null;
    }
    var d = Math.sqrt(d2);
    var penetration = this.radius-d;
    var resolution = vec3.fromValues(-xd/d*penetration, -yd/d*penetration, -zd/d*penetration);
    var c = new Contact(resolution, penetration);
    c.aabb = aabb;
    return c;
}; 

function fitAABBtoGrid (aabb, scale) {
    aabb.x0 -= aabb.x0%scale+scale;
    aabb.y0 -= aabb.y0%scale+scale;
    aabb.z0 -= aabb.z0%scale+scale;
    aabb.x1 += (scale-aabb.x1%scale)+scale;
    aabb.y1 += (scale-aabb.y1%scale)+scale;
    aabb.z1 += (scale-aabb.z1%scale)+scale;
}

function Player(game) {
    this.shape = new CapsuleY(0, 0, 0, 1.0, 0.75);
    this.game = game;
    this.aabb = new AABB();
    this.position = vec3.create();
    this.velocity = vec3.create();
    this.acceleration = vec3.create();
    this.hadContact = false;
}
var auxv3 = vec3.create();
Player.prototype.setPosition = function(pos) {
    vec3.set(pos, this.position[0], this.position[1], this.position[2])
    this.shape.setPosition(pos[0], pos[1], pos[2])
};
Player.prototype.tick = function(td) {
    this.velocity = vec3.add(vec3.create(), this.velocity, vec3.scale(vec3.create(), this.acceleration, td, auxv3));
    if(this.hadContact) {
        // assume a constant normal force of .1 COF ~.5
        var friction = 0.05,
            speed = vec3.length(this.velocity);
        friction = Math.min(speed, friction);
        this.velocity = vec3.scale(vec3.create(), this.velocity, 1-friction/speed);
    }
    this.position = vec3.add(vec3.create(), this.position, vec3.scale(vec3.create(), this.velocity, td, auxv3));

    var game = this.game,
        scale = game.cubeSize,
        aabb = this.aabb,
        voxel;

    // prepare AABB
    this.shape.setPosition(this.position[0], this.position[0], this.position[0]);
    this.shape.updateAABB(aabb);
    fitAABBtoGrid(aabb, scale);
    var voxels = [];
    for(var x = aabb.x0; x < aabb.x1; x+=scale) {
        for(var y = aabb.y0; y < aabb.y1; y+=scale) {
            for(var z = aabb.z0; z < aabb.z1; z+=scale) {
                if(game.voxelSource.getVoxel(x, y, z) > 0){
                    voxel = new AABB();
                    voxel.x0 = x;
                    voxel.y0 = y;
                    voxel.z0 = z;
                    voxel.x1 = x+scale;
                    voxel.y1 = y+scale;
                    voxel.z1 = z+scale;
                    voxels.push(voxel);
                }
            }
        }
    }

    var penetration = vec3.create(),
        contact = null, maxContact = null;
    // this is pretty excessive, but it gives quite smooth results
    for(var iterations = 0; iterations < 100; iterations++) {
        for(var i = 0; i < voxels.length; i++) {
            voxel = voxels[i];
            contact = this.shape.collideAABB(voxel);
            if(contact !== null && (maxContact === null || contact.penetration > maxContact.penetration)){
                maxContact = contact;
            }
        }
        if(maxContact !== null){
            this.shape.translate(vec3.scale(vec3.create(), maxContact.resolution, 0.1));
            maxContact = null;
        }
        else {
            break;
        }

    }

    this.hadContact = iterations > 0;

    this.velocity[0] += this.shape.x-this.position[0];
    this.velocity[1] += this.shape.y-this.position[1];
    this.velocity[2] += this.shape.z-this.position[2];

    this.position[0] = this.shape.x;
    this.position[1] = this.shape.y;
    this.position[2] = this.shape.z;
};
