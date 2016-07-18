/// Frames!  Lots of frames!
/// ------------------------

function frameDraw () {
   if (!frameUpdated || !gameInitialized)
      return;
   frameUpdated = true;
   divGameContext.clearRect (-transX, -transY,
                             divGameCanvas.width, divGameCanvas.height);
   currentCircuit.draw (divGameContext,
      currentCircuit.x, currentCircuit.y, screenWidth, screenHeight);

   // set up our text for drawing.
   var size = Math.round (screenWidth / 20);
   divGameContext.font = size + "px EightBit";
   divGameContext.fillStyle = "#fff";

   // draw our level and our timer.
   divGameContext.fillText ("Level " + currentCircuit.level,
                            size * 0.5, size * 1.0);
   divGameContext.fillText ("Bomb Timer:", size * 0.5, size * 2.0);
   currentTimer.draw (divGameContext, size * 1.0, size * 2.75);

   // gameover?
   if (gameOver) {
      divGameContext.fillStyle = "rgba(0, 0, 0, 0.5)";
      divGameContext.fillRect (0, 0, screenWidth, screenHeight);
      divGameContext.fillStyle = "#fff";
      size *= 2;
      divGameContext.font = size + "px EightBit";
      divGameContext.fillText ("KABOOM!\n",
         screenWidth * 0.35, screenHeight * 0.45);
      divGameContext.fillText ("Game Over!\n",
         screenWidth * 0.30, screenHeight * 0.45 + size * 0.75);
   }
}

function frameInterval () {
   var circ = currentCircuit;
   if (!gameInitialized)
      return;
   if (!gameOver) {
      if (circ.pos > 0.00) {
         circ.pos = Math.max (0.00, circ.pos - (0.75 / GAME_FPS));
         circ.calculateX ();
         frameUpdated = true;
      }
      else if (circ.victory) {
         circ.pos -= (0.75 / GAME_FPS);
         if (circ.pos <= -1.00)
            currentCircuit = new circuitObject (circ.level + 1);
         else
            circ.calculateX ();
         frameUpdated = true;
      }
   }
   frameDraw ();
}

function frameRedraw () {
   frameUpdated = true;
}
