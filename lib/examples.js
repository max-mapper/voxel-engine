"use strict"

var ndarray = require("ndarray")
var fill = require("ndarray-fill")
var ops = require("ndarray-ops")
var lazyProperty = require("lazy-property")

//Fill ndarray
function makeFill(name, size, func) {
  lazyProperty(exports, name, function() {
    var result = ndarray(new Int32Array(size[0]*size[1]*size[2]), size)
    fill(result, func)
    return result
  }, true)
}

//Sphere
makeFill("sphere", [32,32,32], function(i,j,k) {
  var x = i - 16
  var y = j - 16
  var z = k - 16
  return (x*x + y*y + z*z) < 30 ? (1<<15) + 0x81 : 0
})

//Cuboid
makeFill("box", [32,32,32], function(i,j,k) {
  var x = Math.abs(i - 16)
  var y = Math.abs(j - 16)
  var z = Math.abs(k - 16)
  return (x*x + y*y + z*z) < 12 ? (1<<15) + 0x19 : 0
})

//Terrain
makeFill("terrain", [33,33,33], function(i,j,k) {
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
makeFill("random", [16,16,16], function(i,j,k) {
  if(Math.random() < 0.6) {
    return 0
  }
  return ((Math.random()*255)|0) + (1<<15)
})

/*
//Create a bunny
var bunny = require("bunny")
var voxelize = require("voxelize")
lazyProperty(exports, "bunny", function() {
  var result = voxelize(bunny.cells, bunny.positions, 0.1)
  ops.mulseq(result.voxels, (1<<15)+0x10)
  return result.voxels
}, true)
*/