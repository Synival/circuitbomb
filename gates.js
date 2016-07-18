/// Gates used in circuits.
/// -----------------------

var GATE_CIRC = 0.125

function gateObject (type, inputs, answer, invert)
{
   // functions!
   this.calculate   = gate_calculate;
   this.ghettoDraw  = gate_ghettoDraw;
   this.draw        = gate_draw;
   this.createLines = gate_createLines;
   this.lineWidth   = gate_lineWidth;
   this.lineColor   = gate_lineColor;
   this.fillColor   = gate_fillColor;

   // set basic data.
   this.type   = type;
   this.answer = answer;
   this.invert = invert;

   // TODO: remove me!
   this.mouseOver   = false;

   // define inputs, and link their output back to us.
   this.inputs = new Array (inputs.length);
   for (var i = 0; i < inputs.length; i++) {
      this.inputs[i] = inputs[i];
      inputs[i].out = this;
      inputs[i].outSide = i;
   }

   // get the value for our new gate.
   this.calculate ();
}

function gate_calculate ()
{
   var count, newValue;
   newValue = gateResult (this.type, this.inputs);

   // if the value hasn't changed, we don't need to do anything more.
   if (newValue == this.value)
      return 0;

   // set our value and recursively calculate the values for all output gates.
   this.value = newValue;
   count = 1;
   if (this.out)
      count += this.out.calculate ();

   // return the number of gates affected.
   return count;
}

function gate_ghettoDraw (context, fontSize, x, y) {
   context.fillText ((this.invert ? "-" : " "), x, y + fontSize);
   context.fillText (
      gateName (this.type) +
      (this.type == GATE_SWITCH ? (" " + (this.inputs[0].index + 1)) : "") +
      (this.value ? " (On)" : " (Off)"),
      x + fontSize, y + fontSize);

   y += fontSize;

   if (this.type != GATE_SWITCH) {
      for (var i = 0; i < this.inputs.length; i++) {
         var src = this.inputs[i];
         context.fillText ((i + 1) + ")", x + fontSize * 2, y + fontSize);
         y = src.ghettoDraw (context, fontSize, x + (fontSize * 3), y);
      }
   }

   // return the new y position so our recursive function can update it.
   return y;
}

function gateName (type) {
   switch (type) {
      case GATE_NONE:   return "None";
      case GATE_SWITCH: return "Switch";
      case GATE_AND:    return "AND";
      case GATE_OR:     return "OR";
      case GATE_XOR:    return "XOR";
      case GATE_NAND:   return "NAND";
      case GATE_NOR:    return "NOR";
      case GATE_XNOR:   return "XNOR";
      default:          return "Unknown";
   }
}

function gateResult (type, inputs) {
   // get our answers with applied inversions.
   var vals = new Array (inputs.length);
   for (var i = 0; i < vals.length; i++)
      vals[i] = inputs[i].value ^ inputs[i].invert;

   switch (type) {
      case GATE_NONE:   return 0;
      case GATE_SWITCH: return vals[0];
      case GATE_AND:    return (vals[0] & vals[1]);
      case GATE_OR:     return (vals[0] | vals[1]);
      case GATE_XOR:    return (vals[0] ^ vals[1]);
      case GATE_NAND:   return (vals[0] & vals[1]) ^ 1;
      case GATE_NOR:    return (vals[0] | vals[1]) ^ 1;
      case GATE_XNOR:   return (vals[0] ^ vals[1]) ^ 1;
      default:          return 0;
   }
}

function gateValidPosition (gate) {
   // gates with no position are invalid.
   if (gate.x == undefined || gate.y == undefined)
      return false;

   // make sure this position doesn't overlap any other gates.
   for (var i = 0; i < gate.circuit.gates.length; i++) {
      // don't check the same gate...
      var check = gate.circuit.gates[i];
      if (check == gate)
         continue;

      // ...or gates that don't have a position yet.
      if (check.x     == undefined ||
          check.y     == undefined ||
          check.width == undefined)
         continue;

      // get the bounding box distance from the center.
      var max = Math.max (gate.width, check.width);
      var distX = Math.abs (gate.x - check.x) - max;
      var distY = Math.abs (gate.y - check.y) - max;

      // do they overlap?  position isn't valid!
      if (distX <= 0.00 && distY <= 0.00)
         return false;
   }

   // all checks passed!
   return true;
}

function gateRandomPosition (gate, index, max, offset) {
   var range, len;
   range = 1.00 - (gate.width * 2.00);
   len = gate.circuit.gates.length;

   // make sure the offset isn't undefined.
   // TODO: there's a better way to check this, right?
   if (offset === null || offset === undefined)
      offset = 0;
   if (gate.out == null) {
      gate.x = 0.00;
      gate.y = 0.00;
   }
   else {
      var mult = ((2 * gate.outSide / (gate.out.inputs.length - 1)) - 1.00)
               * ((Math.random() * 0.50) + 0.50);
      gate.x = gate.out.x + mult;
      gate.y = gate.out.y + Math.random() * 0.50 + 0.50;
   }
}

