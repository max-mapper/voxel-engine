game-shell-voxel
================

Experiment with using [game-shell](https://github.com/mikolalysenko/game-shell),
[gl-now](https://github.com/gl-modules/gl-now),
[ndarray](https://github.com/mikolalysenko/ndarray), etc. for an interactive voxel world

Based on @mikolalysenko's [voxel-mipmap-demo](https://github.com/mikolalysenko/voxel-mipmap-demo).

Warning: this is only a test

# Usage

    var createShell = require('game-shell-voxel');

    createShell({require: require, pluginOpts: {
        // list plugins and options here
    });

For an example run `npm start` or check out the [live demo](http://deathcap.github.io/game-shell-voxel).

Click the canvas to interact. Added features:

* Mouse and key controls (WASD, space, shift) using [game-shell-fps-camera](https://github.com/deathcap/game-shell-fps-camera)
* Plugin support using [voxel-plugins](https://github.com/deathcap/voxel-plugins)
* Dynamic texture atlas using [voxel-stitch](https://github.com/deathcap/voxel-stitch)
* ...

---

original voxel-mipmap-demo readme:

## voxel-mipmap-demo
Demonstration of texture mapping with greedy meshing.

* Left click rotates
* Right click/shift pans
* Middle click/scroll/alt zooms

[Check it out in your browser](http://mikolalysenko.github.io/voxel-mipmap-demo/)

For more information see the following blog post:

* [Texture atlases, wrapping and mip mapping](http://0fps.wordpress.com/2013/07/09/texture-atlases-wrapping-and-mip-mapping/)

## How to run locally
First you will need to install npm, which comes with node.js.  You can get that by going to here:

* [https://nodejs.org/](https://nodejs.org/)

Then, go into the root directory of the project and type:

    npm install
    
Once that is done, you can run the project in your browser by typing:

    npm start

That will start a local server.  To view the demo in your browser, connect to localhost on the port that shows up.  For example, http://localhost:9966

## Credits
(c) 2013 Mikola Lysenko. MIT License
