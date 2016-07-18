/// Circuit functions.
/// ------------------

function circuitObject (level) {
   // functions, wow!
   this.newSwitch              = circuit_newSwitch;
   this.newGate                = circuit_newGate;
   this.newGateRandom          = circuit_newGateRandom;
   this.ghettoDraw             = circuit_ghettoDraw;
   this.makeSwitchesSequential = circuit_makeSwitchesSequential;
   this.draft                  = circuit_draft;
   this.draw                   = circuit_draw;
   this.scale                  = circuit_scale;
   this.translate              = circuit_translate;
   this.center                 = circuit_center;
   this.updateMouseover        = circuit_updateMouseover;
   this.offscreenX             = circuit_offscreenX;
   this.calculateX             = circuit_calculateX;
   this.getCanvas              = circuit_getCanvas;
   this.redraw                 = circuit_redraw;

   // set some basic data.
   this.level = level;
   this.switchCount = Math.max (2, level + 1);

   // initialize our switches with random values.
   // this will also generate top-level 'switch' gates.
   var same = 0;
   for (var i = 0; i < this.switchCount; i++) {
      this.newSwitch (randomInt (0, 2), randomInt (0, 2),
                      randomInt (0, 2));
      if (this.switches[i].value == this.switches[i].answer)
         same++;
   }

   // if our current state is the same as our victory state, that's boring!
   // reverse all switches.
   if (same == this.switchCount)
      for (var i = 0; i < this.switches.length; i++) {
         this.switches[i].value ^= 1;
         if (this.switches[i].out)
            this.switches[i].out.calculate ();
      }

   // pair off top-level gates into new gates until there's only two left.
   while (this.topGates.length > 2) {
      // pick two unique, arndom gate indexes.
      var r1 = randomInt (0, this.topGates.length);
      var r2 = randomInt (0, this.topGates.length - 1);
      if (r2 >= r1)
         r2++;

      // link [r1, r2] together! */
      var g = this.newGateRandom (r1, r2,
                                  randomInt (0, 2),
                                  randomInt (0, 2));
   }

   // make the final gate with an OFF goal.  we must DISABLE the bomb!
   var inv = randomInt (0, 2);
   this.newGateRandom (0, 1, inv, inv);

   // make sure the switches are in a reasonable order.
   this.makeSwitchesSequential ();

   // come up with a sweet-as-hell design!
   this.draft ();

   // position this circuit.
   this.pos = 1.00;
   this.y = 0.00;
   this.calculateX ();
}

function circuit_newSwitch (value, answer, invert) {
   // make sure we have the arrays we need.
   if (this.switches == null)
      this.switches = new Array ();

   // create a new switch object and add it to our list.
   var sw = new switchObject (value, answer);
   sw.circuit = this;
   sw.index = this.switches.length;
   this.switches.push (sw);

   // create a new gate that's connected to this switch.
   var gate = this.newGate (GATE_SWITCH, [ sw ], answer, invert);

   // return the switch we made.
   return sw;
}

function circuit_newGate (type, inputs, answer, invert) {
   // make sure we have the arrays we need.
   if (this.gates == null)
      this.gates = new Array ();
   if (this.topGates == null)
      this.topGates = new Array ();

   // create a new gate attached to our inputs.
   var gate = new gateObject (type, inputs, answer, invert);
   gate.circuit = this;
   this.gates.push (gate);

   // push to either the front or back of the circuit,
   // so it appears more random.
   if (randomInt (0, 2))
      this.topGates.unshift (gate);
   else
      this.topGates.push (gate);

   // return the gate we just made.
   return gate;
}

