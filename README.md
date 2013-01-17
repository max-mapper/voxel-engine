# voxel-engine

## a voxel engine in javascript using three.js

**still in beta and super hacky**

soon more information will be available at http://voxeljs.com

associated modules/plugins:

- https://github.com/maxogden/voxel
- https://github.com/maxogden/voxel-mesh
- https://github.com/substack/voxel-creature
- https://github.com/substack/voxel-debris
- https://github.com/substack/voxel-forest
- https://github.com/maxogden/voxel-perlin-terrain
- https://github.com/maxogden/voxel-server
- https://github.com/maxogden/toolbar

demos:

- http://maxogden.github.com/voxel-engine/
- http://maxogden.github.com/voxel-perlin-terrain/
- http://substack.net/projects/voxel-creature/
- http://substack.net/projects/voxel-debris/
- http://substack.net/projects/voxel-forest/

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
