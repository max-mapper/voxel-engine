var Mesh = require('voxel-mesh')
var THREE = require('three')
var voxel = require('voxel')
module.exports = Chunker

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

Chunker.prototype.generateChunk = function(x, y, z) {
  var self = this
  var chunkIndex = [x, y, z].join('|')
  var size = this.game.chunkSize
  var cubeSize = this.game.cubeSize
  var scale = new THREE.Vector3(cubeSize, cubeSize, cubeSize)
  var low = [x * size, y * size, z * size]
  var high = [low[0] + size, low[1] + size, low[2] + size]
  var meshObj = self.meshes[chunkIndex]
  var voxels
  if (meshObj) voxels = meshObj.data.voxels
  var chunk = voxel.generate(low, high, function(vx,vy,vz,n) {
    if (voxels) {
      return voxels[n]
    }
    return self.game.generateVoxel(vx,vy,vz)
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
  var chunkSize = this.game.chunkSize
  var cubeSize = this.game.cubeSize
  var cx = position.x / cubeSize / chunkSize
  var cy = position.y / cubeSize / chunkSize
  var cz = position.z / cubeSize / chunkSize
  var chunkPos = [Math.floor(cx), Math.floor(cy), Math.floor(cz)]
  return chunkPos
};


Chunker.prototype.voxelAtPosition = function(pos) {
  var size = this.game.chunkSize
  var cubeSize = this.game.cubeSize
  var vx = (size + Math.floor(pos.x / cubeSize)) % size
  var vy = (size + Math.floor(pos.y / cubeSize)) % size
  var vz = (size + Math.floor(pos.z / cubeSize)) % size
  return {x: Math.abs(vx), y: Math.abs(vy), z: Math.abs(vz)}
};

Chunker.prototype.applyTextures = function (geom) {
  var self = this;
  
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
    if (Math.abs(face.normal.y) === 1) {
      face.materialIndex = 0
    }
    else {
      face.materialIndex = 1
    }
  })
  
}
