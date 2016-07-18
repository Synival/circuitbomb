***************************************************************************
* A BOMB IS ABOUT TO GO OFF!                                              *
* Disable the bomb's circuitry before you're exploded into exploedy bits! *
***************************************************************************

How to play Circuit Bomb:
=========================

- Each level has a set of switches hooked into a circuit with various logic
  gates.  The object is to flip the switches correctly to disable the circuit.

- If the countdown reaches zero before the circuit is disabled, a bomb will
  explode, unceremoniously ending the game as well as your career on the bomb
  squad.

- Flip switches with their corresponding keyboard key.

- Update the circuit by pressing 'Space' or 'Enter'.

- Be careful - a bad guess will cost you 5 seconds!

- A correct circuit will disable the bomb, advance you to the next level,
  and add an extra minute to the bomb timer.

- Each level will an an extra switch to the circuit.

How to read the circuits:
=========================

Each logic gate (AND, OR, NAND, NOR) will display its current state along with
two inputs, like so:

AND [On]
   1) Switch 1 [On]
   2) Switch 2 [On]

This is an AND gate that is currently outputting an "On" signal.  Its two
inputs are Switch 1 and Switch 2, which are both on.

Signals into gates can be inverted.  This is indicated with a red '!' beside
the input number, like so:

AND [On]
  !1) Switch 1 [Off]
  !2) Switch 2 [Off]

The switches are off, but their signal outputs are being inverted, resulting
in two "On" inputs into the AND gate.  The gate is then, therefore, outputting
an "On" signal.

Gates can also output their signals into other gates.  In the following
example, the output values of an OR and a NOR gate are inputs for an AND gate.
Take note of the inverted signals.

AND [Off]
  !1) OR [On]
      1) Switch 1 [Off]
      2) Switch 2 [On]
   2) NOR [Off]
     !1) Switch 3 [Off]
     !2) Switch 4 [Off]

To turn the AND gate "On", the following setup is required:

AND [On]
  !1) OR [Off]
      1) Switch 1 [Off]
      2) Switch 2 [Off]
   2) NOR [On]
     !1) Switch 3 [On]
     !2) Switch 4 [On]

That's it!
Use your head to solve the more complicated circuits, and good luck!

-- Simon Bielman (@Synival)

