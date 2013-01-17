# voxel-engine

## A voxel engine in javascript using three.js

Learn more at http://voxeljs.com

Main demo: http://maxogden.github.com/voxel-engine/

# example

``` js
var voxel = require('voxel')
var createGame = require('voxel-engine')
var game = createGame({
  chunkSize: 32,
  chunks: 32,
  generateVoxelChunk: voxel.generator['Hilly Terrain']
})
game.appendTo('#container')
game.requestPointerLock()
```

# API

## require('voxel-engine')(options)

Returns a new game instance. `options` defaults to:

```javascript
{
  texturePath: '/textures/',
  materials: ['grass'],
  cubeSize: 25,
  chunkSize: 32,
  chunkDistance: 2,
  startingPosition: [35, 100, 35],
  worldOrigin: [0,0,0],
  controlOptions: {jump: 6}
}
```

## Generating voxel worlds

Worlds have many chunks and chunks have many voxels. Chunks are cube shaped and are `chunkSize` x/y/z (default 32/32/32 - 32768 voxels per chunk). When the game starts it takes the `worldOrigin` and generates `chunkDistance` chunks in every x/y/z dimension (`chunkDistance` default of 2 means the game will render 2 chunks behind you, 2 in front etc for a total of 16 chunks.). 

When you create a game you can also pass functions that the game will ask for chunk data. You can either supply a function called `generateVoxelChunk` which the game will call every time it requests a new chunk or a function called `generator` which the game will call when it needs voxel data at a specific voxel coordinate. 

Example `generator` function that makes a randomly textured cube world with a diameter of 20 voxels:

```javascript
function generator(x, y, z) {
  if (x*x + y*y + z*z > 20*20) return 0
  return Math.floor(Math.random() * 4) + 1
}
```

The `generator` function will be called for each voxel in a specific chunk. `x`, `y` and `z` will be values in voxel coordinates.

Example `generateVoxelChunk` function that uses the above `generator`. `low` and `high` are the lower left and upper right voxel coordinates of the chunk being requested (e.g. `[0,0,0]` and `[32,32,32]`): 

```javascript
var voxel = require('voxel')
this.generateVoxelChunk = function(low, high) {
  return voxel.generate(low, high, function generator(x, y, z) {
    if (x*x + y*y + z*z > 20*20) return 0
    return Math.floor(Math.random() * 4) + 1
  })
}
```

If you just pass in a `generator` function it will automatically be wrapped in a `generateVoxelChunk` function. You must pass in one or both of these functions, there is no default. `generateVoxelChunk` is mostly a convenience method -- you can usually just use a `generator` function.

## Interacting with the voxel world

When the game renders it draws each voxel at `cubeSize` wide in three.js world coordinates (something like pixels wide). So a default chunk is 32 (`chunkSize`) * 25 (default `cubeSize`) === 800 wide.

To get the players current position you can do `gameInstance.controls.yawObject.position`. This returns a THREE.js Vector3 object (which just means an object with 'x', 'y', and 'z'). The coordinates are in world coordinates.


To look up the chunk at some world coordinates:

`gameInstance.voxels.chunkAtPosition(position)`

To look up the voxel at some world coordinates (relative to that voxels chunk):

`gameInstance.voxels.voxelVector(position)`

Create a new voxel at some world coordinates (handles collisions with player, etc):

`gameInstance.createBlock(pos, val)`

`val` can be 0 or you can also use any single digit integer 0-9. These correspond to the materials array that you pass in to the game.

Set the value of a voxel at some world coordinates:

`gameInstance.setBlock(pos, val)`

Get the value of a voxel at some world coordinates:

`gameInstance.getBlock(pos)`

If you wanna see the lower level API for voxel data manipulation look at `chunker.js` inside the voxel module.

# Get the demo running

voxel.js modules use [browserify](http://browserify.org) for packaging modules together into game bundles. This means that every time you change code in your game you have to build a new bundle in order to test it out. Luckily this is very easy and can be automated:

```
cd voxel-engine
npm install
npm install browserify -g
npm run make
npm start
```

automatically compile whenever you edit a file

```
browserify mygame.js -o bundle.js --watch --debug
```

## license

BSD
