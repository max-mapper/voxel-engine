var THREE = require('three')
var inherits = require('inherits')
var stream = require('stream')

var PI_2 = Math.PI / 2

/**
 * @author mrdoob / http://mrdoob.com/
 * edited by @substack and @maxogden
 */

module.exports = function(camera, opts) {
  return new PlayerControls(camera, opts)
}

module.exports.PlayerControls = PlayerControls

function PlayerControls(camera, opts) {
  if (!(this instanceof PlayerControls)) return new PlayerControls(camera, opts)
  var self = this
  if (!opts) opts = {}
  
  this.readable = true
  this.writable = true
  this.enabled = false
  
  this.speed = {
    jump: opts.jump || 6,
    move: opts.move || 0.12,
    fall: opts.fall || 0.3
  }

  this.pitchObject = new THREE.Object3D()
  this.pitchObject.add( camera )

  this.yawObject = new THREE.Object3D()
  this.yawObject.position.y = 10
  this.yawObject.add( this.pitchObject )

  this.moveForward = false
  this.moveBackward = false
  this.moveLeft = false
  this.moveRight = false

  this.isOnObject = false
  this.canJump = false

  this.velocity = new THREE.Vector3()
  
  this.on('jump', function() {
    if ( self.canJump === true ) self.velocity.y += self.speed.jump
    self.canJump = false
  })  
}

inherits(PlayerControls, stream.Stream)

PlayerControls.prototype.playerIsMoving = function() { 
  var v = this.velocity
  if (Math.abs(v.x) > 0.1 || Math.abs(v.y) > 0.1 || Math.abs(v.z) > 0.1) return true
  return false
}

PlayerControls.prototype.write = function(data) {
  if (this.enabled === false) return
  this.applyRotationDeltas(data)
}

PlayerControls.prototype.end = function() {
  this.emit('end')
}

PlayerControls.prototype.applyRotationDeltas = function(deltas) {
  this.yawObject.rotation.y -= deltas.dx * 0.002
  this.pitchObject.rotation.x -= deltas.dy * 0.002
  this.pitchObject.rotation.x = Math.max(-PI_2, Math.min(PI_2, this.pitchObject.rotation.x))
}

PlayerControls.prototype.isOnObject = function ( booleanValue ) {
  this.isOnObject = booleanValue
  this.canJump = booleanValue
}

PlayerControls.prototype.tick = function (delta, cb) {
  if (this.enabled === false) return

  delta *= 0.1

  this.velocity.x += (-this.velocity.x) * 0.08 * delta
  this.velocity.z += (-this.velocity.z) * 0.08 * delta

  if (this.gravityEnabled) this.velocity.y -= this.speed.fall * delta

  if (this.moveForward) this.velocity.z -= this.speed.move * delta
  if (this.moveBackward) this.velocity.z += this.speed.move * delta

  if (this.moveLeft) this.velocity.x -= this.speed.move * delta
  if (this.moveRight) this.velocity.x += this.speed.move * delta

  if ( this.isOnObject === true ) this.velocity.y = Math.max(0, this.velocity.y)

  if (cb) cb.call(this)
  
  this.yawObject.translateX( this.velocity.x )
  this.yawObject.translateY( this.velocity.y )
  this.yawObject.translateZ( this.velocity.z )

  if (this.velocity.y === 0) this.canJump = true
}


PlayerControls.prototype.bindWASD = function () {
  var self = this
  var onKeyDown = function ( event ) {
    switch ( event.keyCode ) {
      case 38: // up
      case 87: // w
        self.moveForward = true;
        break;

      case 37: // left
      case 65: // a
        self.moveLeft = true; break;

      case 40: // down
      case 83: // s
        self.moveBackward = true;
        break;

      case 39: // right
      case 68: // d
        self.moveRight = true;
        break;

      case 32: // space
        self.emit('jump')
        break;
    }
  }

  var onKeyUp = function ( event ) {
    switch( event.keyCode ) {
      case 38: // up
      case 87: // w
        self.moveForward = false;
        break;

      case 37: // left
      case 65: // a
        self.moveLeft = false;
        break;

      case 40: // down
      case 83: // a
        self.moveBackward = false;
        break;

      case 39: // right
      case 68: // d
        self.moveRight = false;
        break;
    }
  };

  document.addEventListener( 'keydown', onKeyDown, false )
  document.addEventListener( 'keyup', onKeyUp, false )
}
