"use strict"

var ndarray = require("ndarray")
var fill = require("ndarray-fill")

module.exports = function(materials) {
  var size = [33,33,33]
  var result = ndarray(new Int32Array(size[0]*size[1]*size[2]), size)
  //Fill ndarray with function
  fill(result, function(i,j,k) {
    //Terrain

    if (i===30 && j===30 && k===30) {
      // face texture test
      return materials.wool
    }

    if (i===25 && j===30 && k===30) {
      // high block index test
      return materials.highBlock
    }

    if(i <=1 || i>=31 || j <= 1 || j >= 31 || k <= 1 || k >= 31) {
      return 0 // air
    }

    // tree
    if (i===7 && k===8 && 21<j && j<31) {
      return materials.logOak
    }
    var x = i - 7
    var y = j - 28
    var z = k - 8
    if (x*x + y*y + z*z < (Math.random()+1.0) * 5.0) {
      return materials.leavesOak
    }

    // modern art
    x = i - 20
    y = j - 28
    z = k - 8
    if (x*x + y*y + z*z < 5.0) {
      return materials.glass
    }

    // rolling hills
    var h0 = 3.0 * Math.sin(Math.PI * i / 12.0 - Math.PI * k * 0.1) + 22
    if(j > h0+1) {
      return 0 // air
    }
    // grassy surface with dirt
    if(h0 <= j) {
      return materials.grass
    }
    var h1 = 2.0 * Math.sin(Math.PI * i * 0.25 - Math.PI * k * 0.3) + 20
    if(h1 <= j) {
      return materials.dirt
    }

    // stone with ores
    if(4 < j) {
      return Math.random() < 0.1 ?
          materials.oreDiamond :
          materials.stone
    }
    return materials.lava
  })
  return result
}


