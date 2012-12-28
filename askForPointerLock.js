// http://www.html5rocks.com/en/tutorials/pointerlock/intro/

function askForPointerLock() {
  var havePointerLock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;

  var element = document.body;

  var pointerlockchange = function ( event ) {

  	if ( document.pointerLockElement === element || document.mozPointerLockElement === element || document.webkitPointerLockElement === element ) {

  		controls.enabled = true;

  	} else {

  		controls.enabled = false;

  	}

  }

  var pointerlockerror = function ( event ) {

    console.error('pointerlockerror', event)

  }

  // Hook pointer lock state change events
  document.addEventListener( 'pointerlockchange', pointerlockchange, false );
  document.addEventListener( 'mozpointerlockchange', pointerlockchange, false );
  document.addEventListener( 'webkitpointerlockchange', pointerlockchange, false );

  document.addEventListener( 'pointerlockerror', pointerlockerror, false );
  document.addEventListener( 'mozpointerlockerror', pointerlockerror, false );
  document.addEventListener( 'webkitpointerlockerror', pointerlockerror, false );


  // Ask the browser to lock the pointer
  element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;

  if ( /Firefox/i.test( navigator.userAgent ) ) {

  	var fullscreenchange = function ( event ) {

  		if ( document.fullscreenElement === element || document.mozFullscreenElement === element || document.mozFullScreenElement === element ) {

  			document.removeEventListener( 'fullscreenchange', fullscreenchange );
  			document.removeEventListener( 'mozfullscreenchange', fullscreenchange );

  			element.requestPointerLock();
  		}

  	}

  	document.addEventListener( 'fullscreenchange', fullscreenchange, false );
  	document.addEventListener( 'mozfullscreenchange', fullscreenchange, false );

  	element.requestFullscreen = element.requestFullscreen || element.mozRequestFullscreen || element.mozRequestFullScreen || element.webkitRequestFullscreen;

  	element.requestFullscreen();

  } else {

  	element.requestPointerLock();

  }
  
}
