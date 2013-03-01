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
game.setVoxel(pos, 0) // off
game.setVoxel(pos, 1) // on
game.setVoxel(pos, 2) // on, with another material
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

`gameInstance.raycast(start, position, distance)`

if you just type `gameInstance.raycast()` it will default to using the current main camera position and direction, and default distance of 10

you will get back an object with the position, direction, face normal and voxel value of the voxel that you intersected, or `false` if there was no collision

### Create a new voxel adjacent to an existing voxel

first do a `.raycast()` then do `gameInstance.createAdjacent(raycastResults, materialIndex)`

## Game events

There are a number of events you can listen to once you've instantiated a game. we use the node.js event emitter library which uses the following syntax for subscribing:

`emitter.on('eventName', function(arg1, arg2, etc) {})`

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

### `game.on('missingChunk', function(chunkPosition) {})`

emits when the player moves into range of a chunk that isn't loaded yet. if your game has `generateChunks` set to true it will automatically create the chunk and render it but if you are providing your own chunk generation then you can use this to hook into the game.

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

Loading textures creates multiple "materials".

```var materials = game.materials.load(['obsidian', 'dirt'])```

Both of these textures come with 6 materials, one for each side of a cube, giving a total of 12 materials. By default, faces 1 to 6 are assigned materials 1 to 6. You can assign materials to faces in however you want. For example, we could load materials 7 to 12 (e.g. the dirt materials) like so:

```js
mesh.geometry.faces.forEach(function (face, index) {
  face.materialIndex = index + 6 // obsidian texture indices 0 - 5, dirt 6 - 11
})
```

### Items

* Items are non-voxel objects you can add to your game. e.g. Monsters/Players, Powerups, etc.
* Items currently implement their own physics, which is calculated every 'tick' by running an items' item.tick function. It's not very sophisticated.
* Items .mesh property is the thing that's actually processed by the THREE.js engine. Other properties of item are used in voxel.js to update the mesh, e.g. item.velocity.y is used every tick to calculate the next position the mesh should be in.
* Using the current item physics system, setting item.resting to false will force an item to recalculate it's position.

####  Example:  Creating an Item

```js
// get a previously loaded texture by name
var material = game.materials.get('obsidian');

// create a mesh and set the matertial
var mesh = new game.THREE.Mesh(
  new game.THREE.CubeGeometry(10, 30, 10), // width, height, depth
  new game.THREE.MeshFaceMaterial(material)
);

// move item to some location
mesh.translateX(87.5)
mesh.translateY(420)
mesh.translateZ(12.5)

// if these item dimensions don't match the mesh's dimensions,
// the object's physics will not operate correctly.
var item = {
  mesh: mesh,
  width: 10,
  height: 100,
  depth: 10,
  collisionRadius: 20, // padding around object dimensions box for collisions
  velocity: { x: 0, y: 0, z: 0 } // initial velocity
}

game.items.length // => 0
game.addItem(item)
// use `game.removeItem(item)` to remove
game.items.length // => 1
```

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

BSD
