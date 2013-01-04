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
  var cubeSize = this.game.cubeSize
  var scale = new THREE.Vector3(cubeSize, cubeSize, cubeSize)
  
  for (var cx = (x - dist); cx !== (x + dist); ++cx) {
    for (var cy = (y - dist); cy !== (y + dist); ++cy) {
      for (var cz = (z - dist); cz !== (z + dist); ++cz) {
        var chunkIndex = "" + cx + "|" + cy + "|" + cz
        if (!this.chunks[chunkIndex]) {
          var low = [cx * size, cy * size, cz * size]
          var high = [low[0] + size, low[1] + size, low[2] + size]
          var chunk = voxel.generate(low, high, this.game.voxelSource.getVoxel)
          var mesh = new Mesh(chunk, scale)
          this.chunks[chunkIndex] = chunk
          this.meshes[chunkIndex] = mesh
          mesh.createSurfaceMesh(this.game.material)
          mesh.setPosition(low[0] * cubeSize, low[1] * cubeSize, low[2] * cubeSize)
          mesh.addToScene(this.game.scene)
          this.applyTextures(mesh.geometry)
        }
      }
    }
  }
  return this.chunks
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
  var vmap = []
  for (var i = 0; i < geom.vertices.length; i += 4) {
    vmap.push([
      geom.vertices[i+0],
      geom.vertices[i+1],
      geom.vertices[i+2],
      geom.vertices[i+3]
    ])
  }
  
  geom.faces.forEach(function (face, ix) {
    var vs = vmap[ix]
    var dx = Math.max(
      Math.abs(vs[0].x - vs[1].x),
      Math.abs(vs[1].x - vs[2].x)
    )
    var dy = Math.max(
      Math.abs(vs[0].y - vs[1].y),
      Math.abs(vs[1].y - vs[2].y)
    )
    var dz = Math.max(
      Math.abs(vs[0].z - vs[1].z),
      Math.abs(vs[1].z - vs[2].z)
    )
    if (dy === 0) {
      face.materialIndex = 0
    } else {
      face.materialIndex = 1
    }
  })
}
