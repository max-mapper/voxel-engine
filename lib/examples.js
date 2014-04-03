"use strict"

var ndarray = require("ndarray")
var fill = require("ndarray-fill")
var lazyProperty = require("lazy-property")

//Fill ndarray with function
function makeFill(name, size, func) {
  lazyProperty(exports, name, function() {
    var result = ndarray(new Int32Array(size[0]*size[1]*size[2]), size)
    fill(result, func)
    return result
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


