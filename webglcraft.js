var config = {
  cubeSize: 50,
  blocks: ["cobblestone", "plank", "brick", "diamond", "glowstone", "obsidian", "whitewool", "bluewool", "redwool", "netherrack"],
  texturePath: './textures/'
}

var game = new Game()

document.addEventListener('DOMContentLoaded', function(){
  document.body.addEventListener( 'click', function ( event ) {
    askForPointerLock(game.controls)
	})    
})

