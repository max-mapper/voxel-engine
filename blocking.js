var game = new Game()

document.addEventListener('DOMContentLoaded', function() {
  document.body.addEventListener( 'click', function ( event ) {
    askForPointerLock(game.controls)
  })
})
;