function gateSetDepth (gate, depth) {
   gate.depth = depth;
   if (gate.type == GATE_SWITCH)
      return depth;
   var max = depth;
   for (var i = 0; i < gate.inputs.length; i++)
      max = Math.max (max, gateSetDepth (gate.inputs[i], depth + 1));
   return max;
}

function gateRecursiveDraft (gate, index, max) {
   var retMax = false;

   // make sure 'index' has a value.
   if (index === null || index === undefined)
      index = 0;

   if (max === null || max === undefined) {
      retMax = true;
      max = gateSetDepth (gate, 0);
   }

   // set some basic parameters.
   gate.width = 0.20; // * Math.pow (max, 0.25);

   // make sure this gate has a position.
   while (!gateValidPosition (gate))
      gateRandomPosition (gate, index, max);

   // recursively place this gate's inputs.
   if (gate.type != GATE_SWITCH)
      for (var i = 0; i < gate.inputs.length; i++)
         index = gateRecursiveDraft (gate.inputs[i], index + 1, max);

   // return our last index.
   if (retMax)
      return max;
   else
      return index;
}

function gateValueColor (value, mouseOver)
{
   if (mouseOver) {
      if (value) return "#8f8";
      else       return "#f44";
   }
   else {
      if (value) return "#4f4";
      else       return "#f00";
   }
}

function gateLine_draw (context) {
   var old = context.strokeStyle, value;

   value = this.gate.value;
   context.beginPath ();
   context.moveTo (this.x1, this.y1);

   if (this.gate.invert && this.seg == 1) {
      var cx = (this.x1 + this.x2) / 2,
          cy = (this.y1 + this.y2) / 2;

      context.strokeStyle = gateValueColor (value);
      context.lineTo (cx, cy);
      context.stroke ();
      context.beginPath ();
      value ^= 1;
      context.strokeStyle = gateValueColor (value);
      context.moveTo (cx, cy);
      context.lineTo (this.x2, this.y2);
      context.stroke ();

      // draw our inversion gate.
      var oldWidth = context.lineWidth,
          w = this.gate.width * 0.33, h = w * Math.pow (3.00, 0.50) / 2.00, r,
          width  = Math.abs (this.x2 - this.x1),
          height = Math.abs (this.y2 - this.y1);
          oldFill = context.fillStyle;

      if (width > height) {
         if (this.x2 > this.x1)
            r =  90 * Math.PI / 180;
         else
            r = -90 * Math.PI / 180;
      }

      // set up our inversion triangle.
      context.lineWidth = this.gate.lineWidth ();
      context.fillStyle = "#ccf";
      context.translate (cx, cy);
      context.rotate (r);
      context.strokeStyle = "#000";

      // clear the area.
      context.clearRect (-w, -h, w * 2, h * 2);

      // go!
      context.beginPath ();
      context.moveTo ( 0, -h);
      context.lineTo ( w,  h);
      context.lineTo (-w,  h);
      context.lineTo ( 0, -h);
      context.fill ();
      context.stroke ();

      // draw a l'il circle.
      gateDrawCircle (context, 0, -h - this.gate.width * GATE_CIRC,
                      this.gate.width);

      // un-set up!
      context.rotate (-r);
      context.translate (-cx, -cy);
      context.lineWidth = oldWidth;
      context.fillStyle = oldFill;
   }
   else {
      if (this.gate.invert && this.seg == 2)
         value ^= 1;
      context.strokeStyle = gateValueColor (value);
      context.lineTo (this.x2, this.y2);
      context.stroke ();
   }
   context.strokeStyle = old;
}

function gate_lineWidth () {
   return this.width * 0.05;
}

