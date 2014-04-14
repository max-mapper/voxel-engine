"use strict"

var ndarray = require("ndarray")
var createBuffer = require("gl-buffer")
var createVAO = require("gl-vao")
var createAOMesh = require("voxel-mesher")
var ops = require("ndarray-ops")

//Creates a mesh from a set of voxels
function createVoxelMesh(gl, voxels, voxelSideTextureIDs, voxelSideTextureSizes) {
  //Create mesh
  var vert_data = createAOMesh(voxels, voxelSideTextureIDs, voxelSideTextureSizes)
  
  //Upload triangle mesh to WebGL
  var triangleVertexCount = Math.floor(vert_data.length/8)
  var vert_buf = createBuffer(gl, vert_data)
  var triangleVAO = createVAO(gl, [
    { "buffer": vert_buf,
      "type": gl.UNSIGNED_BYTE,
      "size": 4,
      "offset": 0,
      "stride": 8,
      "normalized": false
    },
    { "buffer": vert_buf,
      "type": gl.UNSIGNED_BYTE,
      "size": 4,
      "offset": 4,
      "stride": 8,
      "normalized": false
    }
  ])
  
  //Create wire mesh
  var wireVertexCount = 2 * triangleVertexCount
  var wireVertexArray = ndarray(new Uint8Array(wireVertexCount * 3), [triangleVertexCount, 2, 3])
  var trianglePositions = ndarray(vert_data, [triangleVertexCount, 3], [8, 1], 0)
  ops.assign(wireVertexArray.pick(undefined, 0, undefined), trianglePositions)
  var wires = wireVertexArray.pick(undefined, 1, undefined)
  for(var i=0; i<3; ++i) {
    ops.assign(wires.lo(i).step(3), trianglePositions.lo((i+1)%3).step(3))
  }
  var wireBuf = createBuffer(gl, wireVertexArray.data)
  var wireVAO = createVAO(gl, [
    { "buffer": wireBuf,
      "type": gl.UNSIGNED_BYTE,
      "size": 3,
      "offset": 0,
      "stride": 3,
      "normalized": false
    }
  ])
  
  //Bundle result and return
  var result = {
    triangleVertexCount: triangleVertexCount,
    triangleVAO: triangleVAO,
    wireVertexCount: wireVertexCount,
    wireVAO: wireVAO,
    center: [voxels.shape[0]>>1, voxels.shape[1]>>1, voxels.shape[2]>>1],
    radius: voxels.shape[2]
  }
  return result
}

module.exports = createVoxelMesh