function circuit_newGateRandom (input1, input2, answer, invert) {
   var i1obj, i2obj;

   // get the objects we want to splice out.
   i1obj = this.topGates[input1];
   i2obj = this.topGates[input2];

   // ...and splice them out!
   // TODO: this MUST be a more elegant way to do this.
   this.topGates.splice (input1, 1);
   if (input2 > input1)
      input2--;
   this.topGates.splice (input2, 1);

   // if the goals of both inputs are not equal ([0,1] or [1,0]), their
   // inversions should be OPPOSITE so there is guaranteed to be only one
   // solution.
   i2obj.invert = i1obj.invert ^ (i1obj.answer ^ i2obj.answer);

   // don't allow double inversions 50% of the time, so inversions are more
   // rare and "special".
   if (i1obj.invert && i2obj.invert)
      if (randomInt (0, 2))
         i1obj.invert = i2obj.invert = 0;

   // get the potentially inverted answers.
   var a1 = i1obj.answer ^ i1obj.invert;
   var a2 = i2obj.answer ^ i2obj.invert;

   // based on the desired answer and answers of the inputs (maybe inverted),
   // determine the gate that only has one valid solution.
   var type = GATE_NONE;
        if (answer == 0 && a1 == 0 && a2 == 0) type = GATE_OR;
   else if (answer == 0 && a1 == 1 && a2 == 1) type = GATE_NAND;
   else if (answer == 1 && a1 == 0 && a2 == 0) type = GATE_NOR;
   else if (answer == 1 && a1 == 1 && a2 == 1) type = GATE_AND;
   else {
      alert (
      "Invalid gate situation:\n" +
      "   Answer = " + answer + "\n" +
      "   a1 = " + a1 + " (" + i1obj.answer + " ^ " + i1obj.invert + ")\n" +
      "   a2 = " + a2 + " (" + i2obj.answer + " ^ " + i2obj.invert + ")");
   }

   // create a new gate with our data.
   var gate = this.newGate (type, [ i1obj, i2obj ], answer, invert);

   return gate;
}

function circuit_ghettoDraw (context, size, font, x, y) {
   if (typeof x === 'undefined') x = 0;
   if (typeof y === 'undefined') y = 0;
   if (font)
      context.font = size + "px " + font;
   this.topGates[0].ghettoDraw (context, size, x, y);
}

function circuit_makeSwitchesSequential () {
   // indexObj will keep track of our switches as we label them in order.
   var indexObj = { index: 0 };
   circuit_makeSwitchesSequentialGo (this.topGates[0], indexObj);
}

function circuit_makeSwitchesSequentialGo (gate, indexObj) {
   // if we're a switch, make the order sequential,
   // using indexObj to keep track.
   if (gate.type == GATE_SWITCH) {
      // return 0 if the value is the same, 1 if it changed.
      var ret = 0;
      if (gate.inputs[0].index != indexObj.index) {
         gate.inputs[0].index = indexObj.index;
         ret = 1;
      }
      indexObj.index++;
      return ret;
   }

   // modify all other inputs and return their count of modified switches.
   var count = 0;
   for (var i = 0; i < gate.inputs.length; i++)
      count += circuit_makeSwitchesSequentialGo (gate.inputs[i], indexObj);
   return count;
}

function circuit_draw (context, x, y) {
   canvas = this.getCanvas ();
   context.drawImage (canvas, x, y);
}

function circuit_redraw () {
   var tX, tY;

   // get our canvas;
   canvas  = this.getCanvas ();
   context = this.context;
   context.clearRect (0, 0, canvas.width, canvas.height);

   context.fillStyle = "#000";

   // make sure width/height is square.
   var width  = canvas.width,
       height = canvas.height;
   if (width < height) {
      this.transX = 0.50;
      this.transY = height / width / 2;
      height = width;
   }
   else if (height < width) {
      this.transX = width / height / 2;
      this.transY = 0.50;
      width = height;
   }

   // draw in the center of the canvas, scaled appropriately.
   context.scale (width, height);
   context.translate (this.transX, this.transY);

   // draw all of ours lines.
   context.lineWidth = 1.50 / width;
   for (var i = 0; i < this.lines.length; i++)
      this.lines[i].draw (context);

   // draw all of our gates.
   for (var i = 0; i < this.gates.length; i++)
      this.gates[i].draw (context);

   // return context to normal.
   context.translate (-this.transX, -this.transY);
   context.scale (1.00 / width, 1.00 / height);

   // our frame requires a redraw now.
   frameRedraw ();
}

