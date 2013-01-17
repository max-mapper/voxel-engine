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

# get it running

```
cd voxel-engine
npm install
npm install browserify -g
make
npm start
```

# compile on file changes

```
make watch
```

## license

BSD
