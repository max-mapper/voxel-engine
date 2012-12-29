Game = (function() {

  function Game() {
    this.textures = {}
    this.materials = {}
    this.grassMaterial = new THREE.MeshFaceMaterial( this.createGrassMaterials() )
    this.rad = config.cubeSize;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.geo = new THREE.CubeGeometry(this.rad, this.rad, this.rad, 10, 10, 10);
    this.keysDown = {};
    this.grid = new Grid(100);
    this.onGround = true;
    this.pause = false;
    this.renderer = this.createRenderer();
    this.camera = this.createCamera();
    this.canvas = this.renderer.domElement;
    this.controls = new THREE.PointerLockControls( this );
    this.player = new Player(this);
    this.scene = new THREE.Scene();
    new Floor(this, 50000, 50000).addToScene(this.scene)
    this.addLights(this.scene);
    this.scene.add( this.controls.getObject() )
    this.projector = new THREE.Projector()
    this.castRay = null;
    this.moved = false;
    this.toDelete = null;
    this.collisionHelper = new CollisionHelper(this.player, this.grid);
    this.clock = new THREE.Clock();
    this.populateWorld();
    window.addEventListener( 'resize', this.onWindowResize.bind(this), false );
  }
  

  Game.prototype.onWindowResize = function() {
  	this.camera.aspect = window.innerWidth / window.innerHeight;
  	this.camera.updateProjectionMatrix();
  	this.renderer.setSize( window.innerWidth, window.innerHeight );
  }

  Game.prototype.createGrassMaterials = function() {
    var self = this
    var grassMaterials = ['grass_dirt', 'grass_dirt', 'grass', 'dirt', 'grass_dirt', 'grass_dirt']
    this.loadTextures(grassMaterials)
    grassMaterials = grassMaterials.map(function(material) {
      return new THREE.MeshLambertMaterial({map: self.textures[material]});
    })
    return grassMaterials
  };

  Game.prototype.loadTexture = function(name) {
    this.textures[name] = THREE.ImageUtils.loadTexture(config.texturePath + name + ".png")
    this.textures[name].magFilter = THREE.NearestFilter
    this.materials[name] = new THREE.MeshLambertMaterial({map: this.textures[name], ambient: 0xbbbbbb})
    return this.textures[name]
  };

  Game.prototype.loadTextures = function(names) {
    var results = []
    for (var _i = 0, _len = names.length; _i < _len; _i++) {
      results.push(this.loadTexture(names[_i]))
    }
    return results
  };

  Game.prototype.gridCoords = function(x, y, z) {
    return this.grid.gridCoords(x, y, z);
  };

  Game.prototype.intoGrid = function(x, y, z, val) {
    var args, _ref;
    args = this.gridCoords(x, y, z).concat(val);
    return (_ref = this.grid).put.apply(_ref, args);
  };

  Game.prototype.generateHeight = function() {
    var data, perlin, quality, size, z;
    size = 11;
    data = [];
    utils.times(size, function(i) {
      data[i] = [];
      return utils.times(size, function(j) {
        return data[i][j] = 0;
      });
    });
    perlin = new ImprovedNoise();
    quality = 0.05;
    z = Math.random() * 100;
    utils.times(4, function(j) {
      utils.times(size, function(x) {
        return utils.times(size, function(y) {
          var noise;
          noise = perlin.noise(x / quality, y / quality, z);
          return data[x][y] += noise * quality;
        });
      });
      return quality *= 4;
    });
    return data;
  };

  Game.prototype.populateWorld = function() {
    var data, height, i, j, middle, middlePos, playerHeight, _i, _j,
      _this = this;
    middle = this.grid.size / 2;
    data = this.generateHeight();
    playerHeight = null;
    for (i = _i = -5; _i <= 5; i = ++_i) {
      for (j = _j = -5; _j <= 5; j = ++_j) {
        height = (Math.abs(Math.floor(data[i + 5][j + 5]))) + 1;
        if (i === 0 && j === 0) {
          playerHeight = (height + 1) * config.cubeSize;
        }
        utils.times(height, function(k) {
          return _this.cubeAt(middle + i, k, middle + j);
        });
      }
    }
    middlePos = middle * config.cubeSize;
    this.controls.getObject().position.set(middlePos, playerHeight, middlePos);
    return
  };

  Game.prototype.cubeAt = function(x, y, z, geo, validatingFunction) {
    var halfcube, mesh;
    geo || (geo = this.geo);
    mesh = new THREE.Mesh(geo, this.grassMaterial );
    mesh.geometry.dynamic = false;
    halfcube = config.cubeSize / 2;
    mesh.position.set(config.cubeSize * x, y * config.cubeSize + halfcube, config.cubeSize * z);
    mesh.name = "block";
    if (validatingFunction != null) {
      if (!validatingFunction(mesh)) {
        return;
      }
    }
    this.grid.put(x, y, z, mesh);
    this.scene.add(mesh);
    mesh.updateMatrix();
    mesh.matrixAutoUpdate = false;
  };

  Game.prototype.createCamera = function() {
    var camera;
    camera = new THREE.PerspectiveCamera(45, this.width / this.height, 1, 10000);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    return camera;
  };

  Game.prototype.createRenderer = function() {
    var renderer;
    renderer = new THREE.WebGLRenderer({
      antialias: true
    });
    renderer.setSize(this.width, this.height);
    renderer.setClearColorHex(0xBFD1E5, 1.0);
    renderer.clear();
    document.querySelector('#container').appendChild(renderer.domElement);
    return renderer;
  };

  Game.prototype.addLights = function(scene) {
    var ambientLight, directionalLight;
    ambientLight = new THREE.AmbientLight(0xaaaaaa);
    scene.add(ambientLight);
    directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 0.5);
    directionalLight.position.normalize();
    return scene.add(directionalLight);
  };

  Game.prototype.defineControls = function() {
    return
    var bindit, key, _i, _len, _ref,
      _this = this;
    bindit = function(key) {
      $(document).bind('keydown', key, function() {
        return _this.keysDown[key] = true;
      });
      return $(document).bind('keyup', key, function() {
        return _this.keysDown[key] = false;
      });
    };
    _ref = "wasd".split('').concat('space');
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      key = _ref[_i];
      bindit(key);
    }
    $(document).bind('keydown', 'p', function() {
      return _this.togglePause();
    });
    $(this.canvas).mousedown(function(e) {
      return _this.onMouseDown(e);
    });
    $(this.canvas).mouseup(function(e) {
      return _this.onMouseUp(e);
    });
    return $(this.canvas).mousemove(function(e) {
      return _this.onMouseMove(e);
    });
  };

  Game.prototype.togglePause = function() {
    this.pause = !this.pause;
    if (this.pause === false) {
      this.clock.start();
    }
  };

  Game.prototype.onMouseUp = function(event) {
    if (!this.moved && MouseEvent.isLeftButton(event)) {
      this.toDelete = [event.pageX, event.pageY];
    }
    return this.moved = false;
  };

  Game.prototype.onMouseMove = function(event) {
    return this.moved = true;
  };

  Game.prototype.onMouseDown = function(event) {
    this.moved = false;
    if (!MouseEvent.isRightButton(event)) {
      return;
    }
    return this.castRay = [event.pageX, event.pageY];
  };

  Game.prototype.deleteBlock = function() {
    var todir, vector, x, y, _ref;
    if (this.toDelete == null) {
      return;
    }
    _ref = this.toDelete, x = _ref[0], y = _ref[1];
    x = (x / this.width) * 2 - 1;
    y = (-y / this.height) * 2 + 1;
    vector = new THREE.Vector3(x, y, 1);
    this.projector.unprojectVector(vector, this.camera);
    todir = vector.subSelf(this.camera.position).normalize();
    this.deleteBlockInGrid(new Ray(this.camera.position, todir));
    this.toDelete = null;
  };

  Game.prototype.findBlock = function(ray) {
    var o, _i, _len, _ref;
    _ref = ray.intersectScene(this.scene);
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      o = _ref[_i];
      if (o.object.name !== 'floor') {
        return o;
      }
    }
    return null;
  };

  Game.prototype.deleteBlockInGrid = function(ray) {
    var mesh, target, x, y, z, _ref;
    target = this.findBlock(ray);
    if (target == null) {
      return;
    }
    if (!this.withinHandDistance(target.object.position)) {
      return;
    }
    mesh = target.object;
    this.scene.remove(mesh);
    _ref = mesh.position, x = _ref.x, y = _ref.y, z = _ref.z;
    this.intoGrid(x, y, z, null);
  };

  Game.prototype.placeBlock = function() {
    var todir, vector, x, y, _ref;
    if (this.castRay == null) {
      return;
    }
    _ref = this.castRay, x = _ref[0], y = _ref[1];
    x = (x / this.width) * 2 - 1;
    y = (-y / this.height) * 2 + 1;
    vector = new THREE.Vector3(x, y, 1);
    this.projector.unprojectVector(vector, this.camera);
    todir = vector.subSelf(this.camera.position).normalize();
    this.placeBlockInGrid(new Ray(this.camera.position, todir));
    this.castRay = null;
  };

  Game.prototype.getAdjacentCubePosition = function(target) {
    var normal, p;
    normal = target.face.normal.clone();
    p = target.object.position.clone().addSelf(normal.multiplyScalar(config.cubeSize));
    return p;
  };

  Game.prototype.addHalfCube = function(p) {
    p.y += config.cubeSize / 2;
    p.z += config.cubeSize / 2;
    p.x += config.cubeSize / 2;
    return p;
  };

  Game.prototype.getCubeOnFloorPosition = function(ray) {
    var o, ret, t, v;
    if (ray.direction.y >= 0) {
      return null;
    }
    ret = new THREE.Vector3();
    o = ray.origin;
    v = ray.direction;
    t = (-o.y) / v.y;
    ret.y = 0;
    ret.x = o.x + t * v.x;
    ret.z = o.z + t * v.z;
    return this.addHalfCube(ret);
  };

  Game.prototype.getNewCubePosition = function(ray) {
    var target;
    target = this.findBlock(ray);
    if (target == null) {
      return this.getCubeOnFloorPosition(ray);
    }
    return this.getAdjacentCubePosition(target);
  };

  Game.prototype.createCubeAt = function(x, y, z) {
    var _this = this;
    return this.cubeAt(x, y, z, _this.geo, function(cube) {
      return !_this.collisionHelper.collideWithCube(cube);
    });
  };

  Game.prototype.handLength = 7;

  Game.prototype.withinHandDistance = function(pos) {
    var dist;
    dist = pos.distanceTo(this.player.position());
    return dist <= config.cubeSize * this.handLength;
  };

  Game.prototype.placeBlockInGrid = function(ray) {
    var gridPos, p, x, y, z;
    p = this.getNewCubePosition(ray);
    if (p == null) {
      return;
    }
    gridPos = this.gridCoords(p.x, p.y, p.z);
    x = gridPos[0], y = gridPos[1], z = gridPos[2];
    if (!this.withinHandDistance(p)) {
      return;
    }
    if (!this.grid.insideGrid(x, y, z)) {
      return;
    }
    if (this.grid.get(x, y, z) != null) {
      return;
    }
    this.createCubeAt(x, y, z);
  };

  Game.prototype.collides = function() {
    return this.collisionHelper.collides();
  };

  Game.prototype.start = function() {
    var animate,
      _this = this;
    animate = function() {
      if (!_this.pause) {
        _this.tick();
      }
      return requestAnimationFrame(animate, _this.renderer.domElement);
    };
    return animate();
  };

  Game.prototype.axes = ['x', 'y', 'z'];

  Game.prototype.playerKeys = {
    w: 'z+',
    s: 'z-',
    a: 'x+',
    d: 'x-'
  };

  Game.prototype.shouldJump = function() {
    return this.keysDown.space && this.onGround;
  };

  Game.prototype.defineMove = function() {
    var action, axis, baseVel, jumpSpeed, key, operation, vel, _ref;
    baseVel = .4;
    jumpSpeed = .8;
    this.move.x = 0;
    this.move.z = 0;
    _ref = this.playerKeys;
    for (key in _ref) {
      action = _ref[key];
      axis = action[0], operation = action[1];
      vel = operation === '-' ? -baseVel : baseVel;
      if (this.keysDown[key]) {
        this.move[axis] += vel;
      }
    }
    if (this.shouldJump()) {
      this.onGround = false;
      this.move.y = jumpSpeed;
    }
    this.garanteeXYNorm();
    this.projectMoveOnCamera();
  };

  Game.prototype.garanteeXYNorm = function() {
    var ratio;
    if (this.move.x !== 0 && this.move.z !== 0) {
      ratio = Math.cos(Math.PI / 4);
      this.move.x *= ratio;
      this.move.z *= ratio;
    }
  };

  Game.prototype.projectMoveOnCamera = function() {
    var frontDir, rightDir, x, z, _ref;
    _ref = this.controls.viewDirection(), x = _ref.x, z = _ref.z;
    frontDir = new THREE.Vector2(x, z).normalize();
    rightDir = new THREE.Vector2(frontDir.y, -frontDir.x);
    frontDir.multiplyScalar(this.move.z);
    rightDir.multiplyScalar(this.move.x);
    this.move.x = frontDir.x + rightDir.x;
    return this.move.z = frontDir.y + rightDir.y;
  };

  Game.prototype.setCameraEyes = function() {
    var eyesDelta, pos;
    pos = this.player.eyesPosition();
    this.controls.move(pos);
    eyesDelta = this.controls.viewDirection().normalize().multiplyScalar(20);
    eyesDelta.y = 0;
    pos.subSelf(eyesDelta);
  };

  Game.prototype.idealSpeed = 1 / 60;

  Game.prototype.tick = function() {
    var delta = this.clock.getDelta()
    // this.placeBlock();
    // this.deleteBlock();
    // this.moveCube();
    // this.renderer.clear();
    this.controls.update( delta );
    // this.setCameraEyes();
    this.renderer.render(this.scene, this.camera);
  };

  return Game;

})();
