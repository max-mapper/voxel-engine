var scene
var cubeSize = 50;

var blocks = ["cobblestone", "plank", "brick", "diamond", "glowstone", "obsidian", "whitewool", "bluewool", "redwool", "netherrack"];

var textures = {}
var materials = {}
var textureBasePath = './textures/'


Player = (function() {

  Player.prototype.width = cubeSize * 0.3;

  Player.prototype.depth = cubeSize * 0.3;

  Player.prototype.height = cubeSize * 1.63;

  function Player() {
    this.halfHeight = this.height / 2;
    this.halfWidth = this.width / 2;
    this.halfDepth = this.depth / 2;
    this.pos = new THREE.Vector3();
    this.eyesDelta = this.halfHeight * 0.9;
  }

  Player.prototype.eyesPosition = function() {
    var ret;
    ret = this.pos.clone();
    ret.y += this.eyesDelta;
    return ret;
  };

  Player.prototype.position = function(axis) {
    if (axis == null) {
      return this.pos;
    }
    return this.pos[axis];
  };

  Player.prototype.incPosition = function(axis, val) {
    this.pos[axis] += val;
  };

  Player.prototype.setPosition = function(axis, val) {
    this.pos[axis] = val;
  };

  Player.prototype.collidesWithGround = function() {
    return this.position('y') < this.halfHeight;
  };

  Player.prototype.vertex = function(vertexX, vertexY, vertexZ) {
    var vertex;
    vertex = this.position().clone();
    vertex.x += vertexX * this.halfWidth;
    vertex.y += vertexY * this.halfHeight;
    vertex.z += vertexZ * this.halfDepth;
    return vertex;
  };

  Player.prototype.boundingBox = function() {
    var vmax, vmin;
    vmin = this.vertex(-1, -1, -1);
    vmax = this.vertex(1, 1, 1);
    return {
      vmin: vmin,
      vmax: vmax
    };
  };

  return Player;

})();

Grid = (function() {

  function Grid(size) {
    var _this = this;
    this.size = size != null ? size : 5;
    this.matrix = [];
    utils.times(this.size, function(i) {
      _this.matrix[i] = [];
      return utils.times(_this.size, function(j) {
        return _this.matrix[i][j] = [];
      });
    });
  }

  Grid.prototype.insideGrid = function(x, y, z) {
    return (0 <= x && x < this.size) && (0 <= y && y < this.size) && (0 <= z && z < this.size);
  };

  Grid.prototype.get = function(x, y, z) {
    return this.matrix[x][y][z];
  };

  Grid.prototype.put = function(x, y, z, val) {
    return this.matrix[x][y][z] = val;
  };

  Grid.prototype.gridCoords = function(x, y, z) {
    x = Math.floor(x / cubeSize);
    y = Math.floor(y / cubeSize);
    z = Math.floor(z / cubeSize);
    return [x, y, z];
  };

  return Grid;

})();

CollisionHelper = (function() {

  function CollisionHelper(player, grid) {
    this.player = player;
    this.grid = grid;
    return;
  }

  CollisionHelper.prototype.rad = cubeSize;

  CollisionHelper.prototype.halfRad = cubeSize / 2;

  CollisionHelper.prototype.collides = function() {
    var cube, playerBox, _i, _len, _ref;
    if (this.player.collidesWithGround()) {
      return true;
    }
    if (this.beyondBounds()) {
      return true;
    }
    playerBox = this.player.boundingBox();
    _ref = this.possibleCubes();
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      cube = _ref[_i];
      if (this._collideWithCube(playerBox, cube)) {
        return true;
      }
    }
    return false;
  };

  CollisionHelper.prototype.beyondBounds = function() {
    var p, x, y, z, _ref;
    p = this.player.position();
    _ref = this.grid.gridCoords(p.x, p.y, p.z), x = _ref[0], y = _ref[1], z = _ref[2];
    if (!this.grid.insideGrid(x, 0, z)) {
      return true;
    }
  };

  CollisionHelper.prototype._addToPosition = function(position, value) {
    var pos;
    pos = position.clone();
    pos.x += value;
    pos.y += value;
    pos.z += value;
    return pos;
  };

  CollisionHelper.prototype.collideWithCube = function(cube) {
    return this._collideWithCube(this.player.boundingBox(), cube);
  };

  CollisionHelper.prototype._collideWithCube = function(playerBox, cube) {
    var cubeBox, vmax, vmin;
    vmin = this._addToPosition(cube.position, -this.halfRad);
    vmax = this._addToPosition(cube.position, this.halfRad);
    cubeBox = {
      vmin: vmin,
      vmax: vmax
    };
    return CollisionUtils.testCubeCollision(playerBox, cubeBox);
  };

  CollisionHelper.prototype.possibleCubes = function() {
    var cubes, grid;
    cubes = [];
    grid = this.grid;
    this.withRange(function(x, y, z) {
      var cube;
      cube = grid.get(x, y, z);
      if (cube != null) {
        return cubes.push(cube);
      }
    });
    return cubes;
  };

  CollisionHelper.prototype.withRange = function(func) {
    var maxx, maxy, maxz, minx, miny, minz, vmax, vmin, x, y, z, _ref;
    _ref = this.player.boundingBox(), vmin = _ref.vmin, vmax = _ref.vmax;
    minx = this.toGrid(vmin.x);
    miny = this.toGrid(vmin.y);
    minz = this.toGrid(vmin.z);
    maxx = this.toGrid(vmax.x + this.rad);
    maxy = this.toGrid(vmax.y + this.rad);
    maxz = this.toGrid(vmax.z + this.rad);
    x = minx;
    while (x <= maxx) {
      y = miny;
      while (y <= maxy) {
        z = minz;
        while (z <= maxz) {
          func(x, y, z);
          z++;
        }
        y++;
      }
      x++;
    }
  };

  CollisionHelper.prototype.toGrid = function(val) {
    var ret;
    ret = Math.floor(val / this.rad);
    if (ret < 0) {
      return 0;
    }
    if (ret > this.grid.size - 1) {
      return this.grid.size - 1;
    }
    return ret;
  };

  return CollisionHelper;

})();


