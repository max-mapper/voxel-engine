# voxel-engine

## A voxel engine in javascript using three.js

Learn more at http://voxeljs.com

Main demo: http://maxogden.github.com/voxel-engine/

# example

``` js
var createGame = require('voxel-engine')
var game = createGame()
var container = document.querySelector('#container')
game.appendTo(container)
container.addEventListener('click', function() {
  game.requestPointerLock(container)
})
```

# API

## require('voxel-engine')(options)

Returns a new game instance. `options` defaults to:

```javascript
{
  texturePath: './textures/',
  generate: function(x,y,z) {
    return x*x+y*y+z*z <= 20*20 ? 1 : 0 // sphere world
  },
  materials: [['grass', 'dirt', 'grass_dirt'], 'brick', 'dirt'],
  cubeSize: 25,
  chunkSize: 32,
  chunkDistance: 2,
  startingPosition: [35, 1024, 35],
  worldOrigin: [0,0,0],
  controlOptions: {jump: 6}
}
```

## Generating voxel worlds

Worlds have many chunks and chunks have many voxels. Chunks are cube shaped and are `chunkSize` x/y/z (default 32/32/32 - 32768 voxels per chunk). When the game starts it takes the `worldOrigin` and generates `chunkDistance` chunks in every x/y/z dimension (`chunkDistance` default of 2 means the game will render 2 chunks behind you, 2 in front etc for a total of 16 chunks.). 

When you create a game you can also pass functions that the game will ask for voxel data. Here is an example `generate` function that makes a randomly textured cube world with a diameter of 20 voxels:

```javascript
function generator(x, y, z) {
  if (x*x + y*y + z*z > 20*20) return 0
  return Math.floor(Math.random() * 4) + 1
}
```

The `generate` function will be called once for each voxel in the world. `x`, `y` and `z` will be values in voxel coordinates.

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

The first time you set up, you should install the required npm packages:

```
cd voxel-engine
npm install
npm install browserify -g
```

Then run the start script (which you'll need to do every time you want to run the demo):

```
npm start
```

Then point your browser to [http://localhost:8080](http://localhost:8080) and have fun!

## How does this work?

voxel.js modules use [browserify](http://browserify.org) for packaging modules together into game bundles. This means that every time you change code in your game you have to build a new bundle in order to test it out. Luckily this is very easy and is automated. When you run the `npm start` script, it runs a local server: when the browser requests `demo.js`, it compiles it serverside and then serves up the compiled version.

The upshot is, as long as you're running the `npm start` script in the background, you can save your changes to demo.js and reload the game to see the new code in action, without having to have a build step in between. (If you'd like to change the start script, it's contained in the `package.json` file in the root directory.)

## license

BSD
