var Grid = (function() {

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
    x = Math.floor(x / config.cubeSize);
    y = Math.floor(y / config.cubeSize);
    z = Math.floor(z / config.cubeSize);
    return [x, y, z];
  };

  return Grid;

})();
