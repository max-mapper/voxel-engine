var CollisionHelper = (function() {

  function CollisionHelper(player, grid) {
    this.player = player;
    this.grid = grid;
    this.rad = config.cubeSize;
    this.halfRad = config.cubeSize / 2;
    return;
  }

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
