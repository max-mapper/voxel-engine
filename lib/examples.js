"use strict"

var ndarray = require("ndarray")
var fill = require("ndarray-fill")
var ops = require("ndarray-ops")
var voxelize = require("voxelize")
var lazyProperty = require("lazy-property")

var bunny = require("bunny")
var teapot = require("teapot")

//Fill ndarray with function
function makeFill(name, size, func) {
  lazyProperty(exports, name, function() {
    var result = ndarray(new Int32Array(size[0]*size[1]*size[2]), size)
    fill(result, func)
    return result
  }, true)
}

//Fill ndarray with voxelized mesh
function makeMesh(name, mesh, tolerance, fill) {
  lazyProperty(exports, name, function() {
    var result = voxelize(mesh.cells, mesh.positions, tolerance)
    var voxels = result.voxels
    var nshape = result.voxels.shape.slice(0)
    for(var i=0; i<3; ++i) {
      nshape[i] += 2
    }
    var padded = ndarray(new Int32Array(nshape[0]*nshape[1]*nshape[2]), nshape)
    ops.muls(padded, result.voxels, fill)
    return padded
  }, true)
}

//Terrain
makeFill("Terrain", [33,33,33], function(i,j,k) {
  if(i <=1 || i>=31 || j <= 1 || j >= 31 || k <= 1 || k >= 31) {
    return 0
  }
  var h0 = 3.0 * Math.sin(Math.PI * i / 12.0 - Math.PI * k * 0.1) + 27
  if(j > h0+1) {
    return 0
  }
  if(h0 <= j) {
    return (1<<15)+0x19
  }
  var h1 = 2.0 * Math.sin(Math.PI * i * 0.25 - Math.PI * k * 0.3) + 20
  if(h1 <= j) {
    return (1<<15)+0x20
  }
  if(4 < j) {
    return Math.random() < 0.1 ? (1<<15)+0x23 : (1<<15)+0x10
  }
  return (1<<15)+0xff
})

//Random
makeFill("Random", [16,16,16], function(i,j,k) {
  if(i <=1 || i>=14 || j <= 1 || j >= 14 || k <= 1 || k >= 14) {
    return 0
  }
  if(Math.random() < 0.6) {
    return 0
  }
  return ((Math.random()*255)|0) + (1<<15)
})

makeFill("Tree", [16,16,16], function(i,j,k) {
  if(i === 8 && k === 8 && 4<j && j<12) {
    return (1<<15) + 0x41
  }
  if(j <= 4) {
    return (1<<15)
  }
  var x = i - 8
  var y = j - 10
  var z = k - 8
  if(x*x + y*y + z*z < (Math.random()+1.0) * 5.0) {
    return 0x4c
  }
  return 0
})