function circuit_draft () {
   // determine the position of all gates.
   this.depth = gateRecursiveDraft (this.topGates[0]);
   var maxWidth = this.topGates[0].width;
   this.center (0.00, 0.00);
   this.scale ((1.00 - 0.50 * (1.00 / this.depth)) / (this.depth + maxWidth));

   // draw lines for all gates to their output.
   for (var i = 0; i < this.gates.length; i++) {
      var gate = this.gates[i];
      if (gate.type == GATE_SWITCH)
         continue;
      for (var j = 0; j < gate.inputs.length; j++) {
         var offset = j - ((gate.inputs.length - 1) / 2);
         gate.inputs[j].createLines (gate, gate.width * 0.50 * offset);
      }
   }

   this.lines.push ({
      x1: this.topGates[0].x,
      y1: this.topGates[0].y - this.topGates[0].width * 0.50,
      x2: this.topGates[0].x,
      y2: -0.50,
      gate: this.topGates[0],
      draw: gateLine_draw,
      seg: 1
   });

   // TODO: add 'arches' when lines cross.
   // TODO: what's the proper term for that?
}

function circuit_scale (scale) {
   for (var i = 0; i < this.gates.length; i++) {
      var gate = this.gates[i];
      gate.width *= scale;
      gate.x     *= scale;
      gate.y     *= scale;
   }
}

function circuit_translate (x, y) {
   for (var i = 0; i < this.gates.length; i++) {
      var gate = this.gates[i];
      gate.x += x;
      gate.y += y;
   }
}

function circuit_center (x, y) {
   var minX, minY, maxX, maxY;
   for (var i = 0; i < this.gates.length; i++) {
      var gate = this.gates[i], w = gate.width * 0.50;
      minX = minInit (minX, gate.x - w);
      minY = minInit (minY, gate.y - w);
      maxX = maxInit (maxX, gate.x + w);
      maxY = maxInit (maxY, gate.y + w);
   }

   // translate so the center is at (x, y).
   this.translate (x - (maxX + minX) / 2,
                   y - (maxY + minY) / 2)
}

function circuit_updateMouseover (x, y) {
   // for our circuit, (0, 0) is the center because reasons.
   x -= this.transX;
   y -= this.transY;

   // make sure our mouseOver variable is at least initialized.
   if (this.mouseOver === undefined)
      this.mouseOver = null;

   // what gate are we under?
   var newGate = null;
   for (var i = 0; i < this.gates.length; i++) {
      var gate = this.gates[i];
      if (gate.type != GATE_SWITCH)
         continue;
      var w = gate.width / 2;
      var x1 = gate.x - w,
          y1 = gate.y - w,
          x2 = gate.x + w,
          y2 = gate.y + w;
      if (x >= x1 && y >= y1 && x <= x2 && y <= y2) {
         newGate = gate;
         break;
      }
   }

   // if we updated, return 'true'.
   if (newGate != this.mouseOver) {
      if (this.mouseOver)
         this.mouseOver.mouseOver = false;
      if (newGate)
         newGate.mouseOver = true;
      this.mouseOver = newGate;
      this.redraw ();
      return true;
   }

   // otherwise, return 'false'.
   return false;
}

function circuit_offscreenX () {
   return screenWidth / 2 + screenHeight / 2;
}

function circuit_calculateX () {
   if (this.pos == 0.00)
      this.x = 0.00;
   else if (this.pos > 0.00)
      this.x =  this.offscreenX () * Math.pow (Math.abs (this.pos), 4.00);
   else
      this.x = -this.offscreenX () * Math.pow (Math.abs (this.pos), 4.00);
}

function circuit_getCanvas () {
   if (this.canvas == null) {
      this.canvas  = document.createElement ('canvas');
      this.canvas.width  = screenWidth;
      this.canvas.height = screenHeight;
      this.context = this.canvas.getContext ('2d');
      this.redraw ();
   }
   else {
      if (this.canvas.width  != screenWidth ||
          this.canvas.height != screenHeight) {
         this.canvas.width  = screenWidth;
         this.canvas.height = screenHeight;
         this.redraw ();
      }
   }
   return this.canvas;
}
