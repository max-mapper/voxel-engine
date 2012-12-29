window.Player = (function() {
  
  function Player(game) {
    this.width = config.cubeSize * 0.3;
    this.depth = config.cubeSize * 0.3;
    this.height = config.cubeSize * 1.63;
    this.halfHeight = this.height / 2;
    this.halfWidth = this.width / 2;
    this.halfDepth = this.depth / 2;
    this.game = game
    this.eyesDelta = this.halfHeight * 0.9;
  }

  Player.prototype.position = function(axis) {
    var pos = this.game.controls.getObject().position
    if (axis == null) {
      return pos
    }
    return pos[axis];
  };

  Player.prototype.setPosition = function(axis, val) {
    this.game.controls.getObject().position[axis] = val;
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
