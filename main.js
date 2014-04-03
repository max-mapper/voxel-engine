"use strict"

var shell = require("gl-now")({clearColor: [0,0,0,0], pointerLock: true})
var camera = require("game-shell-fps-camera")(shell)
var createTileMap = require("gl-tile-map")
var ndarray = require("ndarray")
var terrain = require("isabella-texture-pack")
var createWireShader = require("./lib/wireShader.js")
var createAOShader = require("ao-shader")
var examples = require("./lib/examples.js")
var createVoxelMesh = require("./lib/createMesh.js")
var glm = require("gl-matrix")
var mat4 = glm.mat4

//Tile size parameters
var TILE_SIZE = Math.floor(terrain.shape[0] / 16)|0

//Config variables
var texture, shader, mesh, wireShader

shell.on("gl-init", function() {
  var gl = shell.gl

  //Create shaders
  shader = createAOShader(gl)
  wireShader = createWireShader(gl)
  
  //Create texture atlas
  var tiles = ndarray(terrain.data,
    [16,16,terrain.shape[0]>>4,terrain.shape[1]>>4,4],
    [terrain.stride[0]*16, terrain.stride[1]*16, terrain.stride[0], terrain.stride[1], terrain.stride[2]], 0)
  texture = createTileMap(gl, tiles, 2)

  texture.magFilter = gl.NEAREST
  texture.minFilter = gl.LINEAR_MIPMAP_LINEAR
  texture.mipSamples = 4

  mesh = createVoxelMesh(shell.gl, 'Terrain', examples.Terrain)
  var c = mesh.center
  camera.lookAt([c[0]+mesh.radius*2, c[1], c[2]], c, [0,1,0])
})

shell.on("gl-error", function(err) {
  var a = document.createElement('a')
  a.textContent = 'You need a modern WebGL browser (Chrome/Firefox) to play this game. Click here for more information. (WebGL error: ' + err + ')'
  a.style.webkitUserSelect = ''
  a.href = 'http://get.webgl.org/';

  while(document.body.firstChild) document.body.removeChild(document.body.firstChild)

  document.body.appendChild(a)
})

var showWire = true;

shell.on("gl-render", function(t) {
  var gl = shell.gl
 
  //Calculation projection matrix
  var projection = mat4.perspective(new Float32Array(16), Math.PI/4.0, shell.width/shell.height, 1.0, 1000.0)
  var model = mat4.identity(new Float32Array(16))
  var view = camera.view()
  
  gl.enable(gl.CULL_FACE)
  gl.enable(gl.DEPTH_TEST)

  //Bind the shader
  shader.bind()
  shader.attributes.attrib0.location = 0
  shader.attributes.attrib1.location = 1
  shader.uniforms.projection = projection
  shader.uniforms.view = view
  shader.uniforms.model = model
  shader.uniforms.tileSize = TILE_SIZE
  shader.uniforms.tileMap = texture.bind()
  
  mesh.triangleVAO.bind()
  gl.drawArrays(gl.TRIANGLES, 0, mesh.triangleVertexCount)
  mesh.triangleVAO.unbind()

  if(showWire) {
    //Bind the wire shader
    wireShader.bind()
    wireShader.attributes.position.location = 0
    wireShader.uniforms.projection = projection
    wireShader.uniforms.model = model
    wireShader.uniforms.view = view
    
    mesh.wireVAO.bind()
    gl.drawArrays(gl.LINES, 0, mesh.wireVertexCount)
    mesh.wireVAO.unbind()
  }
})
