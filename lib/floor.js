var Floor = (function() {

  function Floor(game, width, height) {
    var repeatX = width / game.cubeSize
    var repeatY = height / game.cubeSize

    game.textures.bedrock = THREE.ImageUtils.loadTexture(game.texturePath + "bedrock.png")  
    game.textures.bedrock.repeat.set( repeatX, repeatY )
    game.textures.bedrock.wrapS = THREE.RepeatWrapping
    game.textures.bedrock.wrapT = THREE.RepeatWrapping
    
    game.materials.bedrock = new THREE.MeshLambertMaterial({
      map: game.textures.bedrock,
      ambient: 0xbbbbbb
    })
    
    var planeGeo = new THREE.PlaneGeometry(width, height, 1, 1)
    var plane = new THREE.Mesh(planeGeo, game.materials.bedrock)
    plane.position.y = -1
    plane.rotation.x = -Math.PI / 2
    plane.name = 'floor'
    this.game = game
    this.plane = plane
  }

  Floor.prototype.addToScene = function(scene) {
    return this.game.scene.add(this.plane)
  }

  return Floor

})()
;