/// Timebomb, oh no!
/// ----------------

function timerObject (time) {
   // functions!
   this.draw  = timer_draw;
   this.frame = timer_frame;
   this.fps   = 12;

   // initialization.
   this.time = time;
   var thisRef = this;
   setInterval (function () { thisRef.frame (); }, 1000 / this.fps);
}

function timer_draw (context, x, y) {
   var timeMain = Math.floor (this.time);
   var timePart = this.time - timeMain;

   var minutes = Math.floor (timeMain / 60);
   var seconds = timeMain % 60;
   var subsecs = Math.floor (timePart * 100);

   var minStr = (minutes <= 99) ? ("0"  + minutes).slice (-1) : minutes;
   var secStr = (seconds <= 99) ? ("00" + seconds).slice (-2) : seconds;
   var subStr = (subsecs <= 99) ? ("00" + subsecs).slice (-2) : subsecs;

   context.fillText (minStr + ":" + secStr + "." + subStr, x, y);
}

function timer_frame () {
   if (currentCircuit.x != 0)
      return;
   if (this.time <= 0.00 || gameOver)
      return;
   this.time = Math.max (0.00, this.time - 1 / this.fps);
   if (this.time == 0.00) {
      gameOver = true;
      setTimeout (
         function () {
         if (gameOver)
            eventMouseDown ()
         }, 5000);
   }
   frameRedraw ();
}

function timer_addTime (timer, amount)
{
   timer.time += amount;
}
