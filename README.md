# voxel-engine

## A voxel engine in javascript using three.js

Learn more at http://voxeljs.com

Write a voxel.js game in browser: http://voxel-creator.jit.su

hello world template repo: http://github.com/maxogden/voxel-hello-world

# example

``` js
var createGame = require('voxel-engine')
var game = createGame()
game.appendTo(document.body)
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
  materialFlatColor: false,
  chunkSize: 32,
  chunkDistance: 2,
  worldOrigin: [0, 0, 0],
  controls: { discreteFire: false },
  lightsDisabled: false,
  fogDisabled: false,
  generateChunks: true,
  mesher: voxel.meshers.greedy,
  playerHeight: 1.62
}
```

### Defaults

#### Player Size
Default 'player size' is a 1/2 block long/wide and 1.5 blocks high:

```js
game.playerAABB().width() // => 12.5
game.playerAABB().height() // => 37.5
```
See implementation of `Game.prototype.playerAABB` for more details.

## Terminology

* block/voxel/cube -> mostly interchangeable. The minecrafty blocks you see on the screen.
* chunk: is a piece of the world that contains voxels. try to pretend that these don't exist
* AABB: [bounding volume](http://en.wikipedia.org/wiki/Bounding_volume)
* voxeljs: not 100% consistent yet, 'voxel.js' also acceptable, but definitely not 'VoxelJS'.
* dims: short for 'dimensions'. Perhaps obvious to some.
* yaw: rotation around the vertical axis.
* pitch: rotation around a horizontal axis.

## Positions

* `x`, `z`: horizontal plane
* `y`: vertical plane

We try to always use arrays to represent vectors (aka positions)

* `[x, y, z]`

Sometimes you may also see objects used, e.g. `{x: 0, y: 0, z: 0}`, this is because three.js uses objects for vectors.

## Generating voxel worlds

Worlds have many chunks and chunks have many voxels. Chunks are cube shaped and are `chunkSize` x/y/z (default 32/32/32 - 32768 voxels per chunk). When the game starts it takes the `worldOrigin` and generates `chunkDistance` chunks in every x/y/z dimension (`chunkDistance` default of 2 means the game will render 2 chunks behind you, 2 in front etc for a total of 16 chunks.). 

There is one major coordinate system in voxel.js: "game coordinates" (aka world coordinates)

- every object added to a three.js scene gets a x/y/z position in game coordinates. in voxel-engine 1 game coordinate is the width of 1 voxel. when generating the world or interacting with individual voxels you can refer to voxels by coordinates. an example coordinate might be [34, -50, 302] which would mean starting from the `worldOrigin` 34 voxels over, 50 down and 302 forward

There are also some other less used coordinate systems that you should be aware of:

- chunk coordinates: logically the same as voxel coordinates but for chunks. you probably won't need to use these as they are just used internally for rendering the world but it is good to know they exist.
- local object coordinates: when you add items and other things to the game that aren't voxel terrain you introduce a new relative coordinate system inside each thing. so if you add a player 3d model body and you want to put a hat on the body you could position the hat relative to the body coordinates, etc

When you create a game you can also pass functions that the game will ask for voxel data. Here is an example `generate` function that makes a randomly textured cube world with a diameter of 20 voxels:

```javascript
function generator(x, y, z) {
  if (x*x + y*y + z*z > 20*20) return 0
  return Math.floor(Math.random() * 4) + 1
}
```

The `generate` function will be called once for each voxel in the world. `x`, `y` and `z` will be values in game coordinates.

### Generate a flat world 1 block high

Flat world is a nicer way to start (at least you can't fall off the edge).
This places the player just above the ground.

```js
var game = createGame({
  generate: function(x, y, z) {
    return y === 1 ? 1 : 0
  }
})

```

## Interacting with the voxel world

### Get current player position

```js
game.controls.target().avatar.position()
```

This returns a THREE.js Vector3 object (which just means an object with 'x', 'y', and 'z').

### Toggle a block on/off

```js
game.setBlock(pos, 0) // off
game.setBlock(pos, 1) // on
game.setBlock(pos, 2) // on, with another material
```

### Get the chunk at some world coordinates:

`gameInstance.voxels.chunkAtPosition(position)`

### Get the voxel coordinates at some position (relative to that voxels chunk):

`gameInstance.voxels.voxelVector(position)`

### Create a brand new voxel at some position. 

Intended for use in first player contexts as it checks if a player is standing in the way of the new voxel. If you don't care about that then just use `setBlock`:

`gameInstance.createBlock(pos, val)`

`val` can be 0 or you can also use any single digit integer 0-9. These correspond to the materials array that you pass in to the game.

### Set the value of a voxel at some position:

`gameInstance.setBlock(pos, val)`

### Get the value of a voxel at some position:

`gameInstance.getBlock(pos)`

If you wanna see the lower level API for voxel data manipulation look at `chunker.js` inside the voxel module.

### Raycast

shoots a ray and collides with voxels

`gameInstance.raycastVoxels(start, position, distance)`

if you just type `gameInstance.raycastVoxels()` it will default to using the current main camera position and direction, and default distance of 10, and epilson of `1e-8`

you will get back an object with the precise position, voxel position, direction, face normal and voxel value of the voxel that you intersected, or `false` if there was no collision

### Create a new voxel adjacent to an existing voxel

first do a `.raycastVoxels()` then do `gameInstance.createAdjacent(raycastResults, materialIndex)`

## Game events

There are a number of events you can listen to once you've instantiated a game. we use the node.js event emitter library which uses the following syntax for subscribing:

`emitter.on('eventname', function(arg1, arg2, etc) {})`

### `game.on('mouseup', function(pos) {})`, `game.on('mousedown', function(pos) {})`

Captures mouse activity. `pos` is the game coordinate of the intersection of the voxel that you clicked on (if any)

### `game.on('tick', function(delta) {})`

emits every time the game renders (usually no more than 60 times a second). delta is the time in milliseconds between this render and the last render

### `game.on('collision', function(item) {})`

Called every tick when an item is colliding with the player. Callback is passed the item that is colliding.

### `game.voxelRegion.on('change', function(pos) {})`

emits when you move between voxels. pos has x, y, and z voxel coordinates of the voxel you just entered

### `game.chunkRegion.on('change', function(pos) {})``

emits when you move between chunks. pos has x, y, and z chunk coordinates of the chunk you just entered

### `game.on('renderChunk, function(chunk) {})`

emits when a chunk is drawn (using the `showChunk` method). `chunk` is the full chunk object, which has the voxel data and a `.position` and `.dims`

### `game.on('missingChunk', function(chunkPosition) {})`

emits when the player moves into range of a chunk that isn't loaded yet. if your game has `generateChunks` set to true it will automatically create the chunk and render it but if you are providing your own chunk generation then you can use this to hook into the game.

### `game.on('dirtyChunkUpdate', function(chunk) {})`

emits when game updates a chunk, this is usually triggered when a chunk gets edited. if `game.setBlock` were to get called 50 times on one chunk in between renders, `dirtyChunkUpdate` will emit once with the chunk the chunk that gets updated

### `game.on('setBlock', function(pos, val, old) {})`

emits whenever `game.setBlock` gets called

### Collisions

#### Check for collisions between an item and other 'things'

Detects collisions between an item and other items, or voxels.

```js
game.getCollisions(item.mesh.position, item)
```

This will give you back a 'collisions object' whose keys are positions on the object and values are arrays of the positions of faces that are colliding.

For example, here we have 4 faces colliding with the bottom of our object:

```js
{
  back: Array[0]
  bottom: Array[4]
  down: Array[1]
  forward: Array[0]
  left: Array[0]
  middle: Array[0]
  right: Array[0]
  top: Array[0]
  up: Array[0]
}
```

### Textures

Loading textures onto the texture atlas.

```game.materials.load(['obsidian', 'dirt'], function(textures) { })```

Both of these textures will be loaded into the texture atlas and expanded creating 2 voxel block types.

### Texture-less worlds with flat colors

You can specify hex colors to use as materials, just pass these options when creating a game:

```js
{
  materials: ["#fff", "#000", "#ff0000"],
  materialFlatColor: true
}
```

### Items

* Items are non-voxel objects you can add to your game. e.g. Monsters/Players, Powerups, etc.
* Items currently implement their own physics, which is calculated every 'tick' by running an items' item.tick function. It's not very sophisticated.
* Items .mesh property is the thing that's actually processed by the THREE.js engine. Other properties of item are used in voxel.js to update the mesh, e.g. item.velocity.y is used every tick to calculate the next position the mesh should be in.
* Using the current item physics system, setting item.resting to false will force an item to recalculate it's position.

####  Example:  Creating an Item

```js
// create a mesh and use the internal game material (texture atlas)
var mesh = new game.THREE.Mesh(
  new game.THREE.CubeGeometry(1, 3, 1), // width, height, depth
  game.materials.material
)

// paint the mesh with a specific texture in the atlas
game.materials.paint(mesh, 'obsidian')

// move the item to some location
mesh.position.set(0, 3, -5)

var item = game.addItem({
  mesh: mesh,
  size: 1,
  velocity: { x: 0, y: 0, z: 0 } // initial velocity
})
// use `game.removeItem(item)` to remove
```

## voxel interchange format

```js
{
  "voxels": [packed 1D array of voxels],
  "dimensions": [2, 2, 2],
  "position": [10, 10, 10]
}
```

this should be generated by something like this:

```js
  var length = 5, width = 5, depth = 5
  var start = [10, 10, 10]
  var voxels = new Int8Array(length * width * depth)
  var idx = 
  for(var z = start[2]; z < depth[2]; ++z)
  for(var y = start[1]; y < height[1]; ++y)
  for(var x = start[0]; x < length[0]; ++x, ++idx) {
    voxels[idx] = getVoxelDataFor(x, y, z)
  }
  return {voxels: voxels, dimensions: [length, width, height], position: start}
```

### Timing
`setTimeout` and `setInterval` work fine when timing things against the computer's clock but what about staying in sync with the game's clock? When the game lags, is paused or hasn't begun you probably don't want your timed operations firing.

`game.setInterval(fn, duration[, args])` and `game.setTimeout(fn, duration[, args])` are available and similar to the built in interval functions but stay in sync with the game's clock.

An example is we want our object to jump every 2 seconds. Normally we'd just do:

```js
setInterval(function() {
  jump()
}, 2000)
```

But if the game's frame rate drops or the game hasn't begun the computer will still fire the `jump()` function every 2 seconds. Thus causing the object to fly way up into the air.

```js
var clearInterval = game.setInterval(function() {
  jump()
}, 2000)
// later we can stop the interval by calling clearInterval()
```

Will achieve the same thing although now when the game's frame rate drops the `jump()` funciton won't be called repeatedly and the object will jump at the desired frequency.

## style guide

basically https://github.com/felixge/node-style-guide#nodejs-style-guide with a couple of minor changes:

- no semicolons
- single line ifs/fors when appropriate for terseness
- no hard to understand for n00bs 'tricks' unless they are faster

any contributions (pull requests) in any style are welcome, as long as:

- they are written in javascript
- they merge cleanly

if you send a pull request and you use, for example, 4 space indents it will not be rejected but please try to follow conventions when you can

## license

BSD (see LICENSE)
