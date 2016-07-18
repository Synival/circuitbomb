/// The main game loop.
/// -------------------

var circuitPos = 1.00;

function mainInit () {
   // set up our events.
   eventInit ();

   // update our canvas's resolution.
   window.addEventListener ("resize", resizeUpdate);
   resizeUpdate ();

   // create our stuff.
   mainNewGame ();

   // perform some final initialization.
   gameInitialized = true;
   frameUpdated    = true;

   // start this sucker!
   frameInterval ();
   setInterval (frameInterval, 1000 / GAME_FPS);
}

function mainNewGame () {
   gameOver = false;
   currentCircuit = new circuitObject (1);
   currentTimer   = new timerObject (60.00);
   frameRedraw ();
}

window.onload = mainInit ();
