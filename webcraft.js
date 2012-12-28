
var container;
var camera, scene, renderer, time;
var projector, plane;
var mouse2D, mouse3D, raycaster, theta = 45,
target = new THREE.Vector3( 0, 200, 0 );
var ROLLOVERED;
var cubeSize = 50
var textures = {}
var materials = {}
var textureBasePath = './textures/'

function addFloor(width, height, scene) {
  var material, floorPlane, planeGeo, repeatX, repeatY;
  repeatX = width / cubeSize;
  repeatY = height / cubeSize;
  planeGeo = new THREE.PlaneGeometry(width, height, 1, 1);
  floorPlane = new THREE.Mesh(planeGeo, materials.bedrock);
  floorPlane.rotation.x = -Math.PI / 2;
  floorPlane.name = 'floor';
  scene.add(floorPlane);
  return floorPlane
}


init();
animate();

function init() {

	container = document.createElement( 'div' );
	document.body.appendChild( container );
	
	camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 10000 );
  camera.lookAt(new THREE.Vector3(0, 0, 0));
	scene = new THREE.Scene();
  addFloor(50000, 50000, scene)
	
	controls = new THREE.PointerLockControls( camera );
	scene.add( controls.getObject() );
  
  ray = new THREE.Raycaster();
  ray.ray.direction.set( 0, -1, 0 );
  

	projector = new THREE.Projector();


	mouse2D = new THREE.Vector3( 0, 10000, 0.5 );

	// Lights
    // 
  var ambientLight = new THREE.AmbientLight( 0x606060 );
  scene.add( ambientLight );

  var directionalLight = new THREE.DirectionalLight( 0xffffff );
  directionalLight.position.x = Math.random() - 0.5;
  directionalLight.position.y = Math.random() - 0.5;
  directionalLight.position.z = Math.random() - 0.5;
  directionalLight.position.normalize();
  scene.add( directionalLight );
  
  var directionalLight = new THREE.DirectionalLight( 0x808080 );
  directionalLight.position.x = Math.random() - 0.5;
  directionalLight.position.y = Math.random() - 0.5;
  directionalLight.position.z = Math.random() - 0.5;
  directionalLight.position.normalize();
  scene.add( directionalLight );

	renderer = new THREE.CanvasRenderer();
	renderer.setSize( window.innerWidth, window.innerHeight );
  textures.grassDirt = THREE.ImageUtils.loadTexture(textureBasePath + "grass_dirt.png")  
  materials.grassDirt = new THREE.MeshBasicMaterial({map: textures.grassDirt})

  textures.crate = THREE.ImageUtils.loadTexture(textureBasePath + "crate.gif")  
  textures.crate.anisotropy = renderer.getMaxAnisotropy()
  materials.crate = new THREE.MeshBasicMaterial({map: textures.crate})

  textures.bedrock = THREE.ImageUtils.loadTexture(textureBasePath + "bedrock.png")  
  materials.bedrock = new THREE.MeshBasicMaterial({map: textures.bedrock})


	container.appendChild(renderer.domElement);

  document.addEventListener( 'mousemove', onDocumentMouseMove, false );
  document.addEventListener( 'mousedown', onDocumentMouseDown, false );
  // document.addEventListener( 'keydown', onDocumentKeyDown, false );
  // document.addEventListener( 'keyup', onDocumentKeyUp, false );

	//

	window.addEventListener( 'resize', onWindowResize, false );

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

}

function onDocumentMouseMove( event ) {

 event.preventDefault();

 mouse2D.x = ( event.clientX / window.innerWidth ) * 2 - 1;
 mouse2D.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

 var intersects = raycaster.intersectObjects( scene.children );

 if ( intersects.length > 0 ) {

   if ( ROLLOVERED ) ROLLOVERED.color.setHex( 0x00ff80 );
   intersects[ 0 ].object.material = materials.crate
 }

}

function onDocumentMouseDown( event ) {

	event.preventDefault();

	var intersects = raycaster.intersectObjects( scene.children );

	if ( intersects.length > 0 ) {

		var position = new THREE.Vector3().add( intersects[ 0 ].point, intersects[ 0 ].object.matrixRotationWorld.multiplyVector3( intersects[ 0 ].face.normal.clone() ) );

		var geometry = new THREE.CubeGeometry( cubeSize, cubeSize, cubeSize );
		

    for ( var i = 0; i < geometry.faces.length; i ++ ) {
      geometry.faces[ i ].color.setHex( 0x00ff80 );
    }
    
		var voxel = new THREE.Mesh( geometry, materials.grassDirt );
		voxel.position.x = Math.floor( position.x / cubeSize ) * cubeSize + (cubeSize / 2);
		voxel.position.y = Math.floor( position.y / cubeSize ) * cubeSize + (cubeSize / 2);
		voxel.position.z = Math.floor( position.z / cubeSize ) * cubeSize + (cubeSize / 2);
		voxel.matrixAutoUpdate = false;
		voxel.updateMatrix();
		scene.add( voxel );

	}
}

function animate() {
	requestAnimationFrame( animate );
	render();
}

function render() {
  raycaster = projector.pickingRay( mouse2D.clone(), camera );
	controls.update( Date.now() - time );
	renderer.render( scene, camera );
	time = Date.now();
}

document.addEventListener('DOMContentLoaded', function(){
  document.body.addEventListener( 'click', function ( event ) {
    askForPointerLock()
	})    
})
