# blocking (working title)

## a voxel engine for webgl browsers using three.js

work in progress, super hacky!

see also: https://github.com/maxogden/voxel and https://github.com/maxogden/voxel-mesh

# example

``` js
var voxel = require('voxel')
var createGame = require('../')

var game = createGame({
  chunkSize: 32,
  chunks: 32,
  generateVoxel: voxel.generator['Hilly Terrain']
})
game.appendTo('#container')

document.body.addEventListener('click', function() {
  game.requestPointerLock()
})
```

# build

```
$ npm install .
$ make
```

## license

BSD
