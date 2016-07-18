/// Canvas-resizing routines.
/// -------------------------

function resizeUpdate () {
   if (transX != null && transY != null)
      divGameContext.translate (-transX, -transY);

   screenWidth  = divGameCanvas.offsetWidth;
   screenHeight = divGameCanvas.offsetHeight;
   divGameCanvas.width  = screenWidth;
   divGameCanvas.height = screenHeight;

   frameRedraw ();
   frameDraw ();
}
