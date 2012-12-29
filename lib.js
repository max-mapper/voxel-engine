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
    this.textures = {}
    this.materials = {}
    this.height = window.innerHeight
    this.width = window.innerWidth
    this.scene = scene = new THREE.Scene()
    this.camera = this.createCamera(scene)
    this.renderer = this.createRenderer()
    this.controls = this.createControls()
    this.addLights(this.scene)
    new Floor(this, 50000, 50000).addToScene(this.scene)
    new VoxelMesh(voxel.geometry['Valley']).addToScene(this.scene)
    this.addStats()
    window.addEventListener( 'resize', this.onWindowResize.bind(this), false )
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
  };

  Game.prototype.createCamera = function() {
    var camera;
    camera = new THREE.PerspectiveCamera(45, this.width / this.height, 1, 10000)
    camera.lookAt(new THREE.Vector3(0, 0, 0))
    this.scene.add(camera)
    return camera
  };
  
  Game.prototype.createControls = function() {
    var controls = new THREE.PointerLockControls(this.camera)
    this.scene.add( controls.getObject() )
    return controls
  };

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
    this.controls.update( Date.now() - this.time )
    this.renderer.render(this.scene, this.camera)
    stats.update()
    this.time = Date.now()
  }

  return Game

})()
;var VoxelMesh = (function() {

  function VoxelMesh(data, scaleFactor) {
    var w = scaleFactor || 25
    var geometry  = new THREE.Geometry();    

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
    var surfacemesh  = new THREE.Mesh( geometry, material )

    surfacemesh.doubleSided = false

    // surfacemesh.position.x = -(bb.max.x + bb.min.x) / 2.0
    // surfacemesh.position.y = -(bb.max.y + bb.min.y) / 2.0
    // surfacemesh.position.z = -(bb.max.z + bb.min.z) / 2.0
    
    this.surfacemesh = surfacemesh
  }
  
  VoxelMesh.prototype.addToScene = function(scene) {
    scene.add( this.surfacemesh )
  }

  return VoxelMesh

})()
;
