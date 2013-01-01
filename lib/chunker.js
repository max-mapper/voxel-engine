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
