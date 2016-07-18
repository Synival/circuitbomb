/// Canvas-resizing routines.
/// -------------------------

function resizeUpdate () {
   if (transX != null && transY != null)
      divGameContext.translate (-transX, -transY);

   screenWidth  = divGameCanvas.offsetWidth;
   screenHeight = divGameCanvas.offsetHeight;
   divGameCanvas.width  = screenWidth;
   divGameCanvas.height = screenHeight;

/*
   // determine translation coordinates.
   if (screenWidth >= screenHeight) {
      transX = screenWidth  / 2;
      transY = screenHeight / 2;
   }
   else {
      transX = screenWidth  / 2;
      transY = screenHeight / 2;
   }

   divGameContext.translate (transX, transY);
*/

   // perform a redraw.
   frameRedraw ();
   frameDraw ();
}
