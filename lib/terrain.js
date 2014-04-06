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
  if (i===30 && j===30 && k===30) {
    return (1<<15)+6; // wool
  }

  if(i <=1 || i>=31 || j <= 1 || j >= 31 || k <= 1 || k >= 31) {
    return 0 // air
  }

  // tree
  if (i===7 && k===8 && 21<j && j<31) {
    return (1<<15)+7 // log
  }
  var x = i - 7
  var y = j - 28
  var z = k - 8
  if (x*x + y*y + z*z < (Math.random()+1.0) * 5.0) {
    return 8 // leaves (transparent)
  }

  // rolling hills
  var h0 = 3.0 * Math.sin(Math.PI * i / 12.0 - Math.PI * k * 0.1) + 22
  if(j > h0+1) {
    return 0 // air
  }
  // grassy surface with dirt
  if(h0 <= j) {
    return (1<<15)+5//0x19 // grass
  }
  var h1 = 2.0 * Math.sin(Math.PI * i * 0.25 - Math.PI * k * 0.3) + 20
  if(h1 <= j) {
    return (1<<15)+0//0x20 // dirt
  }

  // stone with ores
  if(4 < j) {
    return Math.random() < 0.1 ?
        (1<<15)+4 : //0x23 : // diamond
        (1<<15)+1 //0x10 // stone
  }
  return (1<<15)+3 // lava
})


