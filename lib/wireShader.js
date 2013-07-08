"use strict"
var createShader = require("gl-shader")

module.exports = function(gl) {
  return createShader(gl,
"attribute vec3 position;\
uniform mat4 projection;\
uniform mat4 view;\
uniform mat4 model;\
void main() {\
  gl_Position=projection * view * model * vec4(position, 1.0);\
}",
"void main() {\
  gl_FragColor = vec4(0, 1, 0, 1);\
}")
}