function gate_draw (context) {
   var oldWidth  = context.lineWidth;
   var oldFill   = context.fillStyle;
   var oldStroke = context.strokeStyle;

   context.lineWidth = this.lineWidth ();
   context.clearRect (this.x - (this.width / 2), this.y - (this.width / 2),
                      this.width, this.width);
   context.beginPath ();
   context.strokeStyle = this.lineColor ();

   var w = this.width;
   var invertOff = 0.00;

   context.fillStyle = this.fillColor ();
   switch (this.type) {
      case GATE_SWITCH:
         context.arc (this.x, this.y, this.width / 2, 0.00, Math.PI * 2);
         context.fill ();
         context.stroke ();

         context.lineWidth *= 2;
         if (this.value) {
            context.beginPath ();
            context.moveTo (this.x, this.y + this.width / 3);
            context.lineTo (this.x, this.y - this.width / 3);
            context.stroke ();
         }
         else {
            context.beginPath ();
            context.arc (this.x, this.y, this.width / 4, 0.00, Math.PI * 2);
            context.stroke ();
         }
         context.lineWidth /= 2;
         break;

      case GATE_OR:
      case GATE_NOR:
         var a = 0.333, pi = Math.PI;
         context.arc (this.x + w/2, this.y + w*0.30, w, pi * 1, pi * (1 + a));
         context.arc (this.x - w/2, this.y + w*0.30, w, pi * (2 - a), pi * 2);
         context.lineTo (this.x + w * 0.5, this.y + w * 0.57);
         context.lineTo (this.x - w * 0.5, this.y + w * 0.57);
         context.fill ();
         context.stroke ();

         a = 0.26;
         for (var j = 0; j < 2; j++) {
            if (j == 0)
               context.globalCompositeOperation = "destination-out";
            context.beginPath ();
            context.arc (this.x, this.y + w * 1.18, w * 0.725,
                         pi * (1 + a), pi * (2 - a));
            context.moveTo (this.x + w *-0.5, this.y + w * 0.67);
            context.lineTo (this.x + w *-0.5, this.y + w * 0.30);
            if (j == 0)
               context.fill ();
            context.stroke ();
            if (j == 0)
               context.globalCompositeOperation = "source-over";
         }
         invertOff = 0.05;
         break;

      case GATE_AND:
      case GATE_NAND:
         context.arc (this.x, this.y, w * 0.50, Math.PI, Math.PI * 2);
         context.lineTo (this.x + w * 0.5, this.y + w * 0.5);
         context.lineTo (this.x + w *-0.5, this.y + w * 0.5);
         context.lineTo (this.x + w *-0.5, this.y);
         context.fill ();
         context.stroke ();
         break;
   }
   if (this.type == GATE_NAND ||
       this.type == GATE_NOR  ||
       this.type == GATE_XNOR) {
      gateDrawCircle (context,
         this.x,
         this.y - w * ((0.52 + GATE_CIRC) + invertOff),
         this.width);
   }
   context.strokeStyle = oldStroke;
   context.lineWidth   = oldWidth;
   context.fillStyle   = oldFill;
}

function gateDrawCircle (context, x, y, w) {
   context.clearRect (
      x - w * GATE_CIRC,
      y - w * GATE_CIRC,
      w * GATE_CIRC * 2,
      w * GATE_CIRC * 2);
   context.beginPath ();
   context.arc (
      x,
      y,
      w * GATE_CIRC,
      0,
      Math.PI * 2);
   context.fill ();
   context.stroke ();
}

function gate_createLines (gate2, offset) {
   var gate1 = this;

   // get distances between the two gates.
   var w = gate2.x - gate1.x;
   var h = gate2.y - gate1.y;

   // determine a direction and a mid-point.
   var dir = randomInt (0, 2);
   dir = 0;
   var midOff = this.width / (dir ? w : h) * -1.00;
   var mid = Math.random() * (0.75 - midOff * 2) + midOff;

   // based on direction, determine (x, y) positions for four points.
   if (dir) {
      var wX   = this.width / w * -0.50,
          offH = offset / h;
      x = [ wX,   mid,  mid,         1.00 - wX   ];
      y = [ 0.00, 0.00, 1.00 + offH, 1.00 + offH ];
   }
   else {
      var wY   = this.width / h * -0.50,
          offW = offset / w;
      x = [ 0.00, 0.00, 1.00 + offW, 1.00 + offW ];
      y = [ wY,   mid,  mid,         1.00 - wY   ];
   }

   // make sure we have our array.
   if (!this.circuit.lines)
      this.circuit.lines = new Array ();

   // add three lines!
   this.circuit.lines.push ({
      x1: gate1.x + x[0] * w, y1: gate1.y + y[0] * h,
      x2: gate1.x + x[1] * w, y2: gate1.y + y[1] * h,
      gate: this,
      draw: gateLine_draw,
      seg: 0 });
   this.circuit.lines.push ({
      x1: gate1.x + x[1] * w, y1: gate1.y + y[1] * h,
      x2: gate1.x + x[2] * w, y2: gate1.y + y[2] * h,
      gate: this,
      draw: gateLine_draw,
      seg: 1 });
   this.circuit.lines.push ({
      x1: gate1.x + x[2] * w, y1: gate1.y + y[2] * h,
      x2: gate1.x + x[3] * w, y2: gate1.y + y[3] * h,
      gate: this,
      draw: gateLine_draw,
      seg: 2 });
}

function gate_lineColor () {
   if (this.mouseOver) return "#444";
   else                return "#000";
}

function gate_fillColor () {
   if (this.type == GATE_SWITCH)
      return gateValueColor (this.value, this.mouseOver);
   else if (this.mouseOver) return "#fff";
   else                     return "#ccf";
}
