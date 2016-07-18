/// Events, like, mouse and keyboard.
/// ---------------------------------

function eventInit () {
   divGameCanvas.addEventListener ("mousedown", eventMouseDown);
   divGameCanvas.addEventListener ("mousemove", eventMouseMove);
}

function eventMouseDown (e) {
   if (gameOver) {
      mainNewGame ();
      return;
   }

   var circ = currentCircuit;
   var gate = circ.mouseOver;

   if (circ.victory)
      return;
   if (gate == null)
      return;
   if (gate.type != GATE_SWITCH)
      return;
   gate.inputs[0].value ^= 1;
   gate.calculate ();

   if (circ.topGates[0].value ^ circ.topGates[0].invert == 0) {
      timer_addTime (currentTimer, circ.level + 10.00);
      circ.victory = true;
      if (circ.mouseOver) {
         circ.mouseOver.mouseOver = false;
         circ.mouseOver = null;
      }
   }

   circ.redraw ();
}

function eventMouseMove (e) {
   if (gameOver)
      return;
   var circ = currentCircuit;
   if (circ.x != 0 || circ.victory)
      return;

   var rect  = divGameCanvas.getBoundingClientRect ();
   var width = (screenWidth > screenHeight) ?
               (rect.bottom - rect.top) :
               (rect.right  - rect.left);
   var x = (e.clientX - transX - circ.x - rect.left) / width;
   var y = (e.clientY - transY - circ.y - rect.top)  / width;

   circ.updateMouseover (x, y);
}
