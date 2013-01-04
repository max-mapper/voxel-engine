/**
 * @author mrdoob / http://mrdoob.com/
 */

module.exports = function ( camera ) {
    var speed = {
        jump: 3,
        move: 0.12,
        fall: 0.3
    };

	var scope = this;
	var pitchObject = this.pitchObject = new THREE.Object3D();
	pitchObject.add( camera );

	var yawObject = this.yawObject = new THREE.Object3D();
	yawObject.position.y = 10;
	yawObject.add( pitchObject );

	var moveForward = false;
	var moveBackward = false;
	var moveLeft = false;
	var moveRight = false;

	var isOnObject = false;
	scope.canJump = false;

	var velocity = new THREE.Vector3();

	var PI_2 = Math.PI / 2;

	var onMouseMove = function ( event ) {

		if ( scope.enabled === false ) return;

		var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
		var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

		yawObject.rotation.y -= movementX * 0.002;
		pitchObject.rotation.x -= movementY * 0.002;

		pitchObject.rotation.x = Math.max( - PI_2, Math.min( PI_2, pitchObject.rotation.x ) );

	};

	var onKeyDown = function ( event ) {

		switch ( event.keyCode ) {

			case 38: // up
			case 87: // w
				moveForward = true;
				break;

			case 37: // left
			case 65: // a
				moveLeft = true; break;

			case 40: // down
			case 83: // s
				moveBackward = true;
				break;

			case 39: // right
			case 68: // d
				moveRight = true;
				break;

			case 32: // space
				if ( scope.canJump === true ) velocity.y += speed.jump;
				scope.canJump = false;
				break;

		}

	};

	var onKeyUp = function ( event ) {

		switch( event.keyCode ) {

			case 38: // up
			case 87: // w
				moveForward = false;
				break;

			case 37: // left
			case 65: // a
				moveLeft = false;
				break;

			case 40: // down
			case 83: // a
				moveBackward = false;
				break;

			case 39: // right
			case 68: // d
				moveRight = false;
				break;

		}

	};

	document.addEventListener( 'mousemove', onMouseMove, false );
	document.addEventListener( 'keydown', onKeyDown, false );
	document.addEventListener( 'keyup', onKeyUp, false );

	this.enabled = false;

	this.isOnObject = function ( boolean ) {

		isOnObject = boolean;
		scope.canJump = boolean;

	};

	this.update = function (delta, cb) {

		if ( scope.enabled === false ) return;

		delta *= 0.1;

		velocity.x += ( - velocity.x ) * 0.08 * delta;
		velocity.z += ( - velocity.z ) * 0.08 * delta;

		if (this.gravityEnabled) velocity.y -= speed.fall * delta;

		if ( moveForward ) velocity.z -= speed.move * delta;
		if ( moveBackward ) velocity.z += speed.move * delta;

		if ( moveLeft ) velocity.x -= speed.move * delta;
		if ( moveRight ) velocity.x += speed.move * delta;

		if ( isOnObject === true ) {

			velocity.y = Math.max( 0, velocity.y );

		}

        if (cb) cb.call(this, yawObject.position, velocity);
        
		yawObject.translateX( velocity.x );
		yawObject.translateY( velocity.y ); 
		yawObject.translateZ( velocity.z );

        if (velocity.y === 0) {
            scope.canJump = true;
        }

	};

};
