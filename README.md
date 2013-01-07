# voxel-engine

## a voxel engine in javascript using three.js

**not done, super hacky!**

see also: https://github.com/maxogden/voxel and https://github.com/maxogden/voxel-mesh

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
