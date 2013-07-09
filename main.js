"use strict"

var shell = require("gl-now")({clearColor: [0,0,0,0]})
var camera = require("game-shell-orbit-camera")(shell)
var createTileMap = require("gl-tile-map")
var ndarray = require("ndarray")
var terrain = require("isabella-texture-pack")
var createWireShader = require("./lib/wireShader.js")
var createAOShader = require("ao-shader")
var examples = require("./lib/examples.js")
var createVoxelMesh = require("./lib/createMesh.js")
var glm = require("gl-matrix")
var mat4 = glm.mat4

//Load selectors
var selectModel = document.querySelector("#selectModel")
var showWire = document.querySelector("#showWire")
var selectMip = document.querySelector("#selectMip")

//Add options to model select
;(function() {
  for(var id in examples) {
    var option = document.createElement("option")
    option.value = id
    option.innerHTML = id
    selectModel.add(option)
  }
})()

//Tile size parameters
var TILE_SIZE = Math.floor(terrain.shape[0] / 16)|0

//Config variables
var texture, shader, mesh, wireShader

function meshChange() {
  var name = selectModel.value
  mesh = createVoxelMesh(shell.gl, name, examples[name])
  var c = mesh.center
  camera.lookAt([c[0]+mesh.radius*2, c[1], c[2]], c, [0,1,0])
}

function mipChange() {
  var gl = shell.gl
  switch(selectMip.value) {
    case "none":
      texture.magFilter = gl.NEAREST
      texture.minFilter = gl.NEAREST
      texture.mipSamples = 1
    break
    case "linear":
      texture.magFilter = gl.LINEAR
      texture.minFilter = gl.LINEAR_MIPMAP_LINEAR
      texture.mipSamples = 1
    break
    case "aniso":
      texture.magFilter = gl.LINEAR
      texture.minFilter = gl.LINEAR_MIPMAP_LINEAR
      texture.mipSamples = 4
    break
  }  
}


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
  
  //Hook event listeners
  selectMip.addEventListener("change", mipChange)
  mipChange()
  
  selectModel.addEventListener("change", meshChange)
  meshChange()
})

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

  if(showWire.checked) {
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
