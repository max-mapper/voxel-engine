var voxel = require('voxel')

function ExampleVoxelSource() {
  this.chunkSize = 32
  this.numChunks = 32
}
ExampleVoxelSource.prototype.getVoxel = voxel.generator['Hill']

var game = new Game(new ExampleVoxelSource())

document.addEventListener('DOMContentLoaded', function() {
  document.body.addEventListener( 'click', function ( event ) {
    askForPointerLock(game.controls)
  })
})
;