Floor = (function() {

  function Floor(width, height) {
    var plane, planeGeo, repeatX, repeatY;
    repeatX = width / cubeSize;
    repeatY = height / cubeSize;

    textures.bedrock = THREE.ImageUtils.loadTexture(textureBasePath + "bedrock.png")  
    materials.bedrock = new THREE.MeshBasicMaterial({map: textures.bedrock})
    
    planeGeo = new THREE.PlaneGeometry(width, height, 1, 1);
    plane = new THREE.Mesh(planeGeo, materials.bedrock);
    plane.position.y = -1;
    plane.rotation.x = -Math.PI / 2;
    plane.name = 'floor';
    this.plane = plane;
  }

  Floor.prototype.addToScene = function(scene) {
    return scene.add(this.plane);
  };

  return Floor;

})();

Game = (function() {

  function Game() {
    this.rad = cubeSize;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.geo = new THREE.CubeGeometry(this.rad, this.rad, this.rad, 1, 1, 1);
    this.move = {
      x: 0,
      z: 0,
      y: 0
    };
    this.keysDown = {};
    this.grid = new Grid(100);
    this.onGround = true;
    this.pause = false;
    this.renderer = this.createRenderer();
    this.camera = this.createCamera();
    this.canvas = this.renderer.domElement;
    // this.controls = new THREE.PointerLockControls( this.camera );
    this.controls = new Controls(this.camera, this.canvas);
    this.player = new Player();
    this.scene = new THREE.Scene();
    scene = this.scene
    new Floor(50000, 50000).addToScene(this.scene)
    this.scene.add(this.camera);
    this.addLights(this.scene);
    // this.scene.add( this.controls.getObject() )
    this.projector = new THREE.Projector();
    this.castRay = null;
    this.moved = false;
    this.toDelete = null;
    this.collisionHelper = new CollisionHelper(this.player, this.grid);
    this.clock = new THREE.Clock();
    this.populateWorld();
    this.defineControls();
  }


  Game.prototype.createGrassMaterials = function() {
    var grassMaterials = ['grass_dirt', 'grass_dirt', 'grass', 'dirt', 'grass_dirt', 'grass_dirt']
    this.textures(grassMaterials)
    console.log(textures, materials)
    grassMaterials = grassMaterials.map(function(material) {
      
    })
    return;
  };

  Game.prototype.texture = function(name) {
    textures[name] = THREE.ImageUtils.loadTexture(textureBasePath + name + ".png")
    materials[name] = new THREE.MeshBasicMaterial({map: textures[name]})
    return textures[name]
  };

  Game.prototype.textures = function() {
    var name, names;
    names = 1 <= arguments.length ? Array.prototype.slice.call(arguments, 0) : [];
    return (function() {
      var _i, _len, _results;
      _results = [];
      for (_i = 0, _len = names.length; _i < _len; _i++) {
        name = names[_i];
        _results.push(this.texture(name));
      }
      return _results;
    }).call(this);
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
          playerHeight = (height + 1) * cubeSize;
        }
        utils.times(height, function(k) {
          return _this.cubeAt(middle + i, k, middle + j);
        });
      }
    }
    middlePos = middle * cubeSize;
    return this.player.pos.set(middlePos, playerHeight, middlePos);
  };

  Game.prototype.cubeAt = function(x, y, z, geo, validatingFunction) {
    var halfcube, mesh;
    geo || (geo = this.geo);
    mesh = new THREE.Mesh(geo, this.createGrassMaterials());
    mesh.geometry.dynamic = false;
    halfcube = cubeSize / 2;
    mesh.position.set(cubeSize * x, y * cubeSize + halfcube, cubeSize * z);
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
    p = target.object.position.clone().addSelf(normal.multiplyScalar(cubeSize));
    return p;
  };

  Game.prototype.addHalfCube = function(p) {
    p.y += cubeSize / 2;
    p.z += cubeSize / 2;
    p.x += cubeSize / 2;
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
    return dist <= cubeSize * this.handLength;
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

  Game.prototype.iterationCount = 10;

  Game.prototype.moveCube = function(speedRatio) {
    var axis, iterationCount, originalpos, _i, _len, _ref;
    this.defineMove();
    iterationCount = Math.round(this.iterationCount * speedRatio);
    while (iterationCount-- > 0) {
      this.applyGravity();
      _ref = this.axes;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        axis = _ref[_i];
        if (!(this.move[axis] !== 0)) {
          continue;
        }
        originalpos = this.player.position(axis);
        this.player.incPosition(axis, this.move[axis]);
        if (this.collides()) {
          this.player.setPosition(axis, originalpos);
          if (axis === 'y' && this.move.y < 0) {
            this.onGround = true;
          }
        } else if (axis === 'y' && this.move.y <= 0) {
          this.onGround = false;
        }
      }
    }
  };

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

  Game.prototype.applyGravity = function() {
    if (!(this.move.y < -1)) {
      return this.move.y -= .005;
    }
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
    var speedRatio;
    speedRatio = this.clock.getDelta() / this.idealSpeed;
    this.placeBlock();
    this.deleteBlock();
    this.moveCube(speedRatio);
    this.renderer.clear();
    this.controls.update();
    this.setCameraEyes();
    this.renderer.render(this.scene, this.camera);
  };

  return Game;

})();

function startGame() {
  var game;
  game = new Game();
  return game.start();
};

startGame()