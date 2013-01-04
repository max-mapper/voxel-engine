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

Chunker.prototype.generateChunk = function(x,y,z) {
  var self = this
  var chunkIndex = [x, y, z].join('|')
  var size = this.game.voxelSource.chunkSize
  var cubeSize = this.game.cubeSize
  var scale = new THREE.Vector3(cubeSize, cubeSize, cubeSize)
  var low = [x * size, y * size, z * size]
  var high = [low[0] + size, low[1] + size, low[2] + size]
  var chunk = voxel.generate(low, high, function(x,y,z) {
    var meshObj = self.meshes[chunkIndex]
    var voxels
    if (meshObj) voxels = meshObj.data.voxels
    if (voxels) {
      var vId = x + y*size + z*size*size
      return voxels[vId]
    }
    return self.game.voxelSource.getVoxel(x,y,z)